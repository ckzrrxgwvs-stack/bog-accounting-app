import { randomInt } from 'crypto';

/**
 * Industry-common practice for license-style keys: segmented alphanumeric string using an
 * alphabet without ambiguous characters (no O/0, I/1, L).
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const REGISTRATION_CODE_LENGTH = 16;

export function generateRegistrationCode(): { normalized: string; display: string } {
  let normalized = '';
  for (let i = 0; i < REGISTRATION_CODE_LENGTH; i++) {
    normalized += ALPHABET[randomInt(0, ALPHABET.length)]!;
  }
  return { normalized, display: formatRegistrationDisplay(normalized) };
}

/** Strip separators/spaces; uppercase. */
export function normalizeRegistrationInput(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

/** Pretty-print as groups of 4 (e.g. XXXX-XXXX-XXXX-XXXX). */
export function formatRegistrationDisplay(normalized: string): string {
  const chunks = normalized.match(/.{1,4}/g) ?? [];
  return chunks.join('-');
}

export function isValidNormalizedRegistrationCode(s: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${REGISTRATION_CODE_LENGTH}}$`).test(s);
}
