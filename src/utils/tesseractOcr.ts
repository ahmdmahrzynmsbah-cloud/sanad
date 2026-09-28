/**
 * Tesseract.js OCR and Multi-Format Document Extraction Engine for ChatPortal
 * 
 * Supports:
 * - Scanned PDF files (page-by-page canvas rendering + Tesseract OCR)
 * - Document images (PNG, JPG, JPEG, WEBP, BMP) with Arabic + English OCR
 * - Digital PDF & Word DOCX fast text extraction
 * - Comprehensive Arabic text normalization and RTL repair
 * - Resilient server-side vision fallback if worker CDN is unreachable
 */

import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizeAndFixArabicText } from './arabicText';
import { formatBytes } from './pdfParser';
import { extractTextFromDocx } from './documentParser';

// Configure PDF.js worker safely for Browser/Vite
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || '/pdf.worker.min.mjs';
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
}

export interface OcrProgressUpdate {
  statusText: string;
  percent: number;
  currentPage?: number;
  totalPages?: number;
}

export interface ChatDocumentExtractionResult {
  text: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  numPages: number;
  isOcr: boolean;
  method: 'tesseract_ocr' | 'pdf_digital' | 'word_docx' | 'server_vision_fallback' | 'plain_text';
  wordCount: number;
}

/**
 * Fast Base64 converter for files
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const comma = res.indexOf(',');
      resolve(comma > -1 ? res.substring(comma + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from an image (File, Blob, or Canvas) using Tesseract.js
 * Configured with Arabic ('ara') and English ('eng') language recognition.
 * Includes a resilient fallback to server vision OCR if the local worker encounters network/CDN constraints.
 */
