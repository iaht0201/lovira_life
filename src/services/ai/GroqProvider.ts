import {
  LifeSession,
  LoviraAgentResponse,
  AgentAction,
  UserProfile,
  InteractionInputMode,
  AppInteractionContext,
  AppAction,
} from '../../types.js';
import { buildSessionContextPrompt } from './SessionContextBuilder.js';

// Enum cho toàn bộ các mô hình Groq chính thức được hỗ trợ
export enum GroqModel {
  GPT_OSS_20B = 'openai/gpt-oss-20b',
  GPT_OSS_120B = 'openai/gpt-oss-120b',
  QWEN_3_6_27B = 'qwen/qwen3.6-27b',
  COMPOUND_MINI = 'groq/compound-mini',
  COMPOUND = 'groq/compound',
  // Legacy aliases mapped to active models
  LLAMA_3_1_8B = 'openai/gpt-oss-20b',
  LLAMA_3_3_70B = 'openai/gpt-oss-120b',
  MIXTRAL_8X7B = 'qwen/qwen3.6-27b',
  GEMMA2_9B = 'groq/compound-mini',
  DEEPSEEK_70B = 'openai/gpt-oss-120b',
}

// Thứ tự xoay tua ưu tiên khi một mô hình gặp lỗi 429 / Rate Limit / 404 / 413
export const GROQ_ROTATION_PRIORITY: GroqModel[] = [
  GroqModel.GPT_OSS_20B,
  GroqModel.GPT_OSS_120B,
  GroqModel.QWEN_3_6_27B,
  GroqModel.COMPOUND_MINI,
  GroqModel.COMPOUND,
];

export const ALLOWED_GROQ_MODELS = Object.values(GroqModel);

export function normalizeGroqModel(modelInput?: string): GroqModel {
  if (!modelInput) return GroqModel.GPT_OSS_20B;

  if (modelInput === 'llama-3.1-8b-instant' || modelInput === 'openai/gpt-oss-20b' || modelInput === 'groq/compound-mini') {
    return GroqModel.GPT_OSS_20B;
  }
  if (modelInput === 'llama-3.3-70b-versatile' || modelInput === 'openai/gpt-oss-120b' || modelInput === 'groq/compound') {
    return GroqModel.GPT_OSS_120B;
  }
  if (modelInput === 'mixtral-8x7b-32768' || modelInput === 'qwen/qwen3.6-27b') {
    return GroqModel.QWEN_3_6_27B;
  }
  if (modelInput === 'gemma2-9b-it') {
    return GroqModel.COMPOUND_MINI;
  }

  if (Object.values(GroqModel).includes(modelInput as GroqModel)) {
    return modelInput as GroqModel;
  }

  const lower = modelInput.toLowerCase();
  if (lower.includes('70b') || lower.includes('compound') || lower.includes('120b')) {
    return GroqModel.GPT_OSS_120B;
  }
  if (lower.includes('qwen') || lower.includes('mixtral')) return GroqModel.QWEN_3_6_27B;
  if (lower.includes('mini') || lower.includes('gemma')) return GroqModel.COMPOUND_MINI;

  return GroqModel.GPT_OSS_20B;
}

export interface GroqRequestOptions {
  message: string;
  session?: LifeSession | null;
  conversationHistory?: { role: string; text: string }[];
  userProfile?: UserProfile | null;
  modelOverride?: string;
  inputMode?: InteractionInputMode;
  appContext?: AppInteractionContext;
}

export async function callGroqAgent(
  options: GroqRequestOptions,
  apiKey: string
): Promise<LoviraAgentResponse | null> {
  const { message, session, conversationHistory, userProfile, modelOverride, inputMode, appContext } = options;
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
- Bạn PHẢI trả về duy nhất một đối tượng JSON hợp lệ:
{
  "reply": "Câu trả lời thân thiện bằng tiếng Việt (dùng • và **in đậm** cho danh sách)",
  "speech": "Lời đọc to ngắn gọn bằng tiếng Việt",
  "suggestedReplies": ["Gợi ý 1", "Gợi ý 2"],
  "actions": [{ "type": "ADD_TASK|UPDATE_TASK|COMPLETE_TASK|COMPLETE_SUBTASK|ADD_FACT|COMPLETE_SESSION", "payload": { ... } }],
  "appActions": [{ "type": "GO_HOME|OPEN_SESSION|CREATE_SESSION|OPEN_SETTINGS|OPEN_CAMERA|OPEN_REMINDERS|CREATE_REMINDER", "payload": { ... } }],
  "pendingInteraction": { "type": "create_session", "data": { "goal": "Mục tiêu..." } }
}
`;

  const systemPrompt = `${baseContextPrompt}\n${jsonInstruction}`;

  // Chuẩn bị lịch sử trò chuyện (conversationHistory)
  const cleanHistory = (conversationHistory || []).filter((h) => h.text && h.text.trim());
  if (
    cleanHistory.length > 0 &&
    cleanHistory[cleanHistory.length - 1].role === 'user' &&
    cleanHistory[cleanHistory.length - 1].text.trim() === message.trim()
  ) {
    cleanHistory.pop();
  }

  const historyMessages = cleanHistory.map((h) => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.text,
  }));

  let lastError: Error | null = null;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Xoay tua mô hình nếu gặp lỗi Rate Limit (429), Model Not Found (404), JSON Validation (400)...
  for (const currentModel of modelsToTry) {
    let retried429 = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[GroqProvider] Attempting call with model: ${currentModel} (attempt ${attempt + 1})`);

        const payload: any = {
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
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
          signal: AbortSignal.timeout(6000),
        });

        // Xử lý lỗi Rate Limit (429)
        if (res.status === 429) {
          const errText = await res.text();
          console.warn(`[GroqProvider] Model '${currentModel}' hit Rate Limit (429).`);
          
          // Trích xuất thời gian chờ từ thông báo lỗi (ví dụ: "Please try again in 1.35s")
          let delayMs = 1200;
          const match = errText.match(/try again in (\d+(\.\d+)?)s/i);
          if (match && match[1]) {
            delayMs = Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 200, 2500);
          }

          if (!retried429) {
            retried429 = true;
            console.log(`[GroqProvider] Sleeping ${delayMs}ms before retrying '${currentModel}'...`);
            await sleep(delayMs);
            continue; // Thử lại mô hình này 1 lần nữa sau khi chờ rate-limit window
          } else {
            // Đã thử 2 lần trên mô hình này, chờ ngắn rồi chuyển mô hình kế tiếp
            await sleep(800);
            lastError = new Error(`Groq Rate limit exceeded (429) on ${currentModel}`);
            break;
          }
        }

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
            break;
          }
        }

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[GroqProvider] Model '${currentModel}' failed (${res.status}): ${errText}. Rotating to next model...`);
          lastError = new Error(`Groq API error (${res.status}): ${errText}`);
          break; // Luân chuyển sang mô hình tiếp theo
        }

        const data = await res.json();
        const duration = Date.now() - startTime;
        const choice = data.choices?.[0];
        const rawContent = choice?.message?.content || '';

        if (!rawContent) {
          console.warn(`[GroqProvider] Empty response from model '${currentModel}'. Rotating to next model...`);
          lastError = new Error(`Empty response from Groq model '${currentModel}'`);
          break;
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
        break;
      }
    }
  }

  console.warn('[GroqProvider] All Groq models in rotation priority failed or rate limited:', lastError?.message);
  return null;
}
