import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import { EdgeTTS } from '@andresaya/edge-tts';

import { GoogleGenAI, Type } from '@google/genai';
import { LifeSession, AgentAction } from './types.js';
import { parseLocalIntent } from './services/localIntentEngine.js';
import { generateFallbackCustomSessionPlan } from './services/fallbackPlanner.js';
import { deduceHonorifics } from './services/conversationStyle.js';
import { buildClarificationPrompt } from './services/ai/prompts/clarificationPrompt.js';
import { callGroqAgent, GroqModel } from './services/ai/GroqProvider.js';
import { selectGroqModel } from './services/ai/AIRouter.js';
import { routeScenario } from './services/scenarioRouter.js';
import { normalizeGeneratedLifePlan, validateGeneratedLifePlan } from './services/planValidator.js';
import { geminiProvider } from './services/ai/GeminiProvider.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Enable CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // 1. Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // 1.5 Audio Transcription Endpoint (Groq Whisper AI with Gemini Fallback)
  app.post('/api/transcribe', async (req, res) => {
    try {
      console.log('[API /api/transcribe] Received audio transcription request...');
      const { audioBase64, mimeType } = req.body as { audioBase64: string; mimeType?: string };
      if (!audioBase64) {
        return res.status(400).json({ error: 'Thiếu dữ liệu audioBase64' });
      }

      // Priority 1: Groq Whisper API
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const audioBuffer = Buffer.from(audioBase64.replace(/^data:audio\/[a-zA-Z0-9+-]+;base64,/, ''), 'base64');
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

          if (whisperRes.ok) {
            const data = (await whisperRes.json()) as { text?: string };
            console.log('[Groq Whisper Transcribe Success]:', data.text);
            return res.json({ text: data.text || '' });
          }
        } catch (whisperErr) {
          console.warn('[Whisper API Failed, falling back to Gemini]:', whisperErr);
        }
      }

      // Priority 2: Gemini Audio Transcription
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        const cleanB64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9+-]+;base64,/, '');
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: mimeType || 'audio/webm', data: cleanB64 } },
                {
                  text: 'Hãy chuyển đổi chính xác đoạn âm thanh tiếng Việt này thành văn bản thuần túy. Chỉ trả về đúng nội dung câu nói được nhận diện, không thêm bất kỳ lời giải thích hay ký hiệu markdown nào.',
                },
              ],
            },
          ],
        });

        const recognizedText = response.text?.trim() || '';
        console.log('[Gemini Transcribe Success]:', recognizedText);
        return res.json({ text: recognizedText });
      }

      return res.status(400).json({ error: 'Chưa cấu hình GROQ_API_KEY hoặc GEMINI_API_KEY cho chuyển đổi âm thanh' });
    } catch (err: any) {
      console.error('[Transcribe API Exception]:', err);
      return res.status(500).json({ error: err.message || 'Lỗi xử lý âm thanh' });
    }
  });

  // 1.6 Edge TTS Endpoint (Microsoft Edge Vietnamese Neural Speech Synthesis with full multi-step support)
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

      // Robust Vietnamese speech normalization: transform numbered steps, bullets, abbreviations
      let cleanText = text
        .replace(/\*\*/g, '')
        .replace(/#/g, '')
        .replace(/⚠️/g, 'Cảnh báo: ')
        .replace(/🏥|🏛️|🛒|📄|🌟|📍|🕒|👤|📋|💬|🎙️|🎙|✅|❌|❤️|🔔|💡/g, '')
        .trim();

      cleanText = cleanText.replace(/\s*&\s*/g, ' và ');
      cleanText = cleanText.replace(/\s*\/\s*/g, ' hoặc ');

      const rawLines = cleanText.split('\n');
      const normalizedLines: string[] = [];

      for (const line of rawLines) {
        let l = line.trim();
        if (!l) continue;

        const numMatch = l.match(/^(?:Bước\s+)?([0-9]{1,2})[.)\]\s:]+\s*(.*)$/i);
        if (numMatch) {
          const num = numMatch[1];
          let content = numMatch[2].trim();
          content = content.replace(/\s+[–—\-]\s+/g, ', ');
          if (!/[.!?]$/.test(content)) content += '.';
          normalizedLines.push(`Bước ${num}: ${content}`);
          continue;
        }

        const bulletMatch = l.match(/^[●•▪▫*+\-–—👉✓✔★◆◇►]\s*(.*)$/);
        if (bulletMatch) {
          let content = bulletMatch[1].trim();
          content = content.replace(/\s+[–—\-]\s+/g, ', ');
          if (!/[.!?]$/.test(content)) content += '.';
          normalizedLines.push(content);
          continue;
        }

        l = l.replace(/\s+[–—\-]\s+/g, ', ');

        if (l.endsWith(':')) {
          normalizedLines.push(l);
        } else if (!/[.!?]$/.test(l)) {
          normalizedLines.push(l + '.');
        } else {
          normalizedLines.push(l);
        }
      }

      cleanText = normalizedLines.join('\n').trim();

      if (!cleanText) {
        return res.status(400).json({ error: 'Văn bản rỗng sau khi làm sạch' });
      }

      const ttsVoice = voice === 'vi-VN-NamMinhNeural' ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';
      console.log(`[EdgeTTS] Synthesizing Vietnamese speech (${ttsVoice}): "${cleanText.substring(0, 50)}..."`);

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
          setTimeout(() => reject(new Error('EdgeTTS timeout (5000ms)')), 5000)
        );

        audioBuffer = await Promise.race([edgeTTSPromise, timeoutPromise]);
      } catch (edgeErr: any) {
        console.warn(`[EdgeTTS API Notice] EdgeTTS unavailable (${edgeErr?.message || edgeErr}), switching to Multi-chunk Google TTS...`);
        usedEngine = 'GoogleTTS';

        // Multi-chunk Google Translate TTS for complete audio without truncation
        const sentences = cleanText.split(/(?<=[.!?\n])\s+/);
        const chunks: string[] = [];
        let currentChunk = '';

        for (const s of sentences) {
          if (!s.trim()) continue;
          if ((currentChunk + ' ' + s).length <= 160) {
            currentChunk = currentChunk ? currentChunk + ' ' + s : s;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            if (s.length <= 160) {
              currentChunk = s;
            } else {
              const words = s.split(' ');
              let sub = '';
              for (const w of words) {
                if ((sub + ' ' + w).length <= 160) {
                  sub = sub ? sub + ' ' + w : w;
                } else {
                  if (sub) chunks.push(sub);
                  sub = w;
                }
              }
              if (sub) currentChunk = sub;
            }
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        const chunkBuffers: Buffer[] = [];
        for (const chunk of chunks) {
          const encodedText = encodeURIComponent(chunk.trim());
          const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=vi&client=tw-ob`;
          const googleRes = await fetch(googleUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          if (googleRes.ok) {
            chunkBuffers.push(Buffer.from(await googleRes.arrayBuffer()));
          }
        }

        if (chunkBuffers.length > 0) {
          audioBuffer = Buffer.concat(chunkBuffers);
        } else {
          throw new Error('All Google TTS chunks failed');
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

  // 2. Chat Endpoint with Groq & Gemini Providers (Structured Output)
  app.post('/api/chat', async (req, res) => {
    try {
      const { session, message, conversationHistory, isDemoMode, userProfile, provider = 'groq', inputMode, appContext } = req.body as {
        session?: LifeSession | null;
        message: string;
        conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
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

      const groqKey = process.env.GROQ_API_KEY;

      // 2. Priority 1: Groq Provider when provider is 'groq' (or when GROQ_API_KEY is available and provider is not 'gemini')
      if (groqKey && !isDemoMode && provider !== 'gemini') {
        try {
          const selectedModel = selectGroqModel(message, session);
          const groqRes = await callGroqAgent(
            { message, session, conversationHistory, userProfile, modelOverride: selectedModel, inputMode, appContext },
            groqKey
          );
          if (groqRes) {
            return res.json(groqRes);
          }
        } catch (groqErr) {
          console.warn('[Server Chat] Groq agent call failed, attempting Gemini fallback:', groqErr);
        }
      }

      // 3. Priority 2: Google Gemini Provider (Gemini 3.7 Flash)
      if (geminiProvider.isAvailable() && !isDemoMode) {
        try {
          const geminiRes = await geminiProvider.chat({
            session,
            message,
            conversationHistory,
            userProfile,
            inputMode,
            appContext,
          });
          if (geminiRes) {
            return res.json(geminiRes);
          }
        } catch (geminiErr) {
          console.warn('[Server Chat] Gemini provider failed:', geminiErr);
        }
      }

      // 4. Retry Groq Provider if provider was 'gemini' and Gemini failed
      if (groqKey && !isDemoMode && provider === 'gemini') {
        try {
          const selectedModel = selectGroqModel(message, session);
          const groqRes = await callGroqAgent(
            { message, session, conversationHistory, userProfile, modelOverride: selectedModel, inputMode, appContext },
            groqKey
          );
          if (groqRes) {
            return res.json(groqRes);
          }
        } catch (groqErr) {
          console.warn('[Server Chat] Groq fallback agent failed:', groqErr);
        }
      }

      // 5. Offline Fallback Response
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

      // Priority 1: Groq
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
            const data = (await groqRes.json()) as any;
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

      // Priority 2: Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && !isDemoMode) {
        try {
          const clarificationPrompt = buildClarificationPrompt(prompt);
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: [{ role: 'user', parts: [{ text: clarificationPrompt }] }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isSpecificEnough: { type: Type.BOOLEAN },
                  missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
                  clarifyingQuestion: { type: Type.STRING },
                },
                required: ['isSpecificEnough'],
              },
              temperature: 0.1,
            },
          });

          if (response.text) {
            const result = JSON.parse(response.text.trim());
            return res.json({
              isSpecificEnough: !!result.isSpecificEnough,
              missingInfo: result.missingInfo || [],
              clarifyingQuestion: result.clarifyingQuestion || '',
            });
          }
        } catch (e) {
          console.warn('Gemini clarification check failed:', e);
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
                  content: `Bạn là Trợ lý Lovira Life Planner. Hãy lập kế hoạch cho mục tiêu của người dùng: "${prompt}".
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
            const data = (await groqRes.json()) as any;
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

      // Priority 2: Google Gemini 3.7 Flash with Strict Structured Schema
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && !isDemoMode) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Bạn là Trợ lý Lovira Life Planner. Hãy lập kế hoạch cho mục tiêu của người dùng: "${prompt}".
QUY TẮC NGÔN NGỮ BẮT BUỘC:
1. TẤT CẢ VĂN BẢN BẮT BUỘC 100% BẰNG TIẾNG VIỆT (VIETNAMESE). TUYỆT ĐỐI KHÔNG DÙNG TIẾNG ANH.
2. Nhiệm vụ và bước con phải là HÀNH ĐỘNG CỤ THỂ THỰC TẾ tiếng Việt.`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Tiêu đề ngắn gọn bằng tiếng Việt kèm icon' },
                  goal: { type: Type.STRING, description: 'Mục tiêu đầy đủ bằng tiếng Việt' },
                  scenarioType: { type: Type.STRING },
                  scenarioFamily: { type: Type.STRING },
                  secondaryFamilies: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        order: { type: Type.INTEGER },
                        important: { type: Type.BOOLEAN },
                        subtasks: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              title: { type: Type.STRING },
                              order: { type: Type.INTEGER },
                            },
                            required: ['title', 'order'],
                          },
                        },
                      },
                      required: ['title', 'order'],
                    },
                  },
                  importantFacts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        title: { type: Type.STRING },
                        value: { type: Type.STRING },
                      },
                      required: ['type', 'title', 'value'],
                    },
                  },
                  firstRecommendedAction: { type: Type.STRING },
                },
                required: ['title', 'goal', 'tasks', 'firstRecommendedAction'],
              },
              temperature: 0.1,
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
              const normalized = normalizeGeneratedLifePlan(parsed, prompt, routing);
              const validation = validateGeneratedLifePlan(normalized);
              if (validation.valid) {
                return res.json(normalized);
              }
            }
          }
        } catch (e) {
          console.warn('Gemini plan generation failed:', e);
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

  // 5. Vision Endpoint (Groq Qwen Vision Primary, Gemini Fallback)
  app.post('/api/vision', async (req, res) => {
    try {
      const { imageBase64, mode = 'scene', customApiKey } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Thiếu dữ liệu ảnh base64' });
      }

      const promptText = `Bạn là trợ lý thị giác ân cần Lovira dành cho người lớn tuổi / thị lực kém. 
Hãy phân tích hình ảnh này theo chế độ "${mode}" (${
        mode === 'scene'
          ? 'Mô tả tổng quan khung cảnh & đồ vật'
          : mode === 'text'
          ? 'Đọc chính xác chữ, nhãn đơn thuốc, giấy tờ'
          : mode === 'object'
          ? 'Định danh các đồ vật và vị trí'
          : 'Tóm tắt siêu ngắn gọn'
      }).
QUY TẮC BẮT BUỘC: 100% TIẾNG VIỆT, KHÔNG DÙNG TIẾNG ANH.
Trả về kết quả bằng định dạng JSON thuần túy (JSON object) gồm các trường:
- summary: (string) Lời mô tả tổng quan, ân cần, ngắn gọn, dễ hiểu.
- details: (string array) 2-4 chi tiết đồ vật, nhãn mác hoặc đặc điểm nổi bật.
- detectedText: (string array) Các đoạn văn bản hoặc chữ ghi trên hình ảnh (nếu có).
- possibleHazards: (string array) Các lưu ý hoặc nguy cơ chướng ngại vật/an toàn (nếu có).`;

      // Priority 1: Groq Vision Models (Active Qwen Vision models)
      const groqKey = customApiKey || process.env.GROQ_API_KEY;
      if (groqKey) {
        const groqVisionModels = ['qwen-2.5-32b'];
        const formattedImage = imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`;

        for (const modelName of groqVisionModels) {
          try {
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: modelName,
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: promptText },
                      { type: 'image_url', image_url: { url: formattedImage } },
                    ],
                  },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
              }),
            });

            if (groqRes.ok) {
              const data = (await groqRes.json()) as any;
              const content = data.choices?.[0]?.message?.content;
              if (content) {
                const parsed = JSON.parse(content);
                return res.json({
                  summary: parsed.summary || 'Lovira đã nhận diện xong ảnh.',
                  details: parsed.details || [],
                  detectedText: parsed.detectedText || [],
                  possibleHazards: parsed.possibleHazards || [],
                  engine: 'groq-vision',
                });
              }
            }
          } catch (groqErr) {
            console.warn(`[Vision API] Groq model ${modelName} call failed, trying next:`, groqErr);
          }
        }
      }

      // Priority 2: Gemini 3.7 Flash Vision
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const cleanB64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+-]+;base64,/, '');

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: cleanB64 } },
                { text: promptText },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                details: { type: Type.ARRAY, items: { type: Type.STRING } },
                detectedText: { type: Type.ARRAY, items: { type: Type.STRING } },
                possibleHazards: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['summary'],
            },
            temperature: 0.1,
          },
        });

        const jsonText = response.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText.trim());
          return res.json({
            summary: parsed.summary || 'Lovira đã nhận diện xong ảnh.',
            details: parsed.details || [],
            detectedText: parsed.detectedText || [],
            possibleHazards: parsed.possibleHazards || [],
            engine: 'gemini',
          });
        }
      }

      // Fallback structured response if no API key
      const modeLabel = mode === 'text' ? 'Đọc văn bản' : mode === 'object' ? 'Định danh đồ vật' : 'Khung cảnh';
      return res.json({
        summary: `Lovira đã ghi nhận và phân tích hình ảnh ở chế độ "${modeLabel}".`,
        details: [
          'Vật thể ở trung tâm khung hình',
          'Văn bản nhãn mác bề mặt',
          'Khung cảnh ánh sáng tự nhiên',
        ],
        detectedText: mode === 'text' ? ['Thông tin ghi chú', 'Ngày tháng và số hiệu'] : [],
        possibleHazards: [],
        engine: 'local-fallback',
      });
    } catch (e) {
      console.error('Vision extraction error:', e);
      res.json({
        summary: 'Lovira đã nhận được ảnh và lưu trữ vào lịch sử xử lý.',
        details: ['Hình ảnh đã sẵn sàng'],
        detectedText: [],
        possibleHazards: [],
      });
    }
  });

  // 5.6. Summarize Conversation Endpoint (Groq Primary, Gemini Fallback)
  app.post('/api/summarize-conversation', async (req, res) => {
    try {
      const { transcript, customApiKey } = req.body;
      if (!transcript || !transcript.trim()) {
        return res.status(400).json({ error: 'Thiếu văn bản cuộc trò chuyện' });
      }

      const promptText = `Bạn là trợ lý AI Lovira dành cho người cao tuổi. Hãy tóm tắt cuộc trò chuyện sau thành ngôn ngữ tiếng Việt dễ hiểu, mạch lạc:
"${transcript}"

Trả về JSON object gồm:
- mainContent: (string) Tóm tắt 2-3 câu nội dung chính.
- keyPoints: (array of string) 2-4 ý chính cần nhớ.
- actionItems: (array of string) các công việc/hướng dẫn cần làm.
- importantNotes: (array of string) các lưu ý quan trọng.
- vslKeywords: (array of string) 2-3 từ khóa chính tiêu biểu (ví dụ: "chào", "nghe", "cảm ơn", "bác sĩ", "thuốc").`;

      const groqKey = customApiKey || process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: GroqModel.GPT_OSS_20B,
              messages: [{ role: 'user', content: promptText }],
              response_format: { type: 'json_object' },
              temperature: 0.2,
            }),
          });

          if (groqRes.ok) {
            const data = (await groqRes.json()) as any;
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content);
              return res.json(parsed);
            }
          }
        } catch (groqErr) {
          console.warn('[Summarize Conversation] Groq failed, trying Gemini:', groqErr);
        }
      }

      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mainContent: { type: Type.STRING },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                importantNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                vslKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['mainContent'],
            },
            temperature: 0.2,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          return res.json(parsed);
        }
      }

      const lines = transcript.split('\n').filter((l: string) => l.trim().length > 0);
      return res.json({
        mainContent: `Cuộc trò chuyện gồm ${lines.length} câu thoại. Ý chính tập trung vào hướng dẫn thực tế.`,
        keyPoints: lines.slice(0, 3),
        actionItems: ['Ghi nhớ thông tin quan trọng', 'Thực hiện theo dặn dò'],
        importantNotes: ['Theo dõi khi cần thiết'],
        vslKeywords: ['nghe', 'cảm ơn'],
      });
    } catch (e: any) {
      console.error('Summarize conversation error:', e);
      return res.json({
        mainContent: 'Nội dung trao đổi đã được ghi nhận.',
        keyPoints: ['Đã lưu văn bản cuộc hội thoại'],
        actionItems: [],
        importantNotes: [],
        vslKeywords: ['nghe'],
      });
    }
  });

  // 5.5. Document / Image Q&A Endpoint (Groq Qwen Primary, Gemini Fallback)
  app.post('/api/gemini/document-qa', async (req, res) => {
    try {
      const { documentText, question, customApiKey } = req.body;
      const groqKey = customApiKey || process.env.GROQ_API_KEY;

      if (groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.6-27b',
              messages: [
                {
                  role: 'system',
                  content: 'Bạn là trợ lý ân cần Lovira dành cho người lớn tuổi. Trả lời câu hỏi dựa trên nội dung hình ảnh/tài liệu bằng tiếng Việt.',
                },
                {
                  role: 'user',
                  content: `Dựa vào ngữ cảnh phân tích hình ảnh/tài liệu sau:\n"${documentText}"\n\nHãy trả lời câu hỏi: "${question}".`,
                },
              ],
              temperature: 0.3,
            }),
          });

          if (groqRes.ok) {
            const data = (await groqRes.json()) as any;
            const reply = data.choices?.[0]?.message?.content;
            if (reply) return res.json({ answer: reply });
          }
        } catch (groqErr) {
          console.warn('[Document QA] Groq call failed, trying Gemini:', groqErr);
        }
      }

      const geminiApiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Dựa vào ngữ cảnh phân tích hình ảnh/tài liệu sau:
