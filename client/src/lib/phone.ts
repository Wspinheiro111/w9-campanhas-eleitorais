export function formatBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const hasCountryCode = digits.startsWith("55") && digits.length > 11;
  const countryCode = hasCountryCode ? "+55 " : "";
  const local = hasCountryCode ? digits.slice(2) : digits;

  if (local.length <= 2) return `${countryCode}${local ? `(${local}` : ""}`;
  if (local.length <= 6) return `${countryCode}(${local.slice(0, 2)}) ${local.slice(2)}`;
  if (local.length <= 10) return `${countryCode}(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return `${countryCode}(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

export function toWhatsAppUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  const nationalNumber = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (nationalNumber.length < 10 || nationalNumber.length > 11) return null;
  return `https://wa.me/55${nationalNumber}`;
}
