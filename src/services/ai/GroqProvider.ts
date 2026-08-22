import {
  LifeSession,
  LoviraAgentResponse,
  AgentAction,
  UserProfile,
  InteractionInputMode,
  AppInteractionContext,
  AppAction,
} from '../../types';
import { buildSessionContextPrompt } from './SessionContextBuilder';

export interface GroqRequestOptions {
  message: string;
  session?: LifeSession | null;
  userProfile?: UserProfile | null;
  modelOverride?: string;
  inputMode?: InteractionInputMode;
  appContext?: AppInteractionContext;
}

export async function callGroqAgent(
  options: GroqRequestOptions,
  apiKey: string
): Promise<LoviraAgentResponse | null> {
  const { message, session, userProfile, modelOverride, inputMode, appContext } = options;
  const model = modelOverride || 'openai/gpt-oss-20b';
  const startTime = Date.now();

  const baseContextPrompt = buildSessionContextPrompt({
    session,
    userProfile,
    inputMode,
    appContext,
  });

  const jsonInstruction = `
---
ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Bạn PHẢI trả về duy nhất một đối tượng JSON hợp lệ (không kèm theo văn bản giải thích ngoài JSON) theo đúng cấu trúc sau:
{
  "reply": "Câu trả lời thân thiện, ấm áp bằng tiếng Việt (không dùng dấu sao markdown **)",
  "speech": "Lời đọc to ngắn gọn, tự nhiên",
  "suggestedReplies": ["Gợi ý nhanh 1", "Gợi ý nhanh 2"],
  "actions": [
    {
      "type": "ADD_TASK | UPDATE_TASK | COMPLETE_TASK | SKIP_TASK | DELETE_TASK | REORDER_TASK | ADD_SUBTASK | COMPLETE_SUBTASK | ADD_FACT | UPDATE_FACT | DELETE_FACT | UPDATE_NEXT_ACTION | CHANGE_GOAL | PAUSE_SESSION | RESUME_SESSION | COMPLETE_SESSION | OPEN_CAMERA",
      "payload": { ... }
    }
  ],
  "appActions": [
    {
      "type": "GO_HOME | GO_BACK | OPEN_SESSION | CREATE_SESSION | OPEN_SETTINGS | OPEN_PROFILE | OPEN_CAMERA | UPDATE_ACCESSIBILITY_SETTING",
      "payload": { ... }
    }
  ],
  "pendingInteraction": {
    "type": "create_session",
    "data": { "goal": "..." }
  }
}
Lưu ý:
- Nếu không có actions, hãy để "actions": []
- Nếu không có appActions, hãy để "appActions": []
- Nếu đề xuất tạo phiên làm việc mới, hãy điền "pendingInteraction" tương ứng.
`;

  const systemPrompt = `${baseContextPrompt}\n${jsonInstruction}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Groq API error (${res.status}):`, errText);
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const duration = Date.now() - startTime;
    const choice = data.choices?.[0];
    const rawContent = choice?.message?.content || '';

    let reply = '';
    let speech: string | undefined = undefined;
    let actions: AgentAction[] = [];
    let appActions: AppAction[] = [];
    let pendingInteraction: any = undefined;
    let suggestedReplies: string[] | undefined = undefined;

    // Parse structured JSON response
    try {
      // Clean possible markdown code blocks if model wrapped it
      let cleanJson = rawContent.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanJson);
      reply = parsed.reply || '';
      speech = parsed.speech;
      if (Array.isArray(parsed.actions)) actions = parsed.actions;
      if (Array.isArray(parsed.appActions)) appActions = parsed.appActions;
      if (Array.isArray(parsed.suggestedReplies)) suggestedReplies = parsed.suggestedReplies;
      if (parsed.pendingInteraction) {
        pendingInteraction = {
          ...parsed.pendingInteraction,
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + 180000,
        };
      }
    } catch (parseErr) {
      console.warn('Could not parse JSON from Groq output, falling back to raw text:', parseErr);
      reply = rawContent.replace(/\*\*/g, '').trim();
    }

    const cleanReply = reply ? reply.replace(/\*\*/g, '').trim() : 'Lovira đã ghi nhận.';

    return {
      reply: cleanReply,
      speech: (speech || cleanReply).replace(/[*#]/g, '').trim(),
      actions,
      appActions: appActions.length > 0 ? appActions : undefined,
      pendingInteraction,
      suggestedReplies,
      meta: {
        engine: 'groq',
        model,
        processingTime: duration,
      },
    };
  } catch (err: any) {
    console.error('Groq Agent call failed:', err);
    throw err;
  }
}
