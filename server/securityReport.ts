export type SecurityReleaseReport = {
  version: string;
  publishedAt: string;
  title: string;
  checks: Array<{ id: string; label: string; result: "passed"; detail: string }>;
};

export const securityReleaseReports: SecurityReleaseReport[] = [
  {
    version: "5601d352",
    publishedAt: "2026-08-21T12:06:00.000Z",
    title: "Auditoria de segurança e concorrência",
    checks: [
      { id: "debug", label: "Instrumentação de depuração", result: "passed", detail: "Coletor público e referências de debug removidos." },
      { id: "typing", label: "Higiene de código", result: "passed", detail: "Verificações não identificaram console.log ou casts as any no código-fonte auditado." },
      { id: "uploads", label: "Uploads de certificado", result: "passed", detail: "PNG, JPEG e WebP exigem assinatura binária compatível; SVG é bloqueado." },
      { id: "tokens", label: "Tokens de voluntários", result: "passed", detail: "Token de acesso passou a ser único somente dentro da campanha." },
      { id: "finance", label: "Transições financeiras", result: "passed", detail: "Atualizações usam versão esperada e rejeitam concorrência simultânea." },
      { id: "tests", label: "Validação automatizada", result: "passed", detail: "Verificação de tipos e 141 testes automatizados aprovados no release." },
    ],
  },
];
