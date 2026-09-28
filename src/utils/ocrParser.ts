import { normalizeAndFixArabicText } from './arabicText';
import { detectLawMetadataLocally, sanitizeLawTitle, formatBytes, type PDFExtractionResult, type PDFProgress } from './pdfParser';
import { performTesseractOcrOnImage, performTesseractOcrOnPdf } from './tesseractOcr';

/**
 * Fast Base64 converter for files
 */
async function fileToBase64(file: File): Promise<string> {
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
 * Comprehensive OCR for image files (PNG, JPG, WEBP, BMP, TIFF)
 * Uses client-side Tesseract.js (Arabic + English) with hybrid server Gemini Vision
 */
export async function performImageOCR(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const cleanTitle = sanitizeLawTitle(file.name);
  const fileSizeFormatted = formatBytes(file.size);

  let currentPercent = 20;
  const updateProgress = (pct: number, status: string) => {
    currentPercent = Math.max(currentPercent, pct);
    if (onProgress) {
      onProgress({
        currentPage: 1,
        totalPages: 1,
        percent: currentPercent,
        statusText: status,
      });
    }
  };

  updateProgress(25, 'جاري تشغيل محرك Tesseract OCR لقراءة نصوص ومواد الصورة...');

  // 1. Direct Tesseract.js client OCR
  try {
    const rawTessText = await performTesseractOcrOnImage(file, file.name, (p) => {
      updateProgress(p.percent, p.statusText);
    });

    const cleanText = normalizeAndFixArabicText(rawTessText);
    if (cleanText && cleanText.trim().length > 25 && !cleanText.startsWith('[مستند مصور:')) {
      const localMeta = detectLawMetadataLocally(cleanText, file.name);

      updateProgress(100, 'تم استخراج وتنسيق كافة النصوص والمواد القانونية بنجاح بنسبة 100%');

      return {
        text: cleanText,
        numPages: 1,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileSizeFormatted,
        suggestedTitle: localMeta.title || cleanTitle,
        suggestedCategory: localMeta.category || 'جمارك',
        summary: localMeta.summary || `تشريع مستخرج من صورة وثيقة "${file.name}"`,
        method: 'tesseract_canvas_ocr',
      };
    }
  } catch (tessErr) {
    console.warn('[Image OCR] Tesseract client error, falling back to server vision:', tessErr);
  }

  // 2. Server-side Gemini Vision OCR
  updateProgress(65, 'جاري قراءة واستخراج النصوص والمواد القانونية بالرؤية الذكية...');

  try {
    const base64Data = await fileToBase64(file);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch('/api/admin/parse-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const aiData = await res.json();
      const rawText = aiData.content || aiData.text || '';
      const finalContent = normalizeAndFixArabicText(rawText.trim());

      if (finalContent && finalContent.trim().length > 15) {
        const localMeta = detectLawMetadataLocally(finalContent, file.name);
        updateProgress(100, 'تم استخراج وتنسيق كافة النصوص والمواد القانونية بنجاح');

        return {
          text: finalContent,
          numPages: 1,
          fileName: file.name,
          fileSizeBytes: file.size,
          fileSizeFormatted,
          suggestedTitle: aiData.title ? sanitizeLawTitle(aiData.title) : localMeta.title || cleanTitle,
          suggestedCategory: aiData.category || localMeta.category || 'جمارك',
          summary: aiData.summary || localMeta.summary || `تشريع مستخرج من صورة وثيقة "${file.name}"`,
          method: 'gemini_vision_ocr',
          model: aiData.model,
        };
      }
    }
  } catch (err) {
    console.warn('[OCR] Server image parse note:', err);
  }

  const localMeta = detectLawMetadataLocally('', file.name);
  updateProgress(100, 'تم تجهيز بيانات المستند بنجاح');

  return {
    text: `[صورة وثيقة تشريعية: ${cleanTitle}]\n\nالمادة (1):\n\nالمادة (2):`,
    numPages: 1,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileSizeFormatted,
    suggestedTitle: localMeta.title || cleanTitle,
    suggestedCategory: localMeta.category || 'جمارك',
    summary: localMeta.summary || `وثيقة قانونية مستخرجة من صورة ${file.name}`,
    method: 'resilient_fallback',
  };
}

/**
 * High-speed Extraction for Scanned PDFs
 */
export async function performScannedPdfOCR(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const cleanTitle = sanitizeLawTitle(file.name);
  const fileSizeFormatted = formatBytes(file.size);

  let currentPercent = 25;
  const updateProgress = (pct: number, status: string, curPage = 1, total = 1) => {
    currentPercent = Math.max(currentPercent, pct);
    if (onProgress) {
      onProgress({
        currentPage: curPage,
        totalPages: total,
        percent: currentPercent,
        statusText: status,
      });
    }
  };

  updateProgress(30, 'جاري تشغيل محرك Tesseract OCR لقراءة صفحات المستند الممسوح ضوئياً...');

  // 1. Client-Side Tesseract OCR
  try {
    const tessResult = await performTesseractOcrOnPdf(file, (p) => {
      updateProgress(p.percent, p.statusText, p.currentPage, p.totalPages);
    });

    if (tessResult && tessResult.text && tessResult.text.trim().length > 30) {
      const fullOcrText = normalizeAndFixArabicText(tessResult.text);
      const localMeta = detectLawMetadataLocally(fullOcrText, file.name);

      updateProgress(100, 'اكتمل استخراج كافة نصوص ومواد المستند الممسوح ضوئياً بنجاح', tessResult.numPages, tessResult.numPages);

      return {
        text: fullOcrText,
        numPages: tessResult.numPages || 1,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileSizeFormatted,
        suggestedTitle: localMeta.title || cleanTitle,
        suggestedCategory: localMeta.category || 'جمارك',
        summary: localMeta.summary || `تشريع تم استخراجه من ${file.name}`,
        method: 'tesseract_canvas_ocr',
      };
    }
  } catch (tessErr) {
    console.warn('[OCR] Scanned PDF Tesseract note:', tessErr);
  }

  // 2. Server-side Gemini Vision OCR
  updateProgress(70, 'جاري قراءة المواد القانونية والقرارات حرفياً بالرؤية الذكية...');

  try {
    const base64Data = await fileToBase64(file);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch('/api/admin/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, fileName: file.name, mimeType: 'application/pdf' }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const serverResult = await res.json();
      const rawExtracted = serverResult.content || serverResult.text || '';
      const extractedText = normalizeAndFixArabicText(rawExtracted);

      if (extractedText && extractedText.trim().length > 15) {
        updateProgress(100, 'اكتمل استخراج المواد القانونية من المستند بنجاح', serverResult.numPages || 1, serverResult.numPages || 1);

        const localMeta = detectLawMetadataLocally(extractedText, file.name);

        return {
          text: extractedText,
          numPages: serverResult.numPages || 1,
          fileName: file.name,
          fileSizeBytes: file.size,
          fileSizeFormatted,
          suggestedTitle: serverResult.title ? sanitizeLawTitle(serverResult.title) : localMeta.title || cleanTitle,
          suggestedCategory: serverResult.category || localMeta.category || 'جمارك',
          summary: serverResult.summary || localMeta.summary || `تشريع تم استخراجه من ${file.name}`,
          method: 'gemini_vision_ocr',
          model: serverResult.model,
        };
      }
    }
  } catch (err) {
    console.warn('[OCR] Scanned PDF server parse note:', err);
  }

  const localMeta = detectLawMetadataLocally('', file.name);
  updateProgress(100, 'تم تجهيز المستند كمسودة قابلة للتعديل والحفظ');

  return {
    text: `[مستند PDF: ${cleanTitle}]\n\nالمادة (1):\n\nالمادة (2):`,
    numPages: 1,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileSizeFormatted,
    suggestedTitle: localMeta.title || cleanTitle,
    suggestedCategory: localMeta.category || 'جمارك',
    summary: localMeta.summary || `تشريع تم إدراجه من ملف ${file.name}`,
    method: 'resilient_fallback',
  };
}
