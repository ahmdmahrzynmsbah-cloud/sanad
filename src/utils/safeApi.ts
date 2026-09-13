/**
 * Helper to safely parse API responses, preventing syntax errors like
 * "Unexpected token 'A', 'A server e'... is not valid JSON"
 * and gracefully handling Vercel serverless error pages.
 */
export async function safeFetchJson<T = any>(res: Response): Promise<{ ok: boolean; data?: T; error?: string }> {
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    return { ok: false, error: 'فشل قراءة استجابة الخادم: ' + (err?.message || '') };
  }

  if (!text || !text.trim()) {
    return res.ok
      ? { ok: true, data: undefined }
      : { ok: false, error: `الخادم أرجع استجابة فارغة (رمز ${res.status})` };
  }

  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      return { ok: false, error: json.error || `خطأ من الخادم (${res.status})` };
    }
    return { ok: true, data: json };
  } catch {
    // The server returned HTML or plain text error (like Vercel FUNCTION_INVOCATION_FAILED)
    if (text.includes('FUNCTION_INVOCATION_FAILED') || text.includes('A server error')) {
      return {
        ok: false,
        error: 'تعذر تنفيذ الطلب (تفاصيل: ' + text.substring(0, 100) + ')',
      };
    }
    return {
      ok: false,
      error: `استجابة غير صالحة من الخادم (${res.status}): ${text.substring(0, 120)}`,
    };
  }
}