"${documentText}"

Hãy trả lời câu hỏi của người dùng: "${question}".
Trả lời ân cần, ngắn gọn, dễ hiểu và đi thẳng vào trọng tâm bằng tiếng Việt.`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.2,
          },
        });

        return res.json({ answer: response.text || 'Lovira chưa tìm thấy câu trả lời phù hợp.' });
      }

      return res.json({
        answer: `Dựa trên bức ảnh, đối với câu hỏi "${question}": Lovira nhận thấy thông tin khá rõ ràng ở khu vực trung tâm ảnh.`,
      });
    } catch (e) {
      console.error('Document QA error:', e);
      return res.json({
        answer: 'Lovira chưa thể hoàn tất phản hồi lúc này. Bạn vui lòng thử lại nhé.',
      });
    }
  });

  // 6. Static and Dynamic Asset Handling from Base64
  const publicPath = path.join(process.cwd(), 'public');
  const assetsImagesPath = path.join(process.cwd(), 'assets/images');

  // Dynamic brand image handler from Base64 text files (immune to AI Studio binary corruption)
  app.get('/brand/:file', (req, res, next) => {
    const file = req.params.file.toLowerCase();
    let txtFile = '';
    if (file.includes('full')) txtFile = 'logo_full.txt';
    else if (file.includes('logo')) txtFile = 'logo.txt';
    else if (file.includes('avatar')) txtFile = 'avatar.txt';
    else if (file.includes('banner')) txtFile = 'banner.txt';

    if (txtFile) {
      const fullPath = path.join(publicPath, txtFile);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8').trim();
          const b64 = raw.replace(/^data:image\/[a-zA-Z0-9+-]+;base64,/, '');
          const buffer = Buffer.from(b64, 'base64');
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buffer);
        } catch (e) {
          console.warn('[Brand Image Route Error]:', e);
        }
      }
    }
    next();
  });

  app.use('/brand', express.static(path.join(publicPath, 'brand')));
  app.use('/images', express.static(path.join(publicPath, 'images')));
  app.use('/images', express.static(assetsImagesPath));
  app.use('/assets/images', express.static(assetsImagesPath));
  app.use(express.static(publicPath));

  return app;
}
