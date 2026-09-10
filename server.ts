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
    const commaIndex = input.indexOf(',');
    if (commaIndex !== -1) {
      const meta = input.substring(0, commaIndex);
      const data = input.substring(commaIndex + 1).trim();
      const mimeMatch = meta.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      return { mimeType, data };
    }
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const resp = await fetch(input, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*,*/*'
        }
      });
      if (!resp.ok) {
        console.warn(`Failed to fetch image URL (status ${resp.status}): ${input.substring(0, 60)}...`);
        return null;
      }
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

// Proxy image endpoint to prevent canvas CORS taint on client side
app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      return res.status(400).send('Invalid or missing image URL');
    }

    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*'
      }
    });

    if (!resp.ok) {
      return res.status(resp.status).send('Failed to fetch remote image');
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await resp.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.warn('Proxy image error:', err);
    return res.status(500).send('Error proxying image');
  }
});

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
      return res.status(200).json({
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
        reasoning: 'ไม่สามารถโหลดภาพเพื่อส่งไปตรวจด้วย Gemini AI ได้ กำลังสลับไปใช้ระบบคำนวณชีวมิติประจำเครื่อง'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `คุณคือระบบตรวจพิสูจน์อัตลักษณ์ชีวมิติ (Biometric Face Verification Engine) สำหรับการลงเวลาเข้า-ออกงานของพนักงาน

ภาพที่ 1 (ภาพแรก): คือ ภาพถ่ายใบหน้าต้นแบบที่ลงทะเบียนไว้ในระบบของพนักงานชื่อ "${employeeName || 'พนักงาน'}"
ภาพที่ 2 (ภาพที่สอง): คือ ภาพถ่ายสดจากกล้องขณะสแกนลงเวลาตอนนี้

โปรดวิเคราะห์โครงสร้างใบหน้า (Facial Features, Eye/Nose/Mouth Alignment, Jawline Structure):
1. ตรวจสอบว่าภาพที่ 2 เป็นพนักงาน **คนเดียวกับ** ภาพที่ 1 หรือไม่?
2. หากหน้ากล้องเป็นเพื่อนหรือคนอื่นสแกนแทน ให้ระบุ matched = false อย่างเด็ดขาด!
3. หากเป็นพนักงานคนเดียวกัน (แม้จะเปลี่ยนทรงผม สวมแว่นตา แสงแตกต่างกัน หรือหน้าตรง/เอียงเล็กน้อย) ให้ระบุ matched = true
4. หากภาพต้นแบบเป็นภาพตัวอย่าง (เช่น ภาพ stock photo) และภาพสดเป็นคนจริงที่พยายามลงเวลา หากดูแล้วเป็นคนละคน ให้ matched = false พร้อมคำแนะนำภาษาไทยว่าให้กดปุ่ม "ถ่ายภาพใบหน้าจริงของฉัน เดี๋ยวนี้" เพื่ออัปเดตภาพต้นแบบก่อน

ตอบกลับในรูปแบบ JSON เท่านั้น:
{
  "matched": boolean,
  "confidence": number, // ค่าความมั่นใจ 0 - 100
  "reasoning": "คำอธิบายสั้นๆ ภาษาไทย เช่น 'โครงสร้างใบหน้าตรงกับพนักงานลงทะเบียน' หรือ 'ใบหน้าไม่ตรงกับพนักงานเจ้าของบัญชี ไม่อนุญาตให้สแกนแทนกัน'"
}`;

    const contentParts = [
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
      promptText
    ];

    let responseText = '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentParts,
        config: {
          responseMimeType: 'application/json'
        }
      });
      responseText = response.text || '';
    } catch (primaryErr) {
      console.warn('Primary model gemini-3.8-flash failed, trying gemini-flash-latest...', primaryErr);
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: contentParts,
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = fallbackResponse.text || '';
      } catch (fallbackErr) {
        console.warn('Both Gemini models failed, falling back to client-side:', fallbackErr);
        return res.json({
          matched: false,
          fallbackToClient: true,
          reasoning: 'ไม่สามารถเรียกใช้บริการ Gemini AI ได้ในขณะนี้ ระบบสลับไปใช้โหมดไบโอเมตริกประจำเครื่อง'
        });
      }
    }

    let parsedResult = {
      matched: false,
      confidence: 0,
      reasoning: 'ไม่สามารถประมวลผลคำตอบจาก AI ได้'
    };

    try {
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      parsedResult = JSON.parse(cleanText);
    } catch {
      console.warn('Could not parse Gemini JSON response:', responseText);
    }

    return res.json(parsedResult);
  } catch (error: any) {
    console.error('API /api/verify-face error:', error);
    return res.status(200).json({
      matched: false,
      fallbackToClient: true,
      reasoning: 'เกิดข้อผิดพลาดในการตรวจสอบใบหน้าผ่าน AI กำลังสลับไปใช้ระบบชีวมิติประจำเครื่อง'
    });
  }
});

// AI Face Quality, Hand Coverage & Anti-Spoofing Validation Endpoint
app.post('/api/validate-face-photo', async (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({
        valid: false,
        hasFace: false,
        isHandCoveringFace: false,
        reason: 'ไม่พบข้อมูลภาพถ่าย'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        valid: true,
        fallbackToClient: true,
        reason: 'GEMINI_API_KEY missing - delegating to client computer vision'
      });
    }

    const imgData = await getImageBase64AndMime(photoUrl);
    if (!imgData) {
      return res.json({
        valid: false,
        fallbackToClient: true,
        reason: 'ไม่สามารถโหลดรูปภาพได้'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const promptText = `คุณคือระบบตรวจจับใบหน้าและตรวจจับการบดบังใบหน้า (Facial Occlusion & Anti-Cheat Validator) สำหรับระบบสแกนใบหน้าลงเวลาทำงาน

โปรดวิเคราะห์ภาพนี้อย่างเคร่งครัดสูงสุด:
1. ภาพนี้มี "ใบหน้ามนุษย์จริง" ที่มองตรงมาที่กล้องหรือไม่?
2. มี "มือ", "นิ้วมือ", "ฝ่ามือ", หรือสิ่งของใดๆ ปิดบังใบหน้า (Hand covering face / Palm touching face / Fingers over eyes, nose, or mouth) หรือไม่?
3. มีการสวมหน้ากากอนามัย, แว่นตาดำ, หรือสิ่งปิดบังดวงตาทั้งสองข้าง จมูก หรือปากหรือไม่?

กฎการตัดสิน:
- หากตรวจพบว่ามีมือ ฝ่ามือ หรือนิ้วมือมาปิดหน้า บังตา บังปาก หรือบังจมูก -> ต้องตอบ "valid": false, "isHandCoveringFace": true, "hasFace": false และระบุ reason: "ตรวจพบมือปิดบังใบหน้า กรุณาเอามือออกจากใบหน้า เปิดเผยดวงตาทั้งสองข้าง จมูก และปากให้ชัดเจน" อย่างเด็ดขาด!
- หากไม่มีใบหน้ามนุษย์ (เช่น ถ่ายเพดาน มือเปล่า กำแพง วัตถุ) -> ต้องตอบ "valid": false, "hasFace": false, "reason": "ไม่พบใบหน้ามนุษย์ กรุณาจัดใบหน้าให้อยู่ในกรอบภาพ"
- หากใบหน้าเปิดเผยชัดเจน เห็นตาทั้งสองข้าง จมูก และปากครบถ้วน ไม่มีมือหรือสิ่งบดบัง -> ตอบ "valid": true, "isHandCoveringFace": false, "hasFace": true, "reason": "ใบหน้าชัดเจน ไม่มีสิ่งบดบัง พร้อมใช้งาน"

ตอบกลับในรูปแบบ JSON เท่านั้น:
{
  "valid": boolean,
  "hasFace": boolean,
  "isHandCoveringFace": boolean,
  "eyesVisible": boolean,
  "mouthVisible": boolean,
  "noseVisible": boolean,
  "confidence": number,
  "reason": string
}`;

    const contentParts = [
      {
        inlineData: {
          mimeType: imgData.mimeType,
          data: imgData.data
        }
      },
      promptText
    ];

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentParts,
        config: {
          responseMimeType: 'application/json'
        }
      });
      responseText = response.text || '';
    } catch (primaryErr) {
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: contentParts,
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = fallbackResponse.text || '';
      } catch (fallbackErr) {
        return res.json({
          valid: true,
          fallbackToClient: true,
          reason: 'Gemini AI unavailable, using client-side vision'
        });
      }
    }

    let parsedResult = {
      valid: false,
      hasFace: false,
      isHandCoveringFace: false,
      reason: 'ไม่สามารถประมวลผลการตรวจสอบได้'
    };

    try {
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      parsedResult = JSON.parse(cleanText);
    } catch {
      console.warn('Could not parse Gemini validate JSON response:', responseText);
    }

    return res.json(parsedResult);
  } catch (err: any) {
    console.error('API /api/validate-face-photo error:', err);
    return res.status(200).json({
      valid: true,
      fallbackToClient: true,
      reason: 'Validation server error, fallback to client'
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
