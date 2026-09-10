import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body parser limit for base64 image snapshots
app.use(express.json({ limit: '20mb' }));

// Helper to convert URL or DataURL to base64 buffer for Gemini
async function getImageBase64AndMime(input: string): Promise<{ data: string; mimeType: string } | null> {
  if (!input) return null;

  if (input.startsWith('data:')) {
    const matches = input.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return {
        mimeType: matches[1],
        data: matches[2]
      };
    }
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const resp = await fetch(input);
      if (!resp.ok) return null;
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      return {
        mimeType: contentType.split(';')[0],
        data: buffer.toString('base64')
      };
    } catch (err) {
      console.warn('Failed to fetch image URL for Gemini verification:', err);
      return null;
    }
  }

  return null;
}

// AI Biometric Face Comparison Endpoint
app.post('/api/verify-face', async (req, res) => {
  try {
    const { employeeName, masterPhoto, livePhoto } = req.body;

    if (!masterPhoto || !livePhoto) {
      return res.status(400).json({
        matched: false,
        confidence: 0,
        reasoning: 'ข้อมูลภาพใบหน้าต้นแบบหรือภาพสแกนไม่ครบถ้วน'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Fallback to client-side descriptor matching.');
      return res.status(503).json({
        matched: false,
        fallbackToClient: true,
        reasoning: 'GEMINI_API_KEY missing'
      });
    }

    const masterImg = await getImageBase64AndMime(masterPhoto);
    const liveImg = await getImageBase64AndMime(livePhoto);

    if (!masterImg || !liveImg) {
      return res.json({
        matched: false,
        fallbackToClient: true,
        reasoning: 'ไม่สามารถโหลดภาพเพื่อส่งไปตรวจด้วย Gemini AI ได้'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `คุณคือระบบตรวจพิสูจน์อัตลักษณ์ชีวมิติ (Biometric Face Verification Engine) สำหรับการลงเวลาเข้า-ออกงานของพนักงาน

ภาพที่ 1: คือ ภาพถ่ายใบหน้าต้นแบบที่ลงทะเบียนไว้ในระบบของพนักงานชื่อ "${employeeName || 'พนักงาน'}"
ภาพที่ 2: คือ ภาพถ่ายสดจากกล้องขณะสแกนลงเวลาตอนนี้

โปรดวิเคราะห์โครงสร้างใบหน้า (Facial Features, Eye/Nose/Mouth Alignment, Jawline Structure):
1. ตรวจสอบว่าภาพที่ 2 เป็นพนักงาน **คนเดียวกับ** ภาพที่ 1 หรือไม่?
2. หากหน้ากล้องเป็นเพื่อนหรือคนอื่นสแกนแทน ให้ระบุ matched = false อย่างเด็ดขาด!
3. หากเป็นพนักงานคนเดียวกัน (แม้จะเปลี่ยนทรงผม สวมแว่นตา หรือแสงแตกต่างกัน) ให้ระบุ matched = true

ตอบกลับในรูปแบบ JSON เท่านั้น:
{
  "matched": boolean,
  "confidence": number, // ค่าความมั่นใจ 0 - 100
  "reasoning": "คำอธิบายสั้นๆ ภาษาไทย เช่น 'โครงสร้างใบหน้าตรงกับพนักงานลงทะเบียน' หรือ 'ใบหน้าไม่ตรงกับพนักงานเจ้าของบัญชี ไม่อนุญาตให้สแกนแทนกัน'"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: masterImg.mimeType,
                data: masterImg.data
              }
            },
            {
              inlineData: {
                mimeType: liveImg.mimeType,
                data: liveImg.data
              }
            },
            { text: promptText }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    let parsedResult = {
      matched: false,
      confidence: 0,
      reasoning: 'ไม่สามารถประมวลผลคำตอบจาก AI ได้'
    };

    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      console.warn('Could not parse Gemini JSON response:', responseText);
    }

    return res.json(parsedResult);
  } catch (error: any) {
    console.error('API /api/verify-face error:', error);
    return res.status(500).json({
      matched: false,
      fallbackToClient: true,
      reasoning: 'เกิดข้อผิดพลาดในการตรวจสอบใบหน้าผ่าน AI'
    });
  }
});

async function startServer() {
  // Vite middleware for development
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
