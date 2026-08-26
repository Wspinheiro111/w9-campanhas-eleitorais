export function normalizeBrDocument(value: string) {
  return value.replace(/\D/g, "");
}

function hasRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: string) {
  const cpf = normalizeBrDocument(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split("").reduce((total, item, index) => total + Number(item) * (length + 1 - index), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string) {
  const cnpj = normalizeBrDocument(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;
  const digit = (length: number) => {
    let factor = length - 7;
    const sum = cnpj.slice(0, length).split("").reduce((total, item) => {
      const next = total + Number(item) * factor;
      factor = factor === 2 ? 9 : factor - 1;
      return next;
    }, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

export function isValidCpfOrCnpj(value: string) {
  const document = normalizeBrDocument(value);
  return isValidCpf(document) || isValidCnpj(document);
}
