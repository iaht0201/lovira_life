import { GoogleGenAI, Type } from '@google/genai';
import { LifeSession, LoviraAgentResponse, AgentAction, AppAction, UserProfile, InteractionInputMode, AppInteractionContext } from '../../types.js';
import { buildSessionContextPrompt } from './SessionContextBuilder.js';
import { deduceHonorifics } from '../conversationStyle.js';

export class GeminiProvider {
  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  isAvailable(): boolean {
    return !!this.getClient();
  }

  async chat(options: {
    session?: LifeSession | null;
    message: string;
    conversationHistory?: { role: string; text: string }[];
    userProfile?: UserProfile | null;
    inputMode?: InteractionInputMode;
    appContext?: AppInteractionContext;
  }): Promise<LoviraAgentResponse | null> {
    const ai = this.getClient();
    if (!ai) return null;

    const { session, message, userProfile, inputMode, appContext } = options;
    const systemPrompt = buildSessionContextPrompt({
      session,
      userProfile,
      inputMode,
      appContext,
      message,
    });

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'update_life_session',
            description: 'Phát hành các hành động cập nhật trạng thái phiên (Tasks, Subtasks, Facts, Step tiếp theo), điều hướng ứng dụng (App Actions) và câu trả lời hội thoại',
            parameters: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Câu trả lời tự nhiên, thân thiện, ân cần và đúng danh xưng. Sử dụng định dạng rõ ràng (ngắt dòng, gạch đầu dòng • và **in đậm** cho tiêu đề từng mục khi đưa ra danh sách gợi ý).',
                },
                speech: {
                  type: Type.STRING,
                  description: 'Lời đọc ngắn gọn, tự nhiên, diễn cảm cho giọng nói (không chứa dấu sao markdown)',
                },
                suggestedReplies: {
                  type: Type.ARRAY,
                  description: '2-3 gợi ý câu trả lời nhanh phù hợp ngữ cảnh để hiển thị dạng chip cho người dùng',
                  items: { type: Type.STRING },
                },
                actions: {
                  type: Type.ARRAY,
                  description: 'Danh sách các hành động cập nhật trạng thái Todo / Facts / Next Action trong phiên',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: 'Loại hành động: ADD_FACT, COMPLETE_TASK, ADD_TASK, ADD_SUBTASK, COMPLETE_SUBTASK, COMPLETE_SESSION, UPDATE_NEXT_ACTION, DELETE_FACT',
                      },
                      payload: {
                        type: Type.OBJECT,
                        properties: {
                          category: { type: Type.STRING },
                          title: { type: Type.STRING },
                          value: { type: Type.STRING },
                          factId: { type: Type.STRING },
                          taskId: { type: Type.STRING },
                          parentTaskId: { type: Type.STRING },
                          subtaskId: { type: Type.STRING },
                          description: { type: Type.STRING },
                          important: { type: Type.BOOLEAN },
                        },
                      },
                    },
                    required: ['type', 'payload'],
                  },
                },
                appActions: {
                  type: Type.ARRAY,
                  description: 'Danh sách các hành động điều hướng và thao tác ứng dụng (nhắc nhở, phiên làm việc, cài đặt)',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: 'GO_HOME, GO_BACK, OPEN_SESSION, CREATE_SESSION, OPEN_SETTINGS, OPEN_PROFILE, OPEN_CAMERA, UPDATE_ACCESSIBILITY_SETTING, OPEN_REMINDERS, CREATE_REMINDER, UPDATE_REMINDER, DELETE_REMINDER, SNOOZE_REMINDER, COMPLETE_REMINDER, PIN_SESSION, ARCHIVE_SESSION',
                      },
                      payload: {
                        type: Type.OBJECT,
                        properties: {
                          sessionId: { type: Type.STRING },
                          sessionTitle: { type: Type.STRING },
                          goal: { type: Type.STRING },
                          setting: { type: Type.STRING },
                          value: { type: Type.STRING },
                          reminderId: { type: Type.STRING },
                          title: { type: Type.STRING },
                          scheduledAt: { type: Type.STRING },
                          category: { type: Type.STRING },
                          notes: { type: Type.STRING },
                          repeat: { type: Type.STRING },
                          priority: { type: Type.STRING },
                          snoozePreset: { type: Type.STRING },
                        },
                      },
                    },
                    required: ['type'],
                  },
                },
                pendingInteraction: {
                  type: Type.OBJECT,
                  description: 'Tương tác chờ xác nhận (ví dụ khi AI đề xuất tạo phiên làm việc mới)',
                  properties: {
                    type: { type: Type.STRING, description: 'create_session, confirm_action' },
                    data: {
                      type: Type.OBJECT,
                      properties: {
                        goal: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              required: ['reply'],
            },
          },
        ],
      },
    ];

    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nTin nhắn của người dùng: "${message}"` }] },
      ],
      config: {
        tools,
        temperature: 0.2,
      },
    });

    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall).map((p) => p.functionCall);

    let actions: AgentAction[] = [];
    let appActions: AppAction[] = [];
    let pendingInteraction: any = undefined;
    let textReply = response.text || '';
    let speechText: string | undefined = undefined;
    let suggestedReplies: string[] | undefined = undefined;

    if (functionCalls && functionCalls.length > 0) {
      for (const fc of functionCalls) {
        if (fc && fc.name === 'update_life_session') {
          const args = fc.args as any;
          if (args.reply) textReply = args.reply;
          if (args.speech) speechText = args.speech;
          if (Array.isArray(args.suggestedReplies)) suggestedReplies = args.suggestedReplies;
          if (Array.isArray(args.actions)) actions = args.actions;
          if (Array.isArray(args.appActions)) appActions = args.appActions;
          if (args.pendingInteraction) {
            pendingInteraction = {
              ...args.pendingInteraction,
              createdAt: new Date().toISOString(),
              expiresAt: Date.now() + 180000,
            };
          }
        }
      }
    }

    if (!textReply) {
      const honorifics = deduceHonorifics(userProfile, message);
      const { addressing, me, da, a } = honorifics;
      textReply = `${da ? da + ', ' : ''}${me} đã ghi nhận lời nhắn của ${addressing}. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} cần ${me} hỗ trợ gì tiếp theo nhé${a}?`;
    }

    const cleanSpeech = (speechText || textReply).replace(/\*\*/g, '').replace(/[*#•]/g, '').trim();

    return {
      reply: textReply.trim(),
      speech: cleanSpeech,
      actions,
      appActions: appActions.length > 0 ? appActions : undefined,
      pendingInteraction,
      suggestedReplies,
      meta: {
        engine: 'gemini',
        model: 'gemini-2.5-flash',
        processingTime: Date.now() - startTime,
      },
    };
  }
}

export const geminiProvider = new GeminiProvider();
