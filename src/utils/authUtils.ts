/**
 * Utility functions for robust user authentication across mobile phones,
 * tablets, and various keyboard layouts.
 */

export function normalizeAuthIdentifier(input: string): {
  raw: string;
  cleanUsername: string;
  normalizedPhone: string;
} {
  if (!input) return { raw: '', cleanUsername: '', normalizedPhone: '' };

  // 1. Strip invisible unicode directional marks and zero-width spaces common on mobile keyboards
  let str = String(input)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u00A0]/g, '')
    .trim();

  // 2. Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII digits (0123456789)
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  str = str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));

  // 3. Remove leading @ symbol commonly typed on mobile social keyboards (e.g., @ahmed_7 -> ahmed_7)
  const cleanUsername = str.replace(/^@+/, '').trim().toLowerCase();

  // 4. Extract pure digits for phone matching
  let normalizedPhone = str.replace(/\D/g, '');
  if (normalizedPhone.startsWith('00970')) normalizedPhone = '0' + normalizedPhone.slice(5);
  else if (normalizedPhone.startsWith('970')) normalizedPhone = '0' + normalizedPhone.slice(3);
  else if (normalizedPhone.startsWith('00972')) normalizedPhone = '0' + normalizedPhone.slice(5);
  else if (normalizedPhone.startsWith('972')) normalizedPhone = '0' + normalizedPhone.slice(3);
  else if (normalizedPhone.startsWith('0020')) normalizedPhone = '0' + normalizedPhone.slice(4);
  else if (normalizedPhone.startsWith('20') && normalizedPhone.length > 10) normalizedPhone = '0' + normalizedPhone.slice(2);

  return {
    raw: str,
    cleanUsername,
    normalizedPhone,
  };
}

export function isMatchingUser(
  user: { username?: string; phone?: string; id?: string } | null | undefined,
  identifier: string
): boolean {
  if (!user || !identifier) return false;
  const { raw, cleanUsername, normalizedPhone } = normalizeAuthIdentifier(identifier);

  const uRawUsername = String(user.username || '')
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u00A0]/g, '')
    .trim();
  const uCleanUsername = uRawUsername.replace(/^@+/, '').trim().toLowerCase();

  // 1. Direct or sanitized username match
  if (
    cleanUsername &&
    (uCleanUsername === cleanUsername ||
      uRawUsername.toLowerCase() === raw.toLowerCase() ||
      uCleanUsername === raw.toLowerCase() ||
      uRawUsername.toLowerCase() === cleanUsername)
  ) {
    return true;
  }

  // 2. ID match
  if (user.id && (user.id === raw || user.id === cleanUsername)) {
    return true;
  }

  // 3. Phone match
  if (user.phone) {
    const { normalizedPhone: uNormPhone, raw: uRawPhone } = normalizeAuthIdentifier(user.phone);
    if (raw && (uRawPhone.toLowerCase() === raw.toLowerCase() || uRawPhone === cleanUsername)) {
      return true;
    }
    if (normalizedPhone && uNormPhone) {
      if (normalizedPhone === uNormPhone) return true;
      const p1 = normalizedPhone.replace(/^0+/, '');
      const p2 = uNormPhone.replace(/^0+/, '');
      if (p1 && p2 && p1 === p2) return true;
    }
  }

  return false;
}
