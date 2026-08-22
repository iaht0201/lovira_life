import { LifeSession, LoviraAgentResponse, AgentAction, UserProfile } from '../../types';
import { buildSessionContextPrompt } from './SessionContextBuilder';

export interface GroqRequestOptions {
  message: string;
  session: LifeSession;
  userProfile?: UserProfile | null;
  modelOverride?: string;
}

export async function callGroqAgent(
  options: GroqRequestOptions,
  apiKey: string
): Promise<LoviraAgentResponse | null> {
  const { message, session, userProfile, modelOverride } = options;
  const model = modelOverride || 'openai/gpt-oss-20b';
  const startTime = Date.now();

  const contextPrompt = buildSessionContextPrompt(session, userProfile);

  const tools = [
    {
      type: 'function',
      function: {
        name: 'update_life_session',
        description: 'Phát hành các hành động cập nhật trạng thái phiên (Tasks, Subtasks, Facts, Step tiếp theo)',
        parameters: {
          type: 'object',
          properties: {
            reply: {
              type: 'string',
              description: 'Câu trả lời ngắn gọn, thân thiện bằng tiếng Việt (không dùng markdown asterisks)',
            },
            speech: {
              type: 'string',
              description: 'Lời đọc ngắn gọn cho giọng nói',
            },
            actions: {
              type: 'array',
              description: 'Danh sách các hành động cập nhật trạng thái',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'ADD_FACT',
                      'UPDATE_FACT',
                      'DELETE_FACT',
                      'ADD_TASK',
                      'UPDATE_TASK',
                      'COMPLETE_TASK',
                      'SKIP_TASK',
                      'DELETE_TASK',
                      'REORDER_TASK',
                      'ADD_SUBTASK',
                      'COMPLETE_SUBTASK',
                      'UPDATE_NEXT_ACTION',
                      'CHANGE_GOAL',
                      'PAUSE_SESSION',
                      'RESUME_SESSION',
                      'COMPLETE_SESSION',
                      'ADD_RESOURCE',
                      'UPDATE_SESSION',
                      'OPEN_CAMERA',
                    ],
                  },
                  payload: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      title: { type: 'string' },
                      value: { type: 'string' },
                      factId: { type: 'string' },
                      taskId: { type: 'string' },
                      parentTaskId: { type: 'string' },
                      subtaskId: { type: 'string' },
                      description: { type: 'string' },
                      important: { type: 'boolean' },
                      order: { type: 'number' },
                      goal: { type: 'string' },
                    },
                  },
                },
                required: ['type', 'payload'],
              },
            },
          },
          required: ['reply', 'actions'],
        },
      },
    },
  ];

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
          { role: 'system', content: contextPrompt },
          { role: 'user', content: message },
        ],
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Groq API error (${res.status}):`, errText);
      return null;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];

    let reply = choice?.message?.content || '';
    let actions: AgentAction[] = [];
    let speech: string | undefined = undefined;

    if (toolCall && toolCall.function?.name === 'update_life_session') {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (parsed.reply) reply = parsed.reply;
        if (parsed.speech) speech = parsed.speech;
        if (Array.isArray(parsed.actions)) actions = parsed.actions;
      } catch (err) {
        console.warn('Groq arguments parse error:', err);
      }
    }

    if (!reply) {
      reply = actions.length > 0 
        ? 'Mình đã cập nhật danh sách cho phiên của bạn rồi nhé!' 
        : 'Lovira đã nhận nhắn gửi của bạn!';
    }

    return {
      reply: reply.replace(/\*\*/g, '').replace(/[*#]/g, ''),
      speech: (speech || reply).replace(/[*#]/g, ''),
      actions,
      meta: {
        engine: 'groq',
        model,
        processingTime: Date.now() - startTime,
      },
    };
  } catch (e) {
    console.error('Groq fetch error:', e);
    return null;
  }
}
