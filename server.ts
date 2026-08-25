import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';

import { LifeSession, AgentAction } from './src/types.js';
import { parseLocalIntent } from './src/services/localIntentEngine.js';
import { generateFallbackCustomSessionPlan } from './src/services/fallbackPlanner.js';
import { deduceHonorifics } from './src/services/conversationStyle.js';
import { buildClarificationPrompt } from './src/services/ai/prompts/clarificationPrompt.js';
import { callGroqAgent, GroqModel } from './src/services/ai/GroqProvider.js';
import { selectGroqModel } from './src/services/ai/AIRouter.js';
import { routeScenario } from './src/services/scenarioRouter.js';
import { normalizeGeneratedLifePlan, validateGeneratedLifePlan } from './src/services/planValidator.js';
import { geminiProvider } from './src/services/ai/GeminiProvider.js';
import { EdgeTTS } from '@andresaya/edge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  dotenv.config();
  console.log('[Server Init] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1.5 Audio Transcription Endpoint (Groq Whisper AI Fallback for Voice Input)
  app.post('/api/transcribe', async (req, res) => {
    try {
      console.log('[API /api/transcribe] Received audio transcription request...');
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        console.warn('[API /api/transcribe] GROQ_API_KEY is missing');
        return res.status(400).json({ error: 'Chưa cấu hình GROQ_API_KEY' });
      }

      const { audioBase64, mimeType } = req.body as { audioBase64: string; mimeType?: string };
      if (!audioBase64) {
        return res.status(400).json({ error: 'Thiếu dữ liệu audioBase64' });
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const filename = 'recording.webm';

      const multipartBuffer = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${
            mimeType || 'audio/webm'
          }\r\n\r\n`
        ),
        audioBuffer,
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo` +
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nvi` +
            `\r\n--${boundary}--\r\n`
        ),
      ]);

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBuffer,
      });

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        console.warn('[Whisper Transcribe Error]:', whisperRes.status, errText);
        return res.status(500).json({ error: 'Lỗi chuyển đổi giọng nói sang chữ từ Whisper API' });
      }

      const data = (await whisperRes.json()) as { text?: string };
      console.log('[Whisper Transcribe Success]:', data.text);
      return res.json({ text: data.text || '' });
    } catch (err: any) {
      console.error('[Transcribe API Exception]:', err);
      return res.status(500).json({ error: err.message || 'Lỗi xử lý âm thanh' });
    }
  });

  // 1.6 Edge TTS Endpoint (Microsoft Edge Vietnamese Neural Speech Synthesis)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voice = 'vi-VN-HoaiMyNeural', rate = '+0%', pitch = '+0Hz', format = 'base64' } = req.body as {
        text: string;
        voice?: string;
        rate?: string;
        pitch?: string;
        format?: 'mp3' | 'base64';
      };

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Thiếu văn bản cần đọc' });
      }

      // Clean text from markdown bold/bullets/emojis
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/#/g, '')
        .replace(/•/g, '')
        .replace(/⚠️/g, 'Cảnh báo:')
        .replace(/👉/g, '')
        .replace(/🏥|🏛️|🛒|📄|🌟|📍|🕒|👤|📋|💬|🎙️|🎙|✅|❌|❤️|🔔|💡/g, '')
        .trim();

      if (!cleanText) {
        return res.status(400).json({ error: 'Văn bản rỗng sau khi làm sạch' });
      }

      const ttsVoice = voice === 'vi-VN-NamMinhNeural' ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';
      console.log(`[EdgeTTS] Synthesizing Vietnamese speech (${ttsVoice}): "${cleanText.substring(0, 40)}..."`);

      let audioBuffer: Buffer | null = null;
      let usedEngine = 'EdgeTTS';

      try {
        const edgeTTSPromise = (async () => {
          const tts = new EdgeTTS();
          await tts.synthesize(cleanText, ttsVoice, {
            rate: rate || '+0%',
            pitch: pitch || '+0Hz',
          });
          return await tts.toBuffer();
        })();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('EdgeTTS timeout (4000ms)')), 4000)
        );

        audioBuffer = await Promise.race([edgeTTSPromise, timeoutPromise]);
      } catch (edgeErr: any) {
        console.warn(`[EdgeTTS API Notice] EdgeTTS unavailable or timed out (${edgeErr?.message || edgeErr}), switching to Google TTS fallback...`);
        usedEngine = 'GoogleTTS';

        // Google Translate TTS Fallback
        const encodedText = encodeURIComponent(cleanText.slice(0, 200));
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=vi&client=tw-ob`;
        const googleRes = await fetch(googleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (googleRes.ok) {
          audioBuffer = Buffer.from(await googleRes.arrayBuffer());
        } else {
          throw new Error(`Fallback Google TTS failed with status ${googleRes.status}`);
        }
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Failed to generate audio buffer from both EdgeTTS and GoogleTTS');
      }

      if (format === 'base64') {
        const audioBase64 = audioBuffer.toString('base64');
        return res.json({
          audioBase64: `data:audio/mp3;base64,${audioBase64}`,
          voice: usedEngine === 'EdgeTTS' ? ttsVoice : 'Google-vi-VN',
          engine: usedEngine,
          mimeType: 'audio/mp3',
        });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);
    } catch (err: any) {
      console.error('[TTS API Error]:', err?.message || err);
      return res.status(500).json({ error: err.message || 'Lỗi đọc giọng nói TTS' });
    }
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
        try {
          const selectedModel = selectGroqModel(message, session);
          const groqRes = await callGroqAgent(
            { message, session, userProfile, modelOverride: selectedModel, inputMode, appContext },
            groqKey
          );
          if (groqRes) {
            return res.json(groqRes);
          }
        } catch (groqErr) {
          console.warn('[Server Chat] Groq agent failed, falling back to Gemini Provider:', groqErr);
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
              model: GroqModel.GPT_OSS_20B,
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
              model: GroqModel.GPT_OSS_20B,
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lovira Life Server running on http://0.0.0.0:${PORT}`);
  });

  // 7. Vite Middleware for development / Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
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

  // 8. Real-time WebSocket Speech Streaming Endpoint
  const wss = new WebSocketServer({ server, path: '/ws/speech' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket /ws/speech] Client connected successfully!');
    let audioChunks: Buffer[] = [];

    ws.on('message', async (data, isBinary) => {
      try {
        if (isBinary) {
          audioChunks.push(Buffer.from(data as ArrayBuffer));
        } else {
          const message = JSON.parse(data.toString());
          if (message.type === 'transcribe' || message.type === 'stop') {
            if (audioChunks.length === 0) {
              ws.send(JSON.stringify({ type: message.type === 'stop' ? 'final' : 'interim', text: '' }));
              return;
            }
            const completeAudio = Buffer.concat(audioChunks);
            const groqKey = process.env.GROQ_API_KEY;
            if (!groqKey) {
              ws.send(JSON.stringify({ type: 'error', message: 'GROQ_API_KEY missing' }));
              return;
            }

            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
            const multipartBuffer = Buffer.concat([
              Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n`
              ),
              completeAudio,
              Buffer.from(
                `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo` +
                  `\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nvi` +
                  `\r\n--${boundary}--\r\n`
              ),
            ]);

            const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${groqKey}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
              },
              body: multipartBuffer,
            });

            if (whisperRes.ok) {
              const resData = (await whisperRes.json()) as { text?: string };
              ws.send(
                JSON.stringify({
                  type: message.type === 'stop' ? 'final' : 'interim',
                  text: resData.text || '',
                })
              );
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'Whisper failed' }));
            }

            if (message.type === 'stop') {
              audioChunks = [];
            }
          } else if (message.type === 'reset') {
            audioChunks = [];
          }
        }
      } catch (err: any) {
        console.warn('[WebSocket /ws/speech Error]:', err.message);
      }
    });

    ws.on('close', () => {
      audioChunks = [];
    });
  });
}

startServer();
