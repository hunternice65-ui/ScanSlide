
import Tesseract from 'tesseract.js';
import { ExtractedData } from "../types";

/**
 * วิเคราะห์หาตำแหน่งแผ่นป้าย (สติกเกอร์สีขาว) ในรูปภาพ
 */
const detectLabelRegions = (img: HTMLImageElement): { x: number, y: number, w: number, h: number }[] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const maxDim = 1000;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const gridSize = 12;
  const cols = Math.ceil(canvas.width / gridSize);
  const rows = Math.ceil(canvas.height / gridSize);
  const grid = new Array(rows).fill(0).map(() => new Array(cols).fill(false));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let whitePixels = 0;
      let total = 0;
      for (let y = r * gridSize; y < (r + 1) * gridSize && y < canvas.height; y++) {
        for (let x = c * gridSize; x < (c + 1) * gridSize && x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          // ตรวจหาพื้นที่สีขาว/ครีม (สติกเกอร์)
          if (data[i] > 180 && data[i+1] > 180 && data[i+2] > 180) whitePixels++;
          total++;
        }
      }
      if (whitePixels / total > 0.55) grid[r][c] = true;
    }
  }

  const visited = new Array(rows).fill(0).map(() => new Array(cols).fill(false));
  const rects: { r1: number, c1: number, r2: number, c2: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] && !visited[r][c]) {
        let r1 = r, c1 = c, r2 = r, c2 = c;
        const q = [{ r, c }];
        visited[r][c] = true;
        while (q.length > 0) {
          const curr = q.shift()!;
          r1 = Math.min(r1, curr.r); c1 = Math.min(c1, curr.c);
          r2 = Math.max(r2, curr.r); c2 = Math.max(c2, curr.c);
          const ns = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
          for (const n of ns) {
            if (n.r>=0 && n.r<rows && n.c>=0 && n.c<cols && grid[n.r][n.c] && !visited[n.r][n.c]) {
              visited[n.r][n.c] = true;
              q.push(n);
            }
          }
        }
        rects.push({ r1, c1, r2, c2 });
      }
    }
  }

  return rects
    .filter(box => {
      const w = (box.c2 - box.c1 + 1) * gridSize;
      const h = (box.r2 - box.r1 + 1) * gridSize;
      return w > 50 && h > 30; // กรองจุดรบกวนขนาดเล็ก
    })
    .map(box => ({
      x: (box.c1 * gridSize) / scale,
      y: (box.r1 * gridSize) / scale,
      w: ((box.c2 - box.c1 + 1) * gridSize) / scale,
      h: ((box.r2 - box.r1 + 1) * gridSize) / scale
    }));
};

const cropImage = (img: HTMLImageElement, rect: {x:number, y:number, w:number, h:number}): string => {
  const canvas = document.createElement('canvas');
  const pad = 15; // เผื่อขอบ
  canvas.width = rect.w + pad*2;
  canvas.height = rect.h + pad*2;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, rect.x - pad, rect.y - pad, rect.w + pad*2, rect.h + pad*2, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
};

const parseThaiLabel = (text: string): ExtractedData | null => {
  // Regex ที่ออกแบบมาเพื่อดึงข้อมูลจากป้ายโรงพยาบาล/แล็บ
  const hnMatch = text.match(/(?:HN|H\.N\.)\s*[:\s]*([A-Z0-9]{6,12})/i) || text.match(/(\d{7,10})/);
  const nameMatch = text.match(/(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.|Mr\.|Ms\.)\s*([ก-๙\s]+)/);
  const refMatch = text.match(/[A-Z]\d{2}-\d+/i) || text.match(/REF[:\s]*([A-Z0-9\-]+)/i);
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  
  if (!hnMatch && !nameMatch && !refMatch) return null;

  const lines = text.split('\n').filter(l => l.trim().length > 3);

  return {
    hospitalDept: lines[0]?.substring(0, 40) || "ข้อมูลแผ่นป้าย",
    referenceId: refMatch ? (Array.isArray(refMatch) ? refMatch[1] || refMatch[0] : refMatch[0]) : "N/A",
    hn: hnMatch ? (Array.isArray(hnMatch) ? (hnMatch[1] || hnMatch[0]) : hnMatch[0]) : "N/A",
    patientName: nameMatch ? nameMatch[0].trim() : "ไม่พบชื่อ",
    category: text.match(/(PAP|BIOPSY|CELL|PATH|LAB|URINE|BLOOD)/i)?.[0]?.toUpperCase() || "ทั่วไป",
    date: dateMatch ? dateMatch[0] : new Date().toLocaleDateString('th-TH')
  };
};

export const extractMultipleDataFromImageLocal = async (base64Image: string): Promise<ExtractedData[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const regions = detectLabelRegions(img);
        const processingRects = regions.length > 0 ? regions : [{ x: 0, y: 0, w: img.width, h: img.height }];
        
        // โหลด Engine ภาษาไทยและอังกฤษ
        const worker = await Tesseract.createWorker('tha+eng');
        const results: ExtractedData[] = [];

        for (const rect of processingRects) {
          const cropped = cropImage(img, rect);
          const { data: { text } } = await worker.recognize(cropped);
          const parsed = parseThaiLabel(text);
          if (parsed) results.push(parsed);
        }

        await worker.terminate();
        resolve(results);
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error("โหลดภาพไม่สำเร็จ"));
    img.src = base64Image;
  });
};
