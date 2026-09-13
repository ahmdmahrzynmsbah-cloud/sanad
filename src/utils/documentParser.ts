/**
 * Document Parser Utility for Word (.docx, .doc) and PowerPoint (.pptx, .ppt)
 * Uses browser-native client-side extraction with mammoth & JSZip to extract rich legal texts,
 * with structured heuristic titles, categories, and article recognition.
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
  PDFProgress,
  PDFExtractionResult,
  formatBytes,
  sanitizeLawTitle,
  detectLawMetadataLocally,
} from './pdfParser';

/**
 * Extract text from Word document (.docx) directly in browser using Mammoth
 */
export async function extractTextFromDocx(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<{ text: string; numPages: number }> {
  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 30,
      statusText: 'جاري فحص وقراءة ملف الوورد (Word DOCX)...',
    });
  }

  const arrayBuffer = await file.arrayBuffer();

  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 60,
      statusText: 'جاري استخراج النصوص والفقرات والمواد القانونية...',
    });
  }

  // 1. First extract raw text
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
  let extractedText = rawTextResult.value ? rawTextResult.value.trim() : '';

  // Approximate page count based on word count / length (approx 400 words per page)
  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 380));

  if (onProgress) {
    onProgress({
      currentPage: estimatedPages,
      totalPages: estimatedPages,
      percent: 90,
      statusText: 'اكتمل استخراج نصوص ملف الوورد بنجاح...',
    });
  }

  return {
    text: extractedText,
    numPages: estimatedPages,
  };
}

/**
 * Extract text and slide notes from PowerPoint document (.pptx)
 * PPTX files are ZIP archives containing slides in `ppt/slides/slide{N}.xml`
 */
export async function extractTextFromPptx(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<{ text: string; numPages: number }> {
  if (onProgress) {
    onProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 25,
      statusText: 'جاري فحص وقراءة شرائح العرض التقديمي (PowerPoint PPTX)...',
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find all slide XML files in ppt/slides/
  const slideFiles: { path: string; index: number }[] = [];
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideFiles.push({ path: relativePath, index: parseInt(match[1], 10) });
    }
  });

  // Sort slides sequentially (Slide 1, Slide 2, ...)
  slideFiles.sort((a, b) => a.index - b.index);
  const totalSlides = Math.max(1, slideFiles.length);

  const slideTexts: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const item = slideFiles[i];
    const slideNumber = i + 1;

    if (onProgress) {
      const pct = Math.min(85, Math.round(25 + ((i + 1) / totalSlides) * 60));
      onProgress({
        currentPage: slideNumber,
        totalPages: totalSlides,
        percent: pct,
        statusText: `استخراج المحتوى من الشريحة ${slideNumber} من ${totalSlides}...`,
      });
    }

    try {
      const xmlString = await zip.file(item.path)?.async('string');
      if (xmlString) {
        // Extract text inside <a:t>...</a:t> XML tags (OpenXML DrawingML text elements)
        const textTokens: string[] = [];
        const regex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(xmlString)) !== null) {
          const decoded = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();
          if (decoded) {
            textTokens.push(decoded);
          }
        }

        if (textTokens.length > 0) {
          slideTexts.push(`[الشريحة ${slideNumber}]\n${textTokens.join(' ')}`);
        }
      }
    } catch (e) {
      console.warn(`Failed reading slide ${slideNumber}:`, e);
    }
  }

  // Also check if there are slide notes in ppt/notesSlides/
  const noteFiles: { path: string; index: number }[] = [];
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i);
    if (match) {
      noteFiles.push({ path: relativePath, index: parseInt(match[1], 10) });
    }
  });
  noteFiles.sort((a, b) => a.index - b.index);

  if (noteFiles.length > 0) {
    const notesTextList: string[] = [];
    for (const nf of noteFiles) {
      try {
        const xml = await zip.file(nf.path)?.async('string');
        if (xml) {
          const regex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(xml)) !== null) {
            const val = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            // Ignore generic template header strings
            if (val && !val.match(/^\d+$/) && val.length > 2) {
              notesTextList.push(val);
            }
          }
        }
      } catch {}
    }
    if (notesTextList.length > 0) {
      slideTexts.push(`\n[ملاحظات العرض التقديمي]\n${notesTextList.join('\n')}`);
    }
  }

  const combinedText = slideTexts.join('\n\n').trim();

  return {
    text: combinedText,
    numPages: totalSlides,
  };
}

/**
 * Universal document text extractor supporting:
 * - PDF (.pdf)
 * - Microsoft Word (.docx, .doc)
 * - Microsoft PowerPoint (.pptx, .ppt)
 */