export async function performTesseractOcrOnImage(
  imageSource: File | Blob | HTMLCanvasElement | string,
  fileName = 'document_image.jpg',
  onProgress?: (progress: OcrProgressUpdate) => void
): Promise<string> {
  const updateProgress = (pct: number, status: string) => {
    if (onProgress) {
      onProgress({
        percent: Math.min(100, Math.max(0, Math.round(pct))),
        statusText: status,
      });
    }
  };

  updateProgress(10, 'جاري تهيئة محرك Tesseract للتعرف الضوئي على الحروف (عربي/إنجليزي)...');

  try {
    // Attempt Tesseract.recognize with a 25-second safeguard timeout
    const ocrPromise = Tesseract.recognize(imageSource, 'ara+eng', {
      logger: (m) => {
        if (m.status === 'loading tesseract core') {
          updateProgress(20, 'جاري تحميل نواة Tesseract OCR...');
        } else if (m.status === 'loading language traineddata') {
          updateProgress(35, 'جاري تحميل قواميس اللغة العربية والإنجليزية...');
        } else if (m.status === 'initializing api') {
          updateProgress(50, 'جاري تهيئة معالج النصوص الذكي...');
        } else if (m.status === 'recognizing text') {
          const p = 50 + Math.round((m.progress || 0) * 45);
          updateProgress(p, `جاري استخراج وقراءة النصوص من المستند (${Math.round((m.progress || 0) * 100)}%)...`);
        }
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tesseract OCR timeout')), 25000)
    );

    const result = await Promise.race([ocrPromise, timeoutPromise]);
    const rawText = result.data?.text || '';
    const cleanText = normalizeAndFixArabicText(rawText);

    if (cleanText && cleanText.trim().length > 15) {
      updateProgress(100, 'اكتمل استخراج النصوص بواسطة Tesseract بنجاح');
      return cleanText;
    }
  } catch (tessErr) {
    console.warn('[Tesseract OCR] Direct engine issue, triggering resilient vision fallback:', tessErr);
  }

  // Resilient fallback: Server-side Gemini Vision OCR
  updateProgress(75, 'جاري التحقق واستكمال قراءة المستند بالرؤية الذكية الفائقة...');
  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (typeof imageSource === 'string') {
      base64Data = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
    } else if (imageSource instanceof HTMLCanvasElement) {
      const dataUrl = imageSource.toDataURL('image/jpeg', 0.9);
      base64Data = dataUrl.split(',')[1];
    } else {
      base64Data = await fileToBase64(imageSource);
      mimeType = (imageSource as File).type || 'image/jpeg';
    }

    const res = await fetch('/api/admin/parse-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        fileName,
        mimeType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const serverText = data.content || data.text || '';
      const fixedServerText = normalizeAndFixArabicText(serverText);
      if (fixedServerText.trim().length > 10) {
        updateProgress(100, 'تم استخراج كافة نصوص المستند بدقة عالية');
        return fixedServerText;
      }
    }
  } catch (serverErr) {
    console.warn('[Tesseract OCR] Server fallback error:', serverErr);
  }

  updateProgress(100, 'تمت معالجة المستند');
  return `[مستند مصور: ${fileName}]\n(تعذر استخراج نصوص واضحة من الصورة، يرجى التأكد من وضوح الخط والإضاءة).`;
}

/**
 * Extract text from a scanned or hybrid PDF file using PDF.js + Tesseract OCR
 * 
 * Strategy:
 * 1. Load PDF with PDF.js
 * 2. Check each page for digital text
 * 3. If digital text is missing or sparse (scanned page), render the page to an offscreen Canvas at high resolution (scale 1.8)
 * 4. Run Tesseract.js OCR on the rendered canvas
 * 5. Aggregate all pages into complete full-fidelity legal text
 */
export async function performTesseractOcrOnPdf(
  file: File,
  onProgress?: (progress: OcrProgressUpdate) => void
): Promise<{ text: string; numPages: number; isOcr: boolean }> {
  const updateProgress = (pct: number, status: string, curPage?: number, total?: number) => {
    if (onProgress) {
      onProgress({
        percent: Math.min(100, Math.max(0, Math.round(pct))),
        statusText: status,
        currentPage: curPage,
        totalPages: total,
      });
    }
  };

  updateProgress(15, 'جاري فحص وقراءة هيكل ملف PDF...', 1, 1);

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];
  let containsOcrPages = false;

  updateProgress(25, `تم العثور على ${numPages} صفحة في المستند. جاري التحليل...`, 1, numPages);

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pagePctStart = 25 + Math.round(((pageNum - 1) / numPages) * 70);
    const pagePctEnd = 25 + Math.round((pageNum / numPages) * 70);

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rawItems = (textContent.items || [])
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter((s: string) => s.trim().length > 0);

    const digitalText = rawItems.join(' ').trim();

    // If page has substantial digital text (> 60 chars), use fast direct extraction
    if (digitalText.length >= 60) {
      updateProgress(pagePctEnd, `تم استخراج نصوص الصفحة ${pageNum} من ${numPages} رقمياً`, pageNum, numPages);
      pageTexts.push(`--- [صفحة ${pageNum}] ---\n` + normalizeAndFixArabicText(digitalText));
      continue;
    }

    // Scanned page detected: Render page to Canvas and apply Tesseract.js OCR
    containsOcrPages = true;
    updateProgress(
      pagePctStart + 5,
      `الصفحة ${pageNum} ممسوحة ضوئياً: جاري التعرف الضوئي Tesseract OCR...`,
      pageNum,
      numPages
    );

    try {
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        await (page.render as any)({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        // Perform Tesseract OCR on rendered canvas
        const ocrText = await performTesseractOcrOnImage(
          canvas,
          `${file.name}_page_${pageNum}.jpg`,
          (p) => {
            const subPct = pagePctStart + Math.round((p.percent / 100) * (pagePctEnd - pagePctStart));
            updateProgress(subPct, `الصفحة ${pageNum} من ${numPages}: ${p.statusText}`, pageNum, numPages);
          }
        );

        if (ocrText && ocrText.trim().length > 10) {
          pageTexts.push(`--- [صفحة ${pageNum} - Tesseract OCR] ---\n` + ocrText.trim());
        } else if (digitalText.length > 0) {
          pageTexts.push(`--- [صفحة ${pageNum}] ---\n` + normalizeAndFixArabicText(digitalText));
        } else {
          pageTexts.push(`--- [صفحة ${pageNum}] ---\n[صفحة بيضاء أو صورة غير مقروءة]`);
        }
      }
    } catch (pageOcrErr) {
      console.warn(`[Tesseract OCR] Error processing page ${pageNum}:`, pageOcrErr);
      if (digitalText.length > 0) {
        pageTexts.push(`--- [صفحة ${pageNum}] ---\n` + normalizeAndFixArabicText(digitalText));
      }
    }
  }

  updateProgress(100, 'اكتمل استخراج نصوص مستند PDF بنجاح', numPages, numPages);

  const fullText = pageTexts.join('\n\n');
  return {
    text: fullText,
    numPages,
    isOcr: containsOcrPages,
  };
}

