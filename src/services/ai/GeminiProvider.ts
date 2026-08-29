import { GoogleGenAI, Type } from '@google/genai';
import {
  LifeSession,
  LoviraAgentResponse,
  AgentAction,
  AppAction,
  UserProfile,
  InteractionInputMode,
  AppInteractionContext,
} from '../../types.js';
import { buildSessionContextPrompt } from './SessionContextBuilder.js';
import { deduceHonorifics } from '../conversationStyle.js';

const geminiAgentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        'Câu trả lời thân thiện, ân cần, tự nhiên, đúng danh xưng bằng tiếng Việt. Sử dụng định dạng rõ ràng (ngắt dòng, gạch đầu dòng • và **in đậm** cho tiêu đề).',
    },
    speech: {
      type: Type.STRING,
      description: 'Lời đọc ngắn gọn, tự nhiên, diễn cảm cho giọng nói TTS (không chứa ký tự markdown).',
    },
    suggestedReplies: {
      type: Type.ARRAY,
      description: '2-3 gợi ý câu trả lời nhanh phù hợp ngữ cảnh để hiển thị dạng chip cho người dùng.',
      items: { type: Type.STRING },
    },
    actions: {
      type: Type.ARRAY,
      description:
        'Danh sách các hành động cập nhật trạng thái phiên (ADD_TASK, COMPLETE_TASK, ADD_SUBTASK, COMPLETE_SUBTASK, ADD_FACT, COMPLETE_SESSION, UPDATE_NEXT_ACTION, DELETE_FACT).',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description:
              'Loại hành động session: ADD_FACT, COMPLETE_TASK, ADD_TASK, ADD_SUBTASK, COMPLETE_SUBTASK, COMPLETE_SESSION, UPDATE_NEXT_ACTION, DELETE_FACT',
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
      description:
        'Danh sách các hành động điều hướng và thao tác ứng dụng (CREATE_REMINDER, OPEN_REMINDERS, CREATE_SESSION, OPEN_SESSION, GO_HOME, GO_BACK, OPEN_SETTINGS, OPEN_PROFILE, OPEN_CAMERA, UPDATE_ACCESSIBILITY_SETTING, UPDATE_REMINDER, DELETE_REMINDER, SNOOZE_REMINDER, COMPLETE_REMINDER, PIN_SESSION, ARCHIVE_SESSION).',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: 'Loại hành động ứng dụng',
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
              scheduledAt: { type: Type.STRING, description: 'Chuỗi ISO 8601 thời điểm nhắc nhở' },
              eventTime: { type: Type.STRING, description: 'Giờ sự kiện, ví dụ: 08:00' },
              eventDate: { type: Type.STRING, description: 'Ngày sự kiện, ví dụ: 29/08' },
              leadTimeMinutes: { type: Type.INTEGER, description: 'Số phút nhắc trước (0, 15, 30, 60)' },
              category: { type: Type.STRING, description: 'medication, appointment, family, general' },
              notes: { type: Type.STRING },
              repeat: { type: Type.STRING, description: 'once, daily, weekly, monthly' },
              priority: { type: Type.STRING, description: 'low, medium, high' },
              snoozePreset: { type: Type.STRING },
            },
          },
        },
        required: ['type'],
      },
    },
    pendingInteraction: {
      type: Type.OBJECT,
      description: 'Tương tác chờ người dùng xác nhận hoặc làm rõ (ví dụ tạo phiên mới, hoặc làm rõ giờ nhắc).',
      properties: {
        type: { type: Type.STRING, description: 'create_session, confirm_action, clarification' },
        data: {
          type: Type.OBJECT,
          properties: {
            goal: { type: Type.STRING },
            question: { type: Type.STRING },
            actionType: { type: Type.STRING },
          },
        },
      },
    },
  },
  required: ['reply'],
};

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

    const { session, message, conversationHistory, userProfile, inputMode, appContext } = options;
    const systemPrompt = buildSessionContextPrompt({
      session,
      userProfile,
      inputMode,
      appContext,
      message,
    });

    const cleanHistory = (conversationHistory || []).filter((h) => h.text && h.text.trim());
    if (
      cleanHistory.length > 0 &&
      cleanHistory[cleanHistory.length - 1].role === 'user' &&
      cleanHistory[cleanHistory.length - 1].text.trim() === message.trim()
    ) {
      cleanHistory.pop();
    }

    const contents: any[] = [];
    for (const h of cleanHistory) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const startTime = Date.now();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini call timed out after 10000ms')), 10000)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: geminiAgentResponseSchema,
          temperature: 0.1,
        },
      }),
      timeoutPromise,
    ]);

    let parsedData: any = {};
    if (response.text) {
      try {
        parsedData = JSON.parse(response.text.trim());
      } catch (parseErr) {
        console.warn('[GeminiProvider] Failed to parse JSON response from Gemini:', parseErr, response.text);
      }
    }

    let textReply = parsedData.reply || '';
    let speechText: string | undefined = parsedData.speech;
    let suggestedReplies: string[] | undefined = Array.isArray(parsedData.suggestedReplies)
      ? parsedData.suggestedReplies
      : undefined;
    let actions: AgentAction[] = Array.isArray(parsedData.actions) ? parsedData.actions : [];
    let appActions: AppAction[] = Array.isArray(parsedData.appActions) ? parsedData.appActions : [];
    let pendingInteraction: any = parsedData.pendingInteraction || undefined;

    if (pendingInteraction && pendingInteraction.type) {
      pendingInteraction = {
        ...pendingInteraction,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      };
    }

    if (!textReply) {
      const honorifics = deduceHonorifics(userProfile, message);
      const { addressing, me, da, a } = honorifics;
      textReply = `${da ? da + ', ' : ''}${me} đã ghi nhận lời nhắn của ${addressing}. ${
        addressing.charAt(0).toUpperCase() + addressing.slice(1)
      } cần ${me} hỗ trợ gì tiếp theo nhé${a}?`;
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
        model: 'gemini-3.7-flash',
        processingTime: Date.now() - startTime,
      },
    };
  }
}

export const geminiProvider = new GeminiProvider();

