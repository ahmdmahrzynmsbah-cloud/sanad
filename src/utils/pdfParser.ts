/**
 * PDF Parsing & Legal Text Extraction Utility
 * Provides high-speed client-side extraction via PDF.js to avoid Vercel 4.5MB payload limits,
 * with hybrid AI legal structuring via Gemini and resilient local heuristic fallbacks.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker safely for Vite / Browser
if (typeof window !== 'undefined') {
  try {
    // Primary: Cloudflare CDN for reliable static worker across deployments
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '5.4.296'}/pdf.worker.min.mjs`;
  } catch {
    // Secondary fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.4.296'}/build/pdf.worker.min.mjs`;
  }
}

export interface PDFProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
  statusText?: string;
}

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  suggestedTitle: string;
  suggestedCategory: string;
  summary?: string;
  method: 'client_pdfjs' | 'gemini_ai' | 'fallback_parser';
  model?: string;
}

/**
 * Format bytes to human readable format (KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Convert File to base64 string using native browser FileReader
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      const base64 = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Local heuristic metadata detection from raw Palestinian legal text
 */
export function detectLawMetadataLocally(
  text: string,
  fileName: string
): { title: string; category: string; summary: string } {
  const cleanName = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let title = cleanName;
  for (const line of lines.slice(0, 15)) {
    if (
      line.length >= 6 &&
      line.length <= 150 &&
      (line.includes('قانون') ||
        line.includes('قرار بقانون') ||
        line.includes('قرار رقم') ||
        line.includes('نظام رقم') ||
        line.includes('تعليمات') ||
        line.includes('مرسوم'))
    ) {
      title = line;
      break;
    }
  }

  let category = 'جمارك';
  const lower = (text + ' ' + fileName).toLowerCase();
  if (
    lower.includes('ضريبة دخل') ||
    lower.includes('ضريبة الدخل') ||
    lower.includes('الدخل الخاضع') ||
    cleanName.includes('دخل')
  ) {
    category = 'ضريبة دخل';
  } else if (
    lower.includes('قيمة مضافة') ||
    lower.includes('القيمة المضافة') ||
    lower.includes('فواتير ضريبية') ||
    cleanName.includes('مضافة')
  ) {
    category = 'ضريبة القيمة المضافة';
  } else if (
    lower.includes('رسوم') ||
    lower.includes('طوابع') ||
    lower.includes('مكوس') ||
    cleanName.includes('رسوم') ||
    cleanName.includes('مكوس')
  ) {
    category = 'رسوم ومكوس';
  }

  const summary = `تشريع قانوني رسمي مستخرج من ملف "${fileName}"، يحتوي على المواد والأحكام المنظمة لمجال (${category}).`;

  return { title, category, summary };
}

/**
 * Client-Side Direct PDF Text Extraction using PDF.js
 * Extracts raw digital text directly in the browser with 0 network payload overhead!
 */
async function extractTextWithPDFJS(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<{ text: string; numPages: number } | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item: any) => item.str || '')
          .filter(Boolean);
        const pageText = pageStrings.join(' ');
        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }

        if (onProgress) {
          const percent = Math.min(85, Math.round((pageNum / numPages) * 80));
          onProgress({
            currentPage: pageNum,
            totalPages: numPages,
            percent,
            statusText: `استخراج النصوص من الصفحة ${pageNum} من ${numPages}...`,
          });
        }
      } catch (pageErr) {
        console.warn(`Error reading page ${pageNum} via PDF.js:`, pageErr);
      }
    }

    return { text: fullText.trim(), numPages: numPages || 1 };
  } catch (err) {
    console.warn('[PDF.js] Direct browser extraction could not read stream:', err);
    return null;
  }
}