/**
 * Universal Unified File Processor for ChatPortal
 * Converts any uploaded document (Scanned PDF, Image, Word DOCX, TXT)
 * into rich, normalized Arabic text before sending to Gemini AI.
 */
export async function processChatUploadedDocument(
  file: File,
  onProgress?: (progress: OcrProgressUpdate) => void
): Promise<ChatDocumentExtractionResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const fileSizeBytes = file.size;
  const fileSizeFormatted = formatBytes(fileSizeBytes);

  const updateProgress = (pct: number, status: string, curPage?: number, total?: number) => {
    if (onProgress) {
      onProgress({
        percent: Math.min(100, Math.max(0, Math.round(pct))),
        statusText: status,
        currentPage: curPage,
        totalPages: total,
      });
    }
  };

  // 1. Image documents (Scanned receipts, customs declarations, certificates, photos of decrees)
  const isImage =
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|tiff?|gif)$/i.test(lowerName);

  if (isImage) {
    updateProgress(15, `جاري تشغيل Tesseract OCR لقراءة الصورة "${fileName}"...`);
    const ocrText = await performTesseractOcrOnImage(file, fileName, onProgress);
    const words = ocrText.split(/\s+/).filter(Boolean).length;

    return {
      text: ocrText,
      fileName,
      fileSizeBytes,
      fileSizeFormatted,
      numPages: 1,
      isOcr: true,
      method: 'tesseract_ocr',
      wordCount: words,
    };
  }

  // 2. PDF Documents (Scanned or Digital)
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

  if (isPdf) {
    updateProgress(10, `جاري تحليل ملف PDF واستخراج النصوص "${fileName}"...`);
    const pdfResult = await performTesseractOcrOnPdf(file, onProgress);
    const words = pdfResult.text.split(/\s+/).filter(Boolean).length;

    return {
      text: pdfResult.text,
      fileName,
      fileSizeBytes,
      fileSizeFormatted,
      numPages: pdfResult.numPages,
      isOcr: pdfResult.isOcr,
      method: pdfResult.isOcr ? 'tesseract_ocr' : 'pdf_digital',
      wordCount: words,
    };
  }

  // 3. Word Documents (.docx, .doc)
  const isWord =
    file.type.includes('word') ||
    file.type.includes('officedocument') ||
    /\.(docx|doc)$/i.test(lowerName);

  if (isWord) {
    updateProgress(25, `جاري استخراج نصوص ملف الوورد "${fileName}"...`);
    try {
      const docxResult = await extractTextFromDocx(file, (p) => {
        updateProgress(p.percent, p.statusText || 'جاري استخراج نصوص الوورد...');
      });
      const cleanDocxText = normalizeAndFixArabicText(docxResult.text);
      const words = cleanDocxText.split(/\s+/).filter(Boolean).length;

      return {
        text: cleanDocxText,
        fileName,
        fileSizeBytes,
        fileSizeFormatted,
        numPages: docxResult.numPages,
        isOcr: false,
        method: 'word_docx',
        wordCount: words,
      };
    } catch (docxErr) {
      console.warn('Word parsing fallback:', docxErr);
    }
  }

  // 4. Plain Text files (.txt, .csv, .log)
  if (file.type.startsWith('text/') || /\.(txt|csv|json)$/i.test(lowerName)) {
    updateProgress(50, 'جاري قراءة الملف النصي...');
    const rawText = await file.text();
    const cleanText = normalizeAndFixArabicText(rawText);
    const words = cleanText.split(/\s+/).filter(Boolean).length;

    return {
      text: cleanText,
      fileName,
      fileSizeBytes,
      fileSizeFormatted,
      numPages: 1,
      isOcr: false,
      method: 'plain_text',
      wordCount: words,
    };
  }

  // 5. Default fallback
  updateProgress(80, 'جاري قراءة محتوى الملف...');
  let rawText = '';
  try {
    rawText = await file.text();
  } catch {
    rawText = `[مستند مرفق: ${fileName}]`;
  }
  const cleanText = normalizeAndFixArabicText(rawText);
  const words = cleanText.split(/\s+/).filter(Boolean).length;

  return {
    text: cleanText,
    fileName,
    fileSizeBytes,
    fileSizeFormatted,
    numPages: 1,
    isOcr: false,
    method: 'plain_text',
    wordCount: words,
  };
}
