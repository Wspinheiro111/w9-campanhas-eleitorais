# Consolidação do módulo de Prestação de Contas e Jurídico

## Requisitos extraídos do documento enviado

O documento recebido propõe um módulo eleitoral voltado à conformidade legal e financeira da campanha, com quatro frentes principais: **receitas e doações**, **despesas e pagamentos**, **gestão jurídica de equipe e voluntariado** e **acompanhamento processual**.

### Receitas e doações

O material pede registro formal de doações com número de recibo eleitoral, validação de CPF/CNPJ, tipo de origem do recurso, forma de pagamento, data de recebimento, comprovante e observações. Também explicita regras de conformidade, como bloqueio de doações por pessoa jurídica em cenários vedados e geração de recibo eleitoral único.

### Despesas e pagamentos

O documento propõe cadastro de despesas com fornecedor, CPF/CNPJ, tipo de despesa, valor, forma de pagamento, dados de nota fiscal, data de emissão, data de pagamento, comprovantes e parecer jurídico. Há ainda a regra de exigir documento fiscal ou recibo para despesas acima de um limite financeiro definido na especificação.

### Jurídico de equipe e voluntariado

A especificação sugere contratos de prestação de serviços e termos de voluntariado com tipo de vínculo, função exercida, valor, quantidade de parcelas, datas de início e fim e status de assinatura. Também menciona geração de termo ou contrato em PDF com rastreabilidade operacional.

### Processos, alertas e obrigações

O documento pede cadastro de processos jurídicos com número, polo, assunto, órgão julgador, advogado responsável, prazo fatal, status e resumo. Também define uma camada de alertas e obrigações, como relatório financeiro de 72 horas, prestação de contas parcial, termo de voluntariado antes do campo e bloqueios relativos a limite de gastos com pessoal.

## Conciliação com a arquitetura do W9

Para o W9, esses requisitos devem ser adaptados ao padrão já existente de **multi-tenant por organização**, **isolamento por campanha**, **RBAC por papel**, **armazenamento seguro de anexos**, **auditoria administrativa**, **histórico operacional** e **interface orientada por campanha**.

### Decisões de consolidação

1. **Manter escopo por campanha e organização em todas as tabelas**.
2. **Separar financeiro e jurídico, mas permitir vínculo cruzado**, por exemplo, despesa ligada a contrato, evento, fornecedor ou processo.
3. **Guardar documentos fiscais e jurídicos com armazenamento seguro**, sem bytes no banco.
4. **Registrar aprovações e mudanças de status com trilha auditável**.
5. **Produzir relatórios operacionais e comparativos**, sem assumir integração direta com sistemas oficiais nesta primeira fase.

## Proposta consolidada para implementação

### Bloco 1 — Financeiro

- Contas bancárias por campanha.
- Receitas/doações com origem, documento do doador, forma de recebimento, comprovante e número de recibo.
- Despesas com fornecedor, classificação, vencimento, pagamento, documento fiscal e comprovante.
- Painel de **contas a receber**, **contas a pagar** e **saldo**, conforme a regra operacional já adotada no projeto.

### Bloco 2 — Jurídico documental

- Repositório de contratos, termos de voluntariado, notas fiscais, recibos e relatórios anexos.
- Status jurídicos como rascunho, pendente, em análise, aprovado, rejeitado e arquivado.
- Associação de documentos a campanha, voluntário, membro, fornecedor, despesa ou processo.

### Bloco 3 — Aprovação e conformidade

- Fila de conferência contábil/jurídica.
- Regras iniciais de validação: presença de comprovantes, coerência básica de CPF/CNPJ, obrigatoriedade documental acima de determinado valor e sinalização de pendências.
- Alertas internos de obrigação e prazo, sem automação externa obrigatória nesta primeira versão.

### Bloco 4 — Relatórios e acompanhamento

- Relatório consolidado por período.
- Painel de pendências legais e financeiras.
- Exportação dos registros para conferência operacional.
- Base preparada para futura geração de arquivos compatíveis com obrigações eleitorais, mas sem prometer integração oficial imediata nesta etapa.

## Diferenças entre o documento e a implementação recomendada no W9

O documento sugere diretamente estruturas e endpoints de inspiração PostgreSQL/Express. No W9, a implementação deve seguir a stack real do projeto: **Drizzle + MySQL/TiDB + tRPC + React**, preservando o padrão de contratos já existente. Também é recomendável evitar, por ora, regras legais excessivamente rígidas ou automações que possam ser interpretadas como validação jurídica final; o sistema deve operar como **apoio e organização da campanha**, com alertas, exigências documentais e rastreabilidade.

## Itens que devem entrar na primeira entrega do módulo

1. Cadastro de receitas e despesas.
2. Contas a pagar, contas a receber e saldo.
3. Repositório seguro de contratos, termos e notas fiscais.
4. Fluxo de status e aprovação.
5. Alertas de pendência documental e prazos.
6. Relatórios operacionais e exportação.

## Itens que podem ficar para segunda fase

1. Geração automatizada de recibo eleitoral com layout final.
2. Modelos completos de contrato com assinatura eletrônica.
3. Integração com prestação oficial ou layouts externos específicos.
4. Regras parametrizadas de teto por categoria e bloqueios automáticos avançados.
