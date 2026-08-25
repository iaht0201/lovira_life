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

// Enum cho toàn bộ các mô hình Groq chính thức được hỗ trợ
export enum GroqModel {
  LLAMA_3_1_8B = 'llama-3.1-8b-instant',
  LLAMA_3_3_70B = 'llama-3.3-70b-versatile',
  MIXTRAL_8X7B = 'mixtral-8x7b-32768',
  GEMMA2_9B = 'gemma2-9b-it',
  DEEPSEEK_70B = 'deepseek-r1-distill-llama-70b',
  // Backward compatibility legacy aliases
  GPT_OSS_20B = 'llama-3.1-8b-instant',
  QWEN_3_6_27B = 'llama-3.3-70b-versatile',
  COMPOUND = 'llama-3.3-70b-versatile',
  COMPOUND_MINI = 'llama-3.1-8b-instant',
  GPT_OSS_120B = 'llama-3.3-70b-versatile',
}

// Thứ tự xoay tua ưu tiên khi một mô hình gặp lỗi 429 / Rate Limit / 404 / 413
export const GROQ_ROTATION_PRIORITY: GroqModel[] = [
  GroqModel.LLAMA_3_1_8B,
  GroqModel.LLAMA_3_3_70B,
  GroqModel.MIXTRAL_8X7B,
  GroqModel.GEMMA2_9B,
];

export const ALLOWED_GROQ_MODELS = Object.values(GroqModel);

