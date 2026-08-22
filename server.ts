import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { LifeSession, LoviraAgentResponse, AgentAction, GeneratedSessionPlan } from './src/types.js';
import { parseLocalIntent } from './src/services/localIntentEngine.js';
import { generateFallbackCustomSessionPlan } from './src/services/fallbackPlanner.js';
import { deduceHonorifics, formatSoftNextStepGuidance } from './src/services/conversationStyle.js';
import { buildClarificationPrompt } from './src/services/ai/prompts/clarificationPrompt.js';
import { buildSessionContextPrompt } from './src/services/ai/SessionContextBuilder.js';
import { callGroqAgent } from './src/services/ai/GroqProvider.js';
import { selectGroqModel } from './src/services/ai/AIRouter.js';
import { routeScenario, extractKnownFacts } from './src/services/scenarioRouter.js';
import { normalizeGeneratedLifePlan, validateGeneratedLifePlan } from './src/services/planValidator.js';
import { resolveCurrentStep, calculateNextRecommendedAction, applyAgentActionBatch } from './src/services/actionEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper to initialize Gemini SDK
  const getGeminiClient = () => {
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
  };

  // 1. Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Chat Endpoint with Groq, Gemini & Function Calling
  app.post('/api/chat', async (req, res) => {
    try {
      const { session, message, isDemoMode, userProfile, provider } = req.body as {
        session: LifeSession;
        message: string;
        isDemoMode?: boolean;
        userProfile?: any;
        provider?: 'groq' | 'gemini' | 'demo';
      };

      if (!session || !message) {
        return res.status(400).json({ error: 'Thiếu dữ liệu session hoặc message' });
      }

      // 1. Fast check local deterministic commands
      const localResult = parseLocalIntent(message, session, userProfile);
      if (localResult) {
        return res.json(localResult);
      }

      // 2. Try Groq Provider if GROQ_API_KEY is available
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey && provider !== 'gemini' && !isDemoMode) {
        const selectedModel = selectGroqModel(message, session);
        const groqRes = await callGroqAgent(
          { message, session, userProfile, modelOverride: selectedModel },
          groqKey
        );
        if (groqRes) {
          return res.json(groqRes);
        }
      }

      // 3. Gemini Provider
      const ai = getGeminiClient();

      if (!ai || isDemoMode) {
        const honorifics = deduceHonorifics(userProfile, message);
        const { addressing, me, da, a } = honorifics;
        const resolvedStep = resolveCurrentStep(session);
        const activeTask = resolvedStep?.subtask || resolvedStep?.task;

        let replyText = `${da}, ${me} đã nhận lời nhắn của ${addressing}.`;
        if (activeTask) {
          replyText += ` Bước hiện tại là: "${activeTask.title}". ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} cứ thong thả làm, khi xong chỉ cần báo cho ${me} nhé${a}!`;
        }

        return res.json({
          reply: replyText,
          speech: replyText,
          actions: [],
          suggestedReplies: ['Xong bước này rồi', 'Cần làm gì tiếp theo?', 'Nhờ Lovira tư vấn'],
          meta: { engine: 'local', model: 'fallback-demo' },
        });
      }

      const systemPrompt = buildSessionContextPrompt(session, userProfile);

      const tools = [
        {
          functionDeclarations: [
            {
              name: 'add_fact',
              description: 'Thêm hoặc cập nhật một thông tin quan trọng vào phiên (giấy tờ, địa điểm, thời gian, người liên quan, dặn dò, cảnh báo)',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'Phân loại: date, time, location, person, requirement, instruction, warning',
                    enum: ['date', 'time', 'location', 'person', 'requirement', 'instruction', 'warning'],
                  },
                  title: { type: Type.STRING, description: 'Tiêu đề ngắn gọn của thông tin' },
                  value: { type: Type.STRING, description: 'Nội dung chi tiết của thông tin' },
                },
                required: ['category', 'title', 'value'],
              },
            },
            {
              name: 'complete_task',
              description: 'Đánh dấu hoàn thành một nhiệm vụ trong danh sách',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING, description: 'Mã ID hoặc tiêu đề của nhiệm vụ cần hoàn thành' },
                },
                required: ['taskId'],
              },
            },
            {
              name: 'add_task',
              description: 'Thêm một nhiệm vụ / việc cần làm mới vào phiên',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Tên việc cần làm' },
                  description: { type: Type.STRING, description: 'Mô tả chi tiết việc cần làm' },
                  important: { type: Type.BOOLEAN, description: 'Có phải việc quan trọng ưu tiên không' },
                },
                required: ['title'],
              },
            },
            {
              name: 'add_subtask',
              description: 'Thêm một việc con/bước con vào công việc cha',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  parentTaskId: { type: Type.STRING, description: 'Mã ID hoặc tên công việc cha' },
                  title: { type: Type.STRING, description: 'Tên bước con cần làm' },
                  description: { type: Type.STRING, description: 'Mô tả chi tiết bước con' },
                },
                required: ['parentTaskId', 'title'],
              },
            },
            {
              name: 'complete_subtask',
              description: 'Đánh dấu hoàn thành một bước con trong công việc cha',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  subtaskId: { type: Type.STRING, description: 'Mã ID hoặc tên bước con cần hoàn thành' },
                },
                required: ['subtaskId'],
              },
            },
            {
              name: 'update_next_action',
              description: 'Cập nhật thẻ Bước tiếp theo đề xuất cho người dùng',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Tiêu đề hành động đề xuất tiếp theo' },
                  description: { type: Type.STRING, description: 'Mô tả ngắn gọn hướng dẫn người dùng' },
                },
                required: ['title'],
              },
            },
            {
              name: 'delete_fact',
              description: 'Xoá một thông tin khỏi phiên',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  factId: { type: Type.STRING, description: 'Mã thông tin cần xoá' },
                },
                required: ['factId'],
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

      const actions: AgentAction[] = [];
      let textReply = response.text || '';

      if (functionCalls && functionCalls.length > 0) {
        for (const fc of functionCalls) {
          if (fc && fc.name) {
            const args = fc.args as any;
            if (fc.name === 'add_fact') {
              actions.push({
                type: 'ADD_FACT',
                payload: {
                  category: args.category,
                  title: args.title,
                  value: args.value,
                },
              });
            } else if (fc.name === 'complete_task') {
              actions.push({
                type: 'COMPLETE_TASK',
                payload: { taskId: args.taskId },
              });
            } else if (fc.name === 'add_task') {
              actions.push({
                type: 'ADD_TASK',
                payload: { title: args.title, description: args.description, important: args.important },
              });
            } else if (fc.name === 'add_subtask') {
              actions.push({
                type: 'ADD_SUBTASK',
                payload: { parentTaskId: args.parentTaskId, title: args.title, description: args.description },
              });
            } else if (fc.name === 'complete_subtask') {
              actions.push({
                type: 'COMPLETE_SUBTASK',
                payload: { subtaskId: args.subtaskId },
              });
            } else if (fc.name === 'update_next_action') {
              actions.push({
                type: 'UPDATE_NEXT_ACTION',
                payload: { title: args.title, description: args.description },
              });
            } else if (fc.name === 'delete_fact') {
              actions.push({
                type: 'DELETE_FACT',
                payload: { factId: args.factId },
                requiresConfirmation: true,
                confirmationPrompt: 'Lovira cần bạn xác nhận trước khi xoá thông tin này.',
              });
            }
          }
        }
      }

      if (!textReply) {
        if (actions.length > 0) {
          textReply = 'Lovira đã cập nhật thông tin phiên theo yêu cầu của bạn!';
        } else {
          textReply = 'Lovira đã nhận nhắn gửi. Bạn cần mình hỗ trợ bước nào nữa không?';
        }
      }

      const cleanReply = textReply.replace(/\*\*/g, '').replace(/[*#]/g, '');

      const agentRes: LoviraAgentResponse = {
        reply: cleanReply,
        speech: cleanReply,
        actions,
        meta: {
          engine: 'gemini',
          model: 'gemini-2.5-flash',
          processingTime: Date.now() - startTime,
        },
      };

      res.json(agentRes);
    } catch (error: any) {
      console.error('API chat error:', error);
      const { session, message } = req.body;
      const localResult = parseLocalIntent(message, session);
      if (localResult) {
        return res.json(localResult);
      }

      res.json({
        reply: 'Lovira đang hoạt động ở chế độ dự phòng. Thông tin phiên của bạn được bảo toàn!',
        actions: [],
      });
    }
  });

  // 3. Clarification Check Endpoint
  app.post('/api/check-clarification', async (req, res) => {
    try {
      const { prompt, isDemoMode } = req.body as { prompt: string; isDemoMode?: boolean };

      if (!prompt || !prompt.trim()) {
        return res.json({ isSpecificEnough: true });
      }

      const pTrimmed = prompt.trim();
      const pLower = pTrimmed.toLowerCase();

      // Clear ambiguous short phrases that definitely need more detail
      const vaguePatterns = [
        /^giúp\s*(tôi|mình|em|anh|chị)?$/i,
        /^làm việc$/i,
        /^tư vấn$/i,
        /^lên lịch$/i,
        /^kế hoạch$/i,
        /^không biết làm gì$/i,
        /^chỉ (tôi|mình|em) với$/i,
        /^giúp với$/i,
      ];

      if (vaguePatterns.some((pattern) => pattern.test(pTrimmed)) || pTrimmed.length < 10) {
        return res.json({
          isSpecificEnough: false,
          missingInfo: ['mục tiêu hoặc địa điểm cụ thể'],
          clarifyingQuestion: 'Bạn muốn Lovira hỗ trợ bạn làm việc gì cụ thể (ví dụ: đi khám bệnh, làm thủ tục, phỏng vấn, mua sắm...)?',
        });
      }

      const groqKey = process.env.GROQ_API_KEY;
      const ai = getGeminiClient();

      if (groqKey && !isDemoMode) {
        try {
          const clarificationPrompt = buildClarificationPrompt(prompt);
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'groq/compound-mini',
              messages: [{ role: 'user', content: clarificationPrompt }],
              temperature: 0.1,
            }),
          });
          if (groqRes.ok) {
            const data = await groqRes.json();
            const textContent = data.choices?.[0]?.message?.content || '';
            const cleanJson = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);
            return res.json({
              isSpecificEnough: !!result.isSpecificEnough,
              missingInfo: result.missingInfo || [],
              clarifyingQuestion: result.clarifyingQuestion || '',
            });
          }
        } catch (e) {
          console.warn('Groq clarification check failed:', e);
        }
      }

      if (ai && !isDemoMode) {
        try {
          const clarificationPrompt = buildClarificationPrompt(prompt);
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              { role: 'user', parts: [{ text: clarificationPrompt }] },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });

          const text = response.text || '';
          const result = JSON.parse(text);
          return res.json({
            isSpecificEnough: !!result.isSpecificEnough,
            missingInfo: result.missingInfo || [],
            clarifyingQuestion: result.clarifyingQuestion || '',
          });
        } catch (err) {
          console.warn('Gemini clarification check error:', err);
        }
      }

      // If prompt has reasonable length (>= 12 chars), treat as specific enough to avoid interrupting user flow
      if (pTrimmed.length >= 12) {
        return res.json({ isSpecificEnough: true });
      }

      return res.json({
        isSpecificEnough: false,
        missingInfo: ['chi tiết việc cần làm'],
        clarifyingQuestion: 'Bạn có thể chia sẻ thêm về thời gian, địa điểm hoặc chi tiết việc cần làm được không?',
      });
    } catch (e) {
      console.error('API check-clarification error:', e);
      return res.json({ isSpecificEnough: true });
    }
  });

  // 4. Generate Custom Session Plan
  app.post('/api/generate-session', async (req, res) => {
    try {
      const { prompt, isDemoMode } = req.body as { prompt: string; isDemoMode?: boolean };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Thiếu mô tả mục tiêu (prompt)' });
      }

      const routing = routeScenario(prompt);
      const groqKey = process.env.GROQ_API_KEY;
      const ai = getGeminiClient();

      // Priority 1: Groq if GROQ_API_KEY is configured
      if (groqKey && !isDemoMode) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-20b',
              messages: [
                {
                  role: 'system',
                  content: `Bạn là Lovira Life Planner. Hãy lập kế hoạch cho mục tiêu của người dùng.
Quy tắc:
1. Nhiệm vụ (tasks) và bước con (subtasks) phải là HÀNH ĐỘNG CỤ THỂ THỰC TẾ, không dùng câu chung chung như "Rà soát yêu cầu".
2. Trích xuất Important Facts từ thông tin người dùng nêu (thời gian, địa điểm, giấy tờ, người liên quan). Tuyệt đối không bịa thông tin không có trong yêu cầu.
3. Trả về DUY NHẤT JSON đúng schema sau (không bọc markdown):
{
  "title": "Tiêu đề ngắn gọn kèm icon",
  "goal": "Mục tiêu đầy đủ",
  "scenarioType": "custom",
  "scenarioFamily": "${routing.family}",
  "secondaryFamilies": [],
  "tags": [],
  "tasks": [
    {
      "title": "Tên công việc chính",
      "order": 1,
      "important": true,
      "subtasks": [
        { "title": "Tên bước con", "order": 1 }
      ]
    }
  ],
  "importantFacts": [
    { "type": "requirement", "title": "Tiêu đề", "value": "Nội dung" }
  ],
  "firstRecommendedAction": "Tên bước con đầu tiên hoặc công việc đầu tiên"
}`,
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.2,
            }),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            const textContent = data.choices?.[0]?.message?.content || '';
            const cleanJson = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
              const normalized = normalizeGeneratedLifePlan(parsed, prompt, routing);
              const validation = validateGeneratedLifePlan(normalized);
              if (validation.valid) {
                return res.json(normalized);
              } else {
                console.warn('Groq generated plan failed validation:', validation.errors);
              }
            }
          }
        } catch (e) {
          console.warn('Groq plan generation failed, falling back to Gemini/Local:', e);
        }
      }

      // Priority 2: Gemini if GEMINI_API_KEY is available
      if (ai && !isDemoMode) {
        const systemPrompt = `Bạn là Lovira. Người dùng vừa mô tả một mục tiêu họ cần hoàn thành.
Hãy tạo một kế hoạch phiên hỗ trợ gồm:
- Tiêu đề ngắn gọn, dễ hiểu kèm icon
- Mục tiêu phiên đầy đủ
- Danh sách 3-6 công việc chính (tasks), có thể chia subtasks cho các bước phức tạp.
- Trích xuất Important Facts (thời gian, địa điểm, giấy tờ liên quan).

Tránh các task chung chung vô nghĩa. Mọi việc phải cụ thể.

Trả về DUY NHẤT JSON đúng schema:
{
  "title": "Tiêu đề ngắn gọn kèm icon",
  "goal": "Mục tiêu phiên đầy đủ",
  "scenarioType": "custom",
  "scenarioFamily": "${routing.family}",
  "secondaryFamilies": [],
  "tags": [],
  "tasks": [
    {
      "title": "Tên công việc cha",
      "order": 1,
      "important": true,
      "subtasks": [
        { "title": "Tên bước con 1", "order": 1 }
      ]
    }
  ],
  "importantFacts": [
    { "type": "requirement", "title": "Tên giấy tờ/thông tin", "value": "Nội dung chi tiết" }
  ],
  "firstRecommendedAction": "Tên bước con 1"
}`;

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nNội dung mô tả của người dùng: "${prompt}"` }] },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const text = response.text || '';
          const jsonPlan = JSON.parse(text);
          const normalized = normalizeGeneratedLifePlan(jsonPlan, prompt, routing);
          const validation = validateGeneratedLifePlan(normalized);
          if (validation.valid) {
            return res.json(normalized);
          } else {
            console.warn('Gemini plan failed validation:', validation.errors);
          }
        } catch (e) {
          console.warn('Gemini JSON parse failed, using fallback:', e);
        }
      }

      // Priority 3: Fallback planner
      const fallback = generateFallbackCustomSessionPlan(prompt);
      return res.json(fallback);
    } catch (e) {
      console.error('API generate-session error:', e);
      const { prompt } = req.body;
      const fallback = generateFallbackCustomSessionPlan(prompt || '');
      return res.json(fallback);
    }
  });

  // 5. Vision Endpoint for camera photo extraction directly producing Structured Actions
  app.post('/api/vision', async (req, res) => {
    try {
      const { imageBase64, session } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Thiếu dữ liệu ảnh base64' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const ai = getGeminiClient();

      if (!ai) {
        const actions: AgentAction[] = [
          {
            type: 'ADD_FACT',
            payload: {
              category: 'requirement',
              title: 'Tài liệu đã quét',
              value: 'Đã lưu ảnh tài liệu thành công',
            },
          },
        ];
        return res.json({
          reply: 'Lovira đã ghi nhận ảnh tài liệu vào danh sách thông tin quan trọng.',
          actions,
        });
      }

      const visionPrompt = `Bạn là Lovira Agent đang đọc ảnh chụp (phiếu khám, số thứ tự, đơn thuốc, hoá đơn, hoặc giấy tờ hành chính) trong phiên "${session?.title || 'Hiện tại'}".

Trích xuất thông tin quan trọng và trả về DUY NHẤT JSON đúng cấu trúc sau:
{
  "reply": "Trích xuất ngắn gọn những gì đọc được từ ảnh",
  "actions": [
    {
      "type": "ADD_FACT",
      "payload": {
        "category": "location | requirement | person | time | date | instruction | warning",
        "title": "Tiêu đề ngắn (VD: Số thứ tự / Phòng khám / Bác sĩ)",
        "value": "Giá trị trích xuất được"
      }
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              { text: visionPrompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text || '';
      try {
        const result = JSON.parse(text);
        return res.json({
          reply: (result.reply || 'Đã đọc thông tin từ ảnh.').replace(/\*\*/g, ''),
          actions: Array.isArray(result.actions) ? result.actions : [],
        });
      } catch (err) {
        return res.json({
          reply: `Lovira đã đọc được từ ảnh: ${text.slice(0, 150).replace(/\*\*/g, '')}`,
          actions: [
            {
              type: 'ADD_FACT',
              payload: {
                category: 'instruction',
                title: 'Trích xuất từ ảnh',
                value: text.slice(0, 150).replace(/\*\*/g, ''),
              },
            },
          ],
        });
      }
    } catch (e) {
      console.error('Vision extraction error:', e);
      res.json({
        reply: 'Đã lưu ảnh vào danh sách tài nguyên phiên.',
        actions: [],
      });
    }
  });

  // 6. Vite Middleware for development / Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lovira Life Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
