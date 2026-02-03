
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

export const extractMultipleDataFromImage = async (base64Image: string): Promise<ExtractedData[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  // ใช้โมเดลรุ่นล่าสุดที่เก่งด้าน Vision และภาษาไทย
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `คุณคือระบบ Vision Engine ขั้นสูงที่เชี่ยวชาญด้านเอกสารทางการแพทย์และแล็บ
ภารกิจของคุณคือการสแกนภาพและสกัดข้อมูลจากสติกเกอร์ "ทุกแผ่น" ที่เห็นในภาพ 
- แม้ป้ายจะเอียง ซ้อนกัน หรือมีขนาดเล็ก คุณต้องพยายามอ่านให้ได้
- เน้นความถูกต้องของภาษาไทย (ชื่อ-นามสกุล) 
- หากเจอเลข HN ให้ดึงมาให้ครบ
- แยกแยะประเภทการตรวจ (Category) ให้ชัดเจนเช่น PAP, Biopsy, หรือ Lab ทั่วไป`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            hospitalDept: { type: Type.STRING, description: "ชื่อโรงพยาบาลหรือแผนก" },
            referenceId: { type: Type.STRING, description: "เลข Lab หรือรหัสอ้างอิง" },
            hn: { type: Type.STRING, description: "เลขประจำตัวผู้ป่วย" },
            patientName: { type: Type.STRING, description: "ชื่อ-นามสกุลภาษาไทย" },
            category: { type: Type.STRING, description: "ประเภทการส่งตรวจ" },
            date: { type: Type.STRING, description: "วันที่บนป้าย" },
          },
          required: ["hospitalDept", "referenceId", "hn", "patientName", "category", "date"],
        }
      },
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: "โปรดอ่านข้อมูลจากสติกเกอร์ทุกแผ่นในภาพนี้และส่งกลับเป็น JSON"
          }
        ],
      }
    ],
  });

  try {
    const textOutput = response.text || "[]";
    return JSON.parse(textOutput);
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("ไม่สามารถวิเคราะห์ภาพได้ โปรดตรวจสอบความชัดเจนของภาพ");
  }
};