export function normalizeGroqModel(modelInput?: string): GroqModel {
  if (!modelInput) return GroqModel.LLAMA_3_1_8B;
  
  if (Object.values(GroqModel).includes(modelInput as GroqModel)) {
    // If it's a legacy string like 'openai/gpt-oss-20b' or 'groq/compound', map it
    if (modelInput === 'openai/gpt-oss-20b' || modelInput === 'groq/compound-mini') {
      return GroqModel.LLAMA_3_1_8B;
    }
    if (modelInput === 'qwen/qwen3.6-27b' || modelInput === 'groq/compound' || modelInput === 'openai/gpt-oss-120b') {
      return GroqModel.LLAMA_3_3_70B;
    }
    return modelInput as GroqModel;
  }

  const lower = modelInput.toLowerCase();
  if (lower.includes('70b') || lower.includes('compound') || lower.includes('qwen') || lower.includes('120b')) {
    return GroqModel.LLAMA_3_3_70B;
  }
  if (lower.includes('mixtral')) return GroqModel.MIXTRAL_8X7B;
  if (lower.includes('gemma')) return GroqModel.GEMMA2_9B;

  return GroqModel.LLAMA_3_1_8B;
}

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
  const startTime = Date.now();

  // Xác định mô hình mong muốn ban đầu và chuẩn hóa sang mô hình Groq chính thức
  const preferredModel = normalizeGroqModel(modelOverride);

  // Tạo danh sách các mô hình thử nghiệm xoay tua (Đảm bảo thử preferredModel trước, sau đó xoay tua)
  const modelsToTry = Array.from(new Set([preferredModel, ...GROQ_ROTATION_PRIORITY]));

  const baseContextPrompt = buildSessionContextPrompt({
    session,
    userProfile,
    inputMode,
    appContext,
    message,
  });

  const jsonInstruction = `
---
ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (100% TIẾNG VIỆT):
- TẤT CẢ VĂN BẢN (reply, speech, tiêu đề nhiệm vụ, mô tả nhiệm vụ, tên tài nguyên, gợi ý nhanh suggestedReplies) BẮT BUỘC 100% BẰNG TIẾNG VIỆT (VIETNAMESE). TUYỆT ĐỐI KHÔNG DÙNG TIẾNG ANH.
- Bạn PHẢI trả về duy nhất một đối tượng JSON hợp lệ (không kèm theo văn bản giải thích ngoài JSON) theo đúng cấu trúc sau:
{
  "reply": "Câu trả lời thân thiện, ấm áp bằng tiếng Việt (sử dụng gạch đầu dòng • và **in đậm** cho tiêu đề các mục gợi ý rõ ràng)",
  "speech": "Lời đọc to ngắn gọn, tự nhiên bằng tiếng Việt, không chứa ký tự kỹ thuật",
  "suggestedReplies": ["Gợi ý nhanh bằng tiếng Việt 1", "Gợi ý nhanh bằng tiếng Việt 2"],
  "actions": [
    {
      "type": "ADD_TASK | UPDATE_TASK | COMPLETE_TASK | SKIP_TASK | DELETE_TASK | REORDER_TASK | ADD_SUBTASK | COMPLETE_SUBTASK | ADD_FACT | UPDATE_FACT | DELETE_FACT | UPDATE_NEXT_ACTION | CHANGE_GOAL | PAUSE_SESSION | RESUME_SESSION | COMPLETE_SESSION | OPEN_CAMERA",
      "payload": { ... }
    }
  ],
  "appActions": [
    {
      "type": "GO_HOME | GO_BACK | OPEN_SESSION | CREATE_SESSION | OPEN_SETTINGS | OPEN_PROFILE | OPEN_CAMERA | UPDATE_ACCESSIBILITY_SETTING | OPEN_REMINDERS | CREATE_REMINDER | UPDATE_REMINDER | DELETE_REMINDER | SNOOZE_REMINDER | COMPLETE_REMINDER | PIN_SESSION | ARCHIVE_SESSION",
      "payload": { ... }
    }
  ],
  "pendingInteraction": {
    "type": "create_session",
    "data": { "goal": "Mục tiêu bằng tiếng Việt..." }
  }
}
Lưu ý:
- Nếu không có actions, hãy để "actions": []
- Nếu không có appActions, hãy để "appActions": []
- Nếu đề xuất tạo phiên làm việc mới, hãy điền "pendingInteraction" tương ứng bằng tiếng Việt.
`;

  const systemPrompt = `${baseContextPrompt}\n${jsonInstruction}`;

  let lastError: Error | null = null;

  // Xoay tua mô hình nếu gặp lỗi Rate Limit (429), Model Not Found (404), JSON Validation (400), Entity Too Large (413)...
  for (const currentModel of modelsToTry) {
    try {
      console.log(`[GroqProvider] Attempting call with model: ${currentModel}`);
      
      const payload: any = {
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      };

      let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      // Nếu gặp lỗi 400 (json_validate_failed), thử lại không dùng response_format
      if (!res.ok && res.status === 400) {
        const errText = await res.text();
        if (errText.includes('json_validate_failed') || errText.includes('JSON')) {
          console.warn(`[GroqProvider] Model '${currentModel}' failed JSON validation mode. Retrying without response_format...`);
          delete payload.response_format;
          res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
        } else {
          console.warn(`[GroqProvider] Model '${currentModel}' failed (400): ${errText}. Rotating to next model...`);
          lastError = new Error(`Groq API error (400): ${errText}`);
          continue;
        }
      }

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[GroqProvider] Model '${currentModel}' failed (${res.status}): ${errText}. Rotating to next model...`);
        lastError = new Error(`Groq API error (${res.status}): ${errText}`);
        continue; // Luân chuyển sang mô hình tiếp theo trong Enum
      }

      const data = await res.json();
      const duration = Date.now() - startTime;
      const choice = data.choices?.[0];
      const rawContent = choice?.message?.content || '';

      if (!rawContent) {
        console.warn(`[GroqProvider] Empty response from model '${currentModel}'. Rotating to next model...`);
        lastError = new Error(`Empty response from Groq model '${currentModel}'`);
        continue;
      }

      let reply = '';
      let speech: string | undefined = undefined;
      let actions: AgentAction[] = [];
      let appActions: AppAction[] = [];
      let pendingInteraction: any = undefined;
      let suggestedReplies: string[] | undefined = undefined;

      // Parse structured JSON response
      try {
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
        console.warn(`[GroqProvider] Could not parse JSON from model '${currentModel}', falling back to raw text:`, parseErr);
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
          model: currentModel,
          processingTime: duration,
        },
      };
    } catch (err: any) {
      console.warn(`[GroqProvider] Exception with model '${currentModel}':`, err?.message || err, '. Rotating to next model...');
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  console.error('[GroqProvider] All Groq models in rotation priority failed:', lastError);
  throw lastError || new Error('All Groq models failed.');
}
