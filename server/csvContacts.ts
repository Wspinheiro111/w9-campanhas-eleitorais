export type ContactImportRow = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  neighborhood: string | null;
  region: string | null;
  contactProfile: string | null;
  engagementLevel: "low" | "medium" | "high";
  primaryDemand: string | null;
  notes: string | null;
  contactConsent: true;
};

export type CsvImportError = { row: number; field: string; message: string };

const headerAliases: Record<string, keyof ContactImportRow | "consent"> = {
  nome: "name", telefone: "phone", email: "email", endereco: "address", bairro: "neighborhood", regiao: "region", perfil_contato: "contactProfile", nivel_engajamento: "engagementLevel", demanda_principal: "primaryDemand", observacoes: "notes", consentimento: "consent",
};

const limits: Partial<Record<keyof ContactImportRow, number>> = { name: 180, phone: 32, email: 320, address: 1000, neighborhood: 120, region: 120, contactProfile: 120, primaryDemand: 3000, notes: 3000 };

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
}

function parseLine(line: string, separator: string) {
  const cells: string[] = [];
  let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted;
    } else if (char === separator && !quoted) { cells.push(value.trim()); value = ""; } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function valueOrNull(value: string | undefined) { const normalized = value?.trim() ?? ""; return normalized || null; }

export function parseContactsCsv(content: string): { rows: ContactImportRow[]; errors: CsvImportError[] } {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { rows: [], errors: [{ row: 1, field: "arquivo", message: "A planilha deve ter cabeçalho e ao menos uma linha de contato." }] };
  if (lines.length > 1001) return { rows: [], errors: [{ row: 1, field: "arquivo", message: "A importação aceita no máximo 1.000 contatos por vez." }] };
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = parseLine(lines[0], separator).map(normalizeHeader).map(header => headerAliases[header]);
  const missing = ["name", "consent"].filter(required => !headers.includes(required as keyof ContactImportRow | "consent"));
  if (missing.length) return { rows: [], errors: [{ row: 1, field: "cabeçalho", message: `Colunas obrigatórias ausentes: ${missing.map(item => item === "name" ? "nome" : "consentimento").join(", ")}.` }] };

  const rows: ContactImportRow[] = []; const errors: CsvImportError[] = [];
  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2; const values = parseLine(line, separator); const record: Record<string, string> = {};
    headers.forEach((header, cell) => { if (header) record[header] = values[cell] ?? ""; });
    const name = (record.name ?? "").trim();
    if (name.length < 2 || name.length > 180) errors.push({ row: rowNumber, field: "nome", message: "Informe um nome entre 2 e 180 caracteres." });
    const email = valueOrNull(record.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: rowNumber, field: "email", message: "Informe um e-mail válido ou deixe a célula vazia." });
    const consent = normalizeHeader(record.consent ?? "");
    if (!["sim", "true", "1", "yes"].includes(consent)) errors.push({ row: rowNumber, field: "consentimento", message: "Use Sim para confirmar a autorização de registro e contato." });
    const engagementText = normalizeHeader(record.engagementLevel ?? "medio");
    const engagementMap: Record<string, ContactImportRow["engagementLevel"]> = { baixo: "low", low: "low", medio: "medium", medium: "medium", alto: "high", high: "high" };
    if (!engagementMap[engagementText]) errors.push({ row: rowNumber, field: "nivel_engajamento", message: "Use baixo, medio ou alto." });
    (Object.entries(limits) as [keyof ContactImportRow, number][]).forEach(([field, max]) => { const value = record[field] ?? ""; if (value.length > max) errors.push({ row: rowNumber, field, message: `O campo excede ${max} caracteres.` }); });
    if (!errors.some(error => error.row === rowNumber)) rows.push({ name, phone: valueOrNull(record.phone), email, address: valueOrNull(record.address), neighborhood: valueOrNull(record.neighborhood), region: valueOrNull(record.region), contactProfile: valueOrNull(record.contactProfile), engagementLevel: engagementMap[engagementText] ?? "medium", primaryDemand: valueOrNull(record.primaryDemand), notes: valueOrNull(record.notes), contactConsent: true });
  });
  return { rows, errors };
}