/**
 * Extract structured legal text from a PDF file.
 * Strategy:
 * 1. Try instant client-side extraction (0 bandwidth, bypasses Vercel 4.5MB limit entirely).
 * 2. If text extracted, call lightweight text structuring endpoint for AI enrichment.
 * 3. If PDF is scanned/image-only, fallback to server-side multimodal Gemini vision.
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  const fileSizeFormatted = formatBytes(file.size);

  // Step 1: Attempt Client-Side Extraction (Ultra fast & zero network payload limit)
  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 15,
      statusText: 'جاري فحص وقراءة ملف الـ PDF عبر المتصفح مباشرةً...',
    });
  }

  const clientResult = await extractTextWithPDFJS(file, onProgress);

  if (clientResult && clientResult.text && clientResult.text.length > 50) {
    if (onProgress) {
      onProgress({
        currentPage: clientResult.numPages,
        totalPages: clientResult.numPages,
        percent: 85,
        statusText: 'تم استخراج نصوص الوثيقة، جاري تحليل وتصنيف المواد القانونية...',
      });
    }

    // Default heuristic metadata in case network/AI is unavailable
    const localMeta = detectLawMetadataLocally(clientResult.text, file.name);

    let structuredTitle = localMeta.title;
    let structuredCategory = localMeta.category;
    let structuredSummary = localMeta.summary;

    // Send lightweight sample text to server for AI metadata enrichment (only ~10KB payload!)
    try {
      const res = await fetch('/api/admin/structure-law-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clientResult.text.slice(0, 15000),
          fileName: file.name,
        }),
      });

      if (res.ok) {
        const aiData = await res.json();
        if (aiData.title) structuredTitle = aiData.title;
        if (aiData.category) structuredCategory = aiData.category;
        if (aiData.summary) structuredSummary = aiData.summary;
      }
    } catch (enrichErr) {
      console.warn('[PDFParser] AI enrichment skipped, using robust local heuristics:', enrichErr);
    }

    if (onProgress) {
      onProgress({
        currentPage: clientResult.numPages,
        totalPages: clientResult.numPages,
        percent: 100,
        statusText: 'تم استخراج وتصنيف المواد القانونية بنجاح',
      });
    }

    return {
      text: clientResult.text,
      numPages: clientResult.numPages,
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeFormatted,
      suggestedTitle: structuredTitle,
      suggestedCategory: structuredCategory,
      summary: structuredSummary,
      method: 'client_pdfjs',
    };
  }

  // Step 2: Fallback to Server-Side AI Parser for scanned/image PDFs
  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 30,
      statusText: 'المستند ممسوح ضوئياً، جاري الإرسال للمعالجة البصرية بالذكاء الاصطناعي...',
    });
  }

  // File size validation for base64 transmission (Vercel payload constraint is ~4.5MB)
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(
      `حجم ملف الـ PDF (${fileSizeFormatted}) يتجاوز الحد الأقصى للمعالجة البصرية. يرجى اختيار ملف بحجم أصغر.`
    );
  }

  let base64Data = '';
  try {
    base64Data = await fileToBase64(file);
  } catch {
    throw new Error('تعذر قراءة بيانات ملف الـ PDF من المتصفح.');
  }

  let progressInterval: any = null;
  if (onProgress) {
    let curr = 35;
    progressInterval = setInterval(() => {
      if (curr < 90) {
        curr += 5;
        onProgress({
          currentPage: 1,
          totalPages: 1,
          percent: curr,
          statusText: 'جاري استخراج المواد والقرارات بواسطة الذكاء الاصطناعي...',
        });
      }
    }, 700);
  }

  try {
    const res = await fetch('/api/admin/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, fileName: file.name }),
    });

    if (progressInterval) clearInterval(progressInterval);

    if (!res.ok) {
      let errorMessage = 'تعذر استخراج المواد القانونية من ملف الـ PDF';
      try {
        const errData = await res.json();
        if (errData?.error) errorMessage = errData.error;
      } catch {
        if (res.status === 413) {
          errorMessage = 'حجم ملف الـ PDF الممسوح ضوئياً كبير جداً بالنسبة للمنصة (الحد الأقصى 4.5 ميجابايت على Vercel).';
        }
      }
      throw new Error(errorMessage);
    }

    const serverResult = await res.json();
    const extractedText = serverResult.content || serverResult.text || '';

    if (!extractedText.trim() && !serverResult.title) {
      throw new Error('تمت قراءة ملف الـ PDF ولكن لم يتم العثور على نصوص أو مواد قانونية واضحة.');
    }

    if (onProgress) {
      onProgress({
        currentPage: serverResult.numPages || 1,
        totalPages: serverResult.numPages || 1,
        percent: 100,
        statusText: 'اكتمل استخراج المواد القانونية وتعبئة البيانات بنجاح',
      });
    }

    return {
      text: extractedText,
      numPages: serverResult.numPages || 1,
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeFormatted,
      suggestedTitle: serverResult.title || serverResult.suggestedTitle || cleanName,
      suggestedCategory: serverResult.category || serverResult.suggestedCategory || 'جمارك',
      summary: serverResult.summary || '',
      method: serverResult.method || 'gemini_ai',
      model: serverResult.model,
    };
  } catch (err: any) {
    if (progressInterval) clearInterval(progressInterval);
    throw err;
  }
}
