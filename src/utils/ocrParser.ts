import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { normalizeAndFixArabicText } from './arabicText';
import { detectLawMetadataLocally, sanitizeLawTitle, formatBytes, type PDFExtractionResult, type PDFProgress } from './pdfParser';

let tesseractWorkerPromise: Promise<any> | null = null;

/**
 * Lazy initialize a singleton Tesseract.js worker with Arabic + English language models
 */
async function getTesseractWorker(onProgress?: (progress: PDFProgress) => void) {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      try {
        const worker = await createWorker(['ara', 'eng'], undefined, {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && onProgress && typeof m.progress === 'number') {
              const p = Math.round(m.progress * 100);
              onProgress({
                currentPage: 1,
                totalPages: 1,
                percent: Math.min(95, 30 + Math.round(p * 0.6)),
                statusText: `جاري القراءة الضوئية المتقدمة (OCR) للنصوص العربية... ${p}%`,
              });
            }
          },
        });
        return worker;
      } catch (err) {
        console.warn('[OCR] Failed to initialize Tesseract worker with ara+eng:', err);
        // Fallback to basic worker if language package download fails
        try {
          const fallbackWorker = await createWorker('ara');
          return fallbackWorker;
        } catch {
          return null;
        }
      }
    })();
  }
  return tesseractWorkerPromise;
}

/**
 * Perform client-side OCR on an image file (PNG, JPG, WEBP, etc.)
 */
export async function performImageOCR(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const cleanTitle = sanitizeLawTitle(file.name);
  const fileSizeFormatted = formatBytes(file.size);

  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 15,
      statusText: 'جاري تهيئة محرك التعرف الضوئي على الحروف (OCR)...',
    });
  }

  let ocrRawText = '';
  try {
    const worker = await getTesseractWorker(onProgress);
    if (worker) {
      if (onProgress) {
        onProgress({
          currentPage: 1,
          totalPages: 1,
          percent: 30,
          statusText: 'جاري تحليل الصورة واستخراج الكلمات القانونية...',
        });
      }
      const ret = await worker.recognize(file);
      ocrRawText = ret?.data?.text || '';
    }
  } catch (err) {
    console.warn('[OCR] Client-side image OCR error:', err);
  }

  // Normalize the OCR text
  let finalContent = normalizeAndFixArabicText(ocrRawText);

  // If local OCR didn't yield enough legal text or file has rich content, attempt Server-Side Gemini Vision
  const arabicWords = (finalContent.match(/[\u0600-\u06FF]+/g) || []).length;
  if (arabicWords < 15) {
    if (onProgress) {
      onProgress({
        currentPage: 1,
        totalPages: 1,
        percent: 60,
        statusText: 'جاري الاستعانة بنموذج الرؤية الفائقة لاستخراج المواد القانونية من الصورة بدقة...',
      });
    }

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const comma = res.indexOf(',');
          resolve(comma > -1 ? res.substring(comma + 1) : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      if (res.ok) {
        const aiData = await res.json();
        if (aiData.content && aiData.content.trim().length > 20) {
          finalContent = normalizeAndFixArabicText(aiData.content.trim());
          const localMeta = detectLawMetadataLocally(finalContent, file.name);

          if (onProgress) {
            onProgress({
              currentPage: 1,
              totalPages: 1,
              percent: 100,
              statusText: 'تم استخراج وتنسيق النصوص والمواد القانونية بنجاح',
            });
          }

          return {
            text: finalContent,
            numPages: 1,
            fileName: file.name,
            fileSizeBytes: file.size,
            fileSizeFormatted,
            suggestedTitle: aiData.title ? sanitizeLawTitle(aiData.title) : localMeta.title || cleanTitle,
            suggestedCategory: aiData.category || localMeta.category || 'جمارك',
            summary: aiData.summary || localMeta.summary || '',
            method: 'gemini_vision_ocr',
          };
        }
      }
    } catch (aiErr) {
      console.warn('[OCR] Server AI vision fallback note:', aiErr);
    }
  }

  // Structure result using local heuristic metadata
  const localMeta = detectLawMetadataLocally(finalContent, file.name);

  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 100,
      statusText: finalContent ? 'اكتمل التعرف الضوئي على المستند بنجاح' : 'تم تجهيز الملف، يمكنك إدخال النصوص يدوياً',
    });
  }

  return {
    text: finalContent || `[صورة وثيقة قانونية: ${cleanTitle}]\n\nتم رفع الصورة بنجاح بحجم (${fileSizeFormatted}). يمكنك كتابة وتعديل نصوص المواد القانونية هنا ثم حفظها.`,
    numPages: 1,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileSizeFormatted,
    suggestedTitle: localMeta.title || cleanTitle,
    suggestedCategory: localMeta.category || 'جمارك',
    summary: localMeta.summary || `وثيقة قانونية مستخرجة من صورة ${file.name}`,
    method: 'client_tesseract_ocr',
  };
}

/**
 * Perform high-resolution canvas rendering of scanned PDF pages and run OCR on them
 */
export async function performScannedPdfOCR(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const cleanTitle = sanitizeLawTitle(file.name);
  const fileSizeFormatted = formatBytes(file.size);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const maxPagesToOcr = Math.min(numPages, 10); // Process up to 10 scanned pages directly
    let accumulatedText = '';

    const worker = await getTesseractWorker(onProgress);

    for (let pageNum = 1; pageNum <= maxPagesToOcr; pageNum++) {
      if (onProgress) {
        const percent = Math.round((pageNum / maxPagesToOcr) * 80);
        onProgress({
          currentPage: pageNum,
          totalPages: numPages,
          percent,
          statusText: `قراءة ضوئية (OCR) للصفحة الممسوحة ${pageNum} من ${numPages}...`,
        });
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        // Render at 2.0 scale for sharp OCR reading of Arabic fonts
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: ctx,
            viewport,
          } as any).promise;

          if (worker) {
            const result = await worker.recognize(canvas);
            const pageText = result?.data?.text || '';
            const normalized = normalizeAndFixArabicText(pageText);
            if (normalized.trim()) {
              accumulatedText += normalized + '\n\n';
            }
          }
        }
      } catch (pageErr) {
        console.warn(`[OCR] Error during canvas OCR for page ${pageNum}:`, pageErr);
      }
    }

    const cleanResult = normalizeAndFixArabicText(accumulatedText.trim());

    if (cleanResult.length > 50) {
      const localMeta = detectLawMetadataLocally(cleanResult, file.name);

      if (onProgress) {
        onProgress({
          currentPage: numPages,
          totalPages: numPages,
          percent: 100,
          statusText: 'تم استخراج وقراءة المواد القانونية عبر OCR بنجاح',
        });
      }

      return {
        text: cleanResult,
        numPages,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileSizeFormatted,
        suggestedTitle: localMeta.title || cleanTitle,
        suggestedCategory: localMeta.category || 'جمارك',
        summary: localMeta.summary || `تشريع مستخرج عبر القراءة الضوئية من ملف ${file.name}`,
        method: 'tesseract_canvas_ocr',
      };
    }
  } catch (ocrErr) {
    console.warn('[OCR] Scanned PDF OCR error:', ocrErr);
  }

  // If client OCR did not produce enough text, return local fallback metadata
  const localMeta = detectLawMetadataLocally('', file.name);
  return {
    text: `[مستند PDF: ${cleanTitle}]\n\nتم إرفاق المستند بنجاح بحجم (${fileSizeFormatted}). يمكنك كتابة وتعديل نصوص المواد القانونية هنا مباشرة ثم حفظها في قاعدة المعرفة.`,
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
