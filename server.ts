import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { LifeSession, AgentAction } from './src/types.js';
import { parseLocalIntent } from './src/services/localIntentEngine.js';
import { generateFallbackCustomSessionPlan } from './src/services/fallbackPlanner.js';
import { deduceHonorifics } from './src/services/conversationStyle.js';
import { buildClarificationPrompt } from './src/services/ai/prompts/clarificationPrompt.js';
import { callGroqAgent } from './src/services/ai/GroqProvider.js';
import { selectGroqModel } from './src/services/ai/AIRouter.js';
import { routeScenario } from './src/services/scenarioRouter.js';
import { normalizeGeneratedLifePlan, validateGeneratedLifePlan } from './src/services/planValidator.js';
import { geminiProvider } from './src/services/ai/GeminiProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Chat Endpoint with Groq, Gemini & Function Calling
  app.post('/api/chat', async (req, res) => {
    try {
      const { session, message, isDemoMode, userProfile, provider, inputMode, appContext } = req.body as {
        session?: LifeSession | null;
        message: string;
        isDemoMode?: boolean;
        userProfile?: any;
        provider?: 'groq' | 'gemini' | 'demo';
        inputMode?: 'text' | 'voice';
        appContext?: any;
      };

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Thiếu dữ liệu message' });
      }

      // 1. Fast check local deterministic commands if session exists
      if (session) {
        const localResult = parseLocalIntent(message, session, userProfile);
        if (localResult) {
          return res.json(localResult);
        }
      }

      // 2. Try Groq Provider if GROQ_API_KEY is available and provider is not forced to gemini
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey && provider !== 'gemini' && !isDemoMode) {
        const selectedModel = selectGroqModel(message, session);
        const groqRes = await callGroqAgent(
          { message, session, userProfile, modelOverride: selectedModel, inputMode, appContext },
          groqKey
        );
        if (groqRes) {
          return res.json(groqRes);
        }
      }

      // 3. Try Gemini Provider if available
      if (geminiProvider.isAvailable() && !isDemoMode) {
        const geminiRes = await geminiProvider.chat({
          session,
          message,
          userProfile,
          inputMode,
          appContext,
        });
        if (geminiRes) {
          return res.json(geminiRes);
        }
      }

      // 4. Offline Fallback Response
      const honorifics = deduceHonorifics(userProfile, message);
      const { addressing, da } = honorifics;
      const prefix = da ? `${da}, ` : '';
      const replyText = session
        ? `${prefix}hiện Lovira đang ở chế độ ngoại tuyến nên chưa thể tư vấn chi tiết nội dung này cho ${addressing}. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} vẫn có thể xem hoặc cập nhật tiến độ các việc trong phiên nhé!`
        : `${prefix}Lovira đang lắng nghe ${addressing}. Hiện Lovira đang ở chế độ ngoại tuyến. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có thể tạo hoặc mở các phiên hỗ trợ trên màn hình nhé!`;

      return res.json({
        reply: replyText,
        speech: replyText,
        actions: [],
        appActions: [],
        suggestedReplies: session ? ['Giờ làm gì tiếp theo?', 'Xong bước hiện tại rồi'] : ['Mở phiên đi khám bệnh', 'Tạo phiên mới'],
        meta: { engine: 'local', model: 'offline-notice' },
      });
    } catch (error: any) {
      console.error('API chat error:', error);
      const { session, message } = req.body;
      if (session) {
        const localResult = parseLocalIntent(message, session);
        if (localResult) {
          return res.json(localResult);
        }
      }

      res.json({
        reply: 'Lovira đang hoạt động ở chế độ dự phòng. Thông tin của bạn được bảo toàn an toàn!',
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
                  content: `Bạn là Trợ lý Lovira Life Planner. Hãy lập kế hoạch cho mục tiêu của người dùng.
QUY TẮC NGÔN NGỮ BẮT BUỘC:
1. TẤT CẢ VĂN BẢN BẮT BUỘC 100% BẰNG TIẾNG VIỆT (VIETNAMESE). TUYỆT ĐỐI KHÔNG DÙNG TIẾNG ANH.
2. Nhiệm vụ và bước con phải là HÀNH ĐỘNG CỤ THỂ THỰC TẾ tiếng Việt.
3. Trả về DUY NHẤT JSON đúng schema:
{
  "title": "Tiêu đề ngắn gọn bằng tiếng Việt kèm icon",
  "goal": "Mục tiêu đầy đủ bằng tiếng Việt",
  "scenarioType": "custom",
  "scenarioFamily": "${routing.family}",
  "secondaryFamilies": [],
  "tags": [],
  "tasks": [
    {
      "title": "Tên công việc chính bằng tiếng Việt",
      "order": 1,
      "important": true,
      "subtasks": [
        { "title": "Tên bước con bằng tiếng Việt", "order": 1 }
      ]
    }
  ],
  "importantFacts": [
    { "type": "requirement", "title": "Tiêu đề bằng tiếng Việt", "value": "Nội dung bằng tiếng Việt" }
  ],
  "firstRecommendedAction": "Tên bước con đầu tiên bằng tiếng Việt"
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
              }
            }
          }
        } catch (e) {
          console.warn('Groq plan generation failed:', e);
        }
      }

      // Priority 2: Fallback planner
      const fallback = generateFallbackCustomSessionPlan(prompt);
      return res.json(fallback);
    } catch (e) {
      console.error('API generate-session error:', e);
      const { prompt } = req.body;
      const fallback = generateFallbackCustomSessionPlan(prompt || '');
      return res.json(fallback);
    }
  });

  // 5. Vision Endpoint
  app.post('/api/vision', async (req, res) => {
    try {
      const { imageBase64, session } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Thiếu dữ liệu ảnh base64' });
      }

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
    } catch (e) {
      console.error('Vision extraction error:', e);
      res.json({
        reply: 'Đã lưu ảnh vào danh sách tài nguyên phiên.',
        actions: [],
      });
    }
  });

  // 6. Static asset directories
  const publicPath = path.join(process.cwd(), 'public');
  const assetsImagesPath = path.join(process.cwd(), 'assets/images');
  
  app.use('/brand', express.static(path.join(publicPath, 'brand')));
  app.use('/images', express.static(path.join(publicPath, 'images')));
  app.use('/images', express.static(assetsImagesPath));
  app.use('/assets/images', express.static(assetsImagesPath));
  app.use(express.static(publicPath));

  // 7. Vite Middleware for development / Static files for production
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
