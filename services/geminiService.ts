
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

export const extractMultipleDataFromImage = async (base64Image: string): Promise<ExtractedData[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // ลบ prefix data:image/...;base64, ออกถ้ามี
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
            text: `คุณเป็นผู้เชี่ยวชาญด้านการอ่านป้ายข้อมูลทางการแพทย์และอุตสาหกรรม (Medical/Industrial Label Specialist)
            
งานของคุณคือ:
1. ตรวจสอบภาพนี้ว่ามีแผ่นป้ายสติกเกอร์ (Labels) กี่แผ่น (ปกติจะเป็นแผ่นสติกเกอร์พื้นขาว)
2. สำหรับ "ทุกๆ แผ่น" ที่พบ ให้สกัดข้อมูลดังนี้:
   - hospitalDept: ชื่อโรงพยาบาล หรือ ชื่อหน่วยงาน (ภาษาไทยหรืออังกฤษ)
   - referenceId: รหัสอ้างอิง เช่น รหัสแล็บ, รหัสสิ่งส่งตรวจ (มักเป็นตัวอักษรผสมตัวเลข)
   - hn: เลข HN (Hospital Number) มักเป็นตัวเลข 7-10 หลัก
   - patientName: ชื่อ-นามสกุล ของผู้ป่วย (ภาษาไทยหรืออังกฤษ)
   - category: ประเภทการตรวจ เช่น PAP, BIOPSY, CELL, PATH, URINE
   - date: วันที่ที่ปรากฏบนป้าย

ข้อกำหนดสำคัญ:
- หากมีหลายแผ่น ต้องส่งกลับมาเป็น List ของ Object ให้ครบทุกแผ่น
- อ่านภาษาไทยให้ถูกต้องแม่นยำที่สุด
- หากข้อมูลส่วนใดหาไม่พบจริงๆ ให้ใส่เป็น "N/A"
- ส่งกลับเป็น JSON Array เท่านั้น`
          }
        ],
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            hospitalDept: { type: Type.STRING },
            referenceId: { type: Type.STRING },
            hn: { type: Type.STRING },
            patientName: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
          },
          required: ["hospitalDept", "referenceId", "hn", "patientName", "category", "date"],
        }
      },
    },
  });

  try {
    const textOutput = response.text || "[]";
    const data = JSON.parse(textOutput);
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    throw new Error("ไม่สามารถสกัดข้อมูลได้ กรุณาลองใหม่อีกครั้งด้วยภาพที่ชัดเจนขึ้น");
  }
};
