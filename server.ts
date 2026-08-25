import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';

import { createApp } from './src/serverApp.js';

export { createApp };

async function startServer() {
  console.log('[Server Init] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
  console.log('[Server Init] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

  const app = createApp();
  const PORT = 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lovira Life Server running on http://0.0.0.0:${PORT}`);
  });

  // Vite Middleware for development / Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(expressStaticFallback(distPath));
  }

  // Real-time WebSocket Speech Streaming Endpoint
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

function expressStaticFallback(distPath: string) {
  const express = require('express');
  const app = express();
  app.use(express.static(distPath));
  app.get('*', (req: any, res: any) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  return app;
}

startServer();
