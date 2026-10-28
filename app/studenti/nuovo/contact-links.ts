/** Italian mobile numbers only; WhatsApp expects country code without + or separators. */
export function whatsappNumber(value?: string): string | null {
  const input = value?.trim() || "";
  if (!input || !/^[+\d\s()./-]+$/.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("0039") ? digits.slice(4) : digits.startsWith("39") && digits.length === 12 ? digits.slice(2) : digits;
  return /^3\d{9}$/.test(national) ? `39${national}` : null;
}

export function contactPhone(phone?: string, legacyWhatsapp?: string): string {
  return phone?.trim() || legacyWhatsapp?.trim() || "";
}
