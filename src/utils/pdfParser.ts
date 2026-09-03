/**
 * PDF Parsing & Legal Text Extraction Utility
 * Directly leverages Gemini AI multimodal vision & document understanding
 * for comprehensive extraction of articles, clauses, titles, and legal categories.
 */

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
  method: 'gemini_ai' | 'fallback_parser';
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
 * Extract structured legal text from a PDF file using server-side Gemini AI.
 * Handles both scanned images and digital documents, extracting title, category,
 * and comprehensive articles.
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  const fileSizeFormatted = formatBytes(file.size);

  // File size validation (up to 35MB for Base64 transmission)
  if (file.size > 35 * 1024 * 1024) {
    throw new Error(
      `حجم ملف الـ PDF (${fileSizeFormatted}) يتجاوز الحد الأقصى المدعوم (35 ميجابايت). يرجى اختيار ملف أصغر حجماً لتسريع المعالجة.`
    );
  }

  // Step 1: Client-side preparation & encoding
  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 20,
      statusText: 'جاري قراءة وتجهيز ملف الـ PDF للمعالجة الذكية...',
    });
  }

  let base64Data = '';
  try {
    base64Data = await fileToBase64(file);
  } catch {
    throw new Error('تعذر قراءة بيانات ملف الـ PDF من المتصفح.');
  }

  // Step 2: AI-Powered Extraction via Gemini
  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 45,
      statusText: 'جاري قراءة واستخراج المواد القانونية من الملف بواسطة الذكاء الاصطناعي...',
    });
  }

  // Simulated progressive updates for UX responsiveness during AI reasoning
  let progressInterval: any = null;
  if (onProgress) {
    let curr = 45;
    progressInterval = setInterval(() => {
      if (curr < 90) {
        curr += 5;
        onProgress({
          currentPage: 1,
          totalPages: 1,
          percent: curr,
          statusText: 'جاري قراءة واستخراج المواد القانونية من الملف بواسطة الذكاء الاصطناعي...',
        });
      }
    }, 600);
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
        if (errData?.error) {
          errorMessage = errData.error;
        }
      } catch {
        if (res.status === 413) {
          errorMessage = 'حجم ملف الـ PDF كبير جداً. يرجى اختيار ملف أصغر حجماً من 35 ميجابايت.';
        }
      }
      throw new Error(errorMessage);
    }

    const serverResult = await res.json();

    const extractedText = serverResult.content || serverResult.text || '';
    if (!extractedText.trim() && !serverResult.title) {
      throw new Error(
        'تمت قراءة ملف الـ PDF ولكن لم يتم العثور على نصوص أو مواد قانونية واضحة داخل المستند.'
      );
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
