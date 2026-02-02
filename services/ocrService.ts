
import Tesseract from 'tesseract.js';
import { ExtractedData } from "../types";

/**
 * ตรวจหาพื้นที่ที่เป็นแผ่นป้าย (White Background Labels)
 * โดยใช้ Grid Density Analysis
 */
const detectLabelRegions = (img: HTMLImageElement): { x: number, y: number, w: number, h: number }[] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  // ใช้ความละเอียดที่พอเหมาะในการคำนวณ (ประมาณ 1000px)
  const maxDim = 1000;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // แบ่งภาพเป็น Grid เล็กๆ (เช่น 20x20 pixels ต่อช่อง)
  const gridSize = 15;
  const cols = Math.ceil(canvas.width / gridSize);
  const rows = Math.ceil(canvas.height / gridSize);
  const grid = new Array(rows).fill(0).map(() => new Array(cols).fill(false));

  // 1. ระบุช่องที่มีความเป็น "สีขาว" สูง (Label Area)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let whitePixels = 0;
      let totalPixels = 0;

      for (let y = r * gridSize; y < (r + 1) * gridSize && y < canvas.height; y++) {
        for (let x = c * gridSize; x < (c + 1) * gridSize && x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          
          // เกณฑ์ความขาว (White threshold)
          if (red > 190 && green > 190 && blue > 190) {
            whitePixels++;
          }
          totalPixels++;
        }
      }
      
      // ถ้าช่องนี้มีสีขาวมากกว่า 60% ถือว่าเป็นส่วนของป้าย
      if (whitePixels / totalPixels > 0.6) {
        grid[r][c] = true;
      }
    }
  }

  // 2. รวมกลุ่มช่องที่ติดกันเป็น "เกาะ" (Island / Connected Component)
  const visited = new Array(rows).fill(0).map(() => new Array(cols).fill(false));
  const boxes: { r1: number, c1: number, r2: number, c2: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] && !visited[r][c]) {
        // เริ่มต้นหาเกาะใหม่
        let r1 = r, c1 = c, r2 = r, c2 = c;
        const stack = [{ r, c }];
        visited[r][c] = true;

        while (stack.length > 0) {
          const curr = stack.pop()!;
          r1 = Math.min(r1, curr.r);
          c1 = Math.min(c1, curr.c);
          r2 = Math.max(r2, curr.r);
          c2 = Math.max(c2, curr.c);

          // เช็คเพื่อนบ้าน 4 ทิศ
          const neighbors = [
            { r: curr.r - 1, c: curr.c },
            { r: curr.r + 1, c: curr.c },
            { r: curr.r, c: curr.c - 1 },
            { r: curr.r, c: curr.c + 1 }
          ];

          for (const n of neighbors) {
            if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && grid[n.r][n.c] && !visited[n.r][n.c]) {
              visited[n.r][n.c] = true;
              stack.push(n);
            }
          }
        }
        boxes.push({ r1, c1, r2, c2 });
      }
    }
  }

  // 3. แปลง Grid Coordinates กลับเป็น Pixel และกรองขนาดที่ไม่ใช่ป้าย
  return boxes
    .filter(box => {
      const width = (box.c2 - box.c1 + 1) * gridSize;
      const height = (box.r2 - box.r1 + 1) * gridSize;
      return width > 60 && height > 40; // ขนาดขั้นต่ำของแผ่นป้าย
    })
    .map(box => {
      // เพิ่ม Padding รอบป้ายเล็กน้อย
      const padding = 20;
      const x = (box.c1 * gridSize) / scale;
      const y = (box.r1 * gridSize) / scale;
      const w = ((box.c2 - box.c1 + 1) * gridSize) / scale;
      const h = ((box.r2 - box.r1 + 1) * gridSize) / scale;

      return {
        x: Math.max(0, x - padding),
        y: Math.max(0, y - padding),
        w: Math.min(img.width, w + padding * 2),
        h: Math.min(img.height, h + padding * 2)
      };
    });
};

/**
 * ตัดภาพแผ่นป้าย
 */
const cropLabel = (img: HTMLImageElement, rect: { x: number, y: number, w: number, h: number }): string => {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return canvas.toDataURL('image/jpeg', 0.85);
};

const parseLabelContent = (text: string): ExtractedData | null => {
  if (text.trim().length < 8) return null;

  // ปรับปรุง Regex ให้รองรับความผิดเพี้ยนของ OCR ภาษาไทย
  const hnMatch = text.match(/(?:HN|H\.N\.|เลขที่|ID)?[:\s]*([A-Z0-9]{6,12})/i) || text.match(/(\d{7,10})/);
  const nameMatch = text.match(/(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.|Mr\.|Ms\.|Mrs\.)\s*([ก-๙A-Za-z]+)\s+([ก-๙A-Za-z]+)/);
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  const refMatch = text.match(/[A-Z]\d{2}-\d+/i) || text.match(/[A-Z]-\d{5,}/i) || text.match(/REF[:\s]*([A-Z0-9\-]+)/i);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const hospitalDept = lines.length > 0 ? lines[0] : "แผ่นป้ายตรวจพบ";

  // ต้องมีอย่างน้อย 1 ข้อมูลสำคัญ
  if (!hnMatch && !nameMatch && !refMatch) return null;

  return {
    hospitalDept: hospitalDept.substring(0, 60),
    referenceId: refMatch ? (Array.isArray(refMatch) ? refMatch[1] || refMatch[0] : refMatch[0]) : "N/A",
    hn: hnMatch ? (Array.isArray(hnMatch) ? hnMatch[1] || hnMatch[0] : hnMatch[0]) : "",
    patientName: nameMatch ? `${nameMatch[1]}${nameMatch[2]} ${nameMatch[3]}` : "ไม่ระบุชื่อ",
    category: text.match(/(PAP|BIOPSY|CELL|PATH|LAB|GENERAL|URINE|BLOOD|PATHOLOGY)/i)?.[0]?.toUpperCase() || "GENERAL",
    date: dateMatch ? dateMatch[0] : new Date().toLocaleDateString('th-TH'),
    rawText: text
  };
};

export const extractMultipleDataFromImageLocal = async (base64Image: string): Promise<ExtractedData[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // 1. ค้นหาแผ่นป้ายสีขาวแยกแผ่น
        const rects = detectLabelRegions(img);
        
        // ถ้าไม่พบเลยให้ประมวลผลทั้งภาพ
        const processingRects = rects.length > 0 ? rects : [{ x: 0, y: 0, w: img.width, h: img.height }];
        
        const worker = await Tesseract.createWorker('tha+eng');
        const results: ExtractedData[] = [];

        // 2. วนลูปอ่านทีละแผ่น (ที่ตัดออกมาแล้ว)
        for (const rect of processingRects) {
          const croppedBase64 = cropLabel(img, rect);
          const { data: { text } } = await worker.recognize(croppedBase64);
          
          const parsed = parseLabelContent(text);
          if (parsed) {
            // ป้องกันผลลัพธ์ซ้ำซ้อน
            const isDuplicate = results.some(r => 
              (r.hn && r.hn === parsed.hn) || 
              (r.referenceId !== 'N/A' && r.referenceId === parsed.referenceId)
            );
            if (!isDuplicate) {
              results.push(parsed);
            }
          }
        }

        await worker.terminate();
        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("ไม่สามารถโหลดรูปภาพได้"));
    img.src = base64Image;
  });
};
