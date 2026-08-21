const prompt = `Atue como revisor de produto para um sistema brasileiro de gestão de campanhas eleitorais. Não ofereça aconselhamento jurídico nem declare conformidade legal. Avalie este fluxo financeiro já implementado: cadastro multi-tenant de receitas e despesas; categoria, contraparte, valor e status; resumo de receitas, despesas, saldo e pendências; repositório de contratos, termos, notas fiscais, recibos e relatórios; aprovação centralizada por coordenação; regras internas configuráveis para documentação mínima, origem de receita e prazo de revisão; futuro vínculo de lançamentos a evento, fornecedor e centro de custo. Indique, em português, cinco melhorias priorizadas para o próximo incremento, com justificativa de produto, risco operacional mitigado e esforço relativo. Responda em JSON com o formato {prioridades:[{titulo,justificativa,risco,esforco}]}.
`;
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
});
if (!response.ok) throw new Error(`Gemini respondeu ${response.status}: ${await response.text()}`);
const payload = await response.json();
const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
process.stdout.write(text);