export async function extractTextFromAnyDocument(
  file: File,
  onProgress?: (progress: PDFProgress) => void
): Promise<PDFExtractionResult> {
  const fileName = file.name;
  const cleanName = sanitizeLawTitle(fileName);
  const fileSizeFormatted = formatBytes(file.size);
  const lowerName = fileName.toLowerCase();

  const isWord = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
  const isPpt = lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt');

  // Handle Word Documents
  if (isWord) {
    try {
      const docxResult = await extractTextFromDocx(file, onProgress);
      const text = docxResult.text;

      if (text && text.trim().length >= 10) {
        if (onProgress) {
          onProgress({
            currentPage: docxResult.numPages,
            totalPages: docxResult.numPages,
            percent: 85,
            statusText: 'تم استخراج نصوص الوورد، جاري تحليل وتصنيف المواد القانونية...',
          });
        }

        const localMeta = detectLawMetadataLocally(text, fileName);
        let structuredTitle = localMeta.title;
        let structuredCategory = localMeta.category;
        let structuredSummary = localMeta.summary;

        // Try AI enrichment if available
        try {
          const res = await fetch('/api/admin/structure-law-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text.slice(0, 15000),
              fileName,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.title) structuredTitle = sanitizeLawTitle(data.title);
            if (data.category) structuredCategory = data.category;
            if (data.summary) structuredSummary = data.summary;
          }
        } catch {}

        if (onProgress) {
          onProgress({
            currentPage: docxResult.numPages,
            totalPages: docxResult.numPages,
            percent: 100,
            statusText: 'اكتمل استخراج نصوص ملف الوورد وتصنيفها بنجاح',
          });
        }

        return {
          text,
          numPages: docxResult.numPages,
          fileName,
          fileSizeBytes: file.size,
          fileSizeFormatted,
          suggestedTitle: structuredTitle || cleanName,
          suggestedCategory: structuredCategory,
          summary: structuredSummary,
          method: 'client_pdfjs',
        };
      }
    } catch (docxErr) {
      console.warn('Direct DOCX extraction error:', docxErr);
    }

    const localMeta = detectLawMetadataLocally('', fileName);
    return {
      text: `[مستند Word: ${cleanName}]\n\nتم إرفاق المستند بنجاح بحجم (${fileSizeFormatted}). يمكنك كتابة وتعديل نصوص المواد القانونية هنا ثم حفظها في قاعدة المعرفة.`,
      numPages: 1,
      fileName,
      fileSizeBytes: file.size,
      fileSizeFormatted,
      suggestedTitle: localMeta.title || cleanName,
      suggestedCategory: localMeta.category || 'جمارك',
      summary: `مستند وورد تم إدراجه من ملف ${fileName}`,
      method: 'resilient_fallback',
    };
  }

  // Handle PowerPoint Presentations
  if (isPpt) {
    try {
      const pptResult = await extractTextFromPptx(file, onProgress);
      const text = pptResult.text;

      if (text && text.trim().length >= 10) {
        if (onProgress) {
          onProgress({
            currentPage: pptResult.numPages,
            totalPages: pptResult.numPages,
            percent: 85,
            statusText: 'تم استخراج نصوص الشرائح، جاري تحليل وتصنيف المواد القانونية...',
          });
        }

        const localMeta = detectLawMetadataLocally(text, fileName);
        let structuredTitle = localMeta.title;
        let structuredCategory = localMeta.category;
        let structuredSummary = localMeta.summary;

        // Try AI enrichment if available
        try {
          const res = await fetch('/api/admin/structure-law-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text.slice(0, 15000),
              fileName,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.title) structuredTitle = sanitizeLawTitle(data.title);
            if (data.category) structuredCategory = data.category;
            if (data.summary) structuredSummary = data.summary;
          }
        } catch {}

        if (onProgress) {
          onProgress({
            currentPage: pptResult.numPages,
            totalPages: pptResult.numPages,
            percent: 100,
            statusText: 'اكتمل استخراج نصوص العرض التقديمي وتصنيفها بنجاح',
          });
        }

        return {
          text,
          numPages: pptResult.numPages,
          fileName,
          fileSizeBytes: file.size,
          fileSizeFormatted,
          suggestedTitle: structuredTitle || cleanName,
          suggestedCategory: structuredCategory,
          summary: structuredSummary,
          method: 'client_pdfjs',
        };
      }
    } catch (pptErr) {
      console.warn('Direct PPTX extraction error:', pptErr);
    }

    const localMeta = detectLawMetadataLocally('', fileName);
    return {
      text: `[عرض تقديمي PowerPoint: ${cleanName}]\n\nتم إرفاق الملف بنجاح بحجم (${fileSizeFormatted}). يمكنك كتابة وتعديل نصوص المواد والشرائح هنا ثم حفظها في قاعدة المعرفة.`,
      numPages: 1,
      fileName,
      fileSizeBytes: file.size,
      fileSizeFormatted,
      suggestedTitle: localMeta.title || cleanName,
      suggestedCategory: localMeta.category || 'جمارك',
      summary: `عرض تقديمي تم إدراجه من ملف ${fileName}`,
      method: 'resilient_fallback',
    };
  }

  // Fall back to standard PDF extractor
  const { extractTextFromPDF } = await import('./pdfParser');
  return extractTextFromPDF(file, onProgress);
}
