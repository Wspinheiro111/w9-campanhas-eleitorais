# Consolidação da especificação de campanha

## Requisitos extraídos do documento enviado

### 1. Estrutura de pessoas e funções

O documento propõe uma estrutura organizacional explícita por setores, com destaque para coordenação e estratégia, comunicação e conteúdo, mobilização e rua, e jurídico/contábil/operações. Também sugere separar departamentos e funções de campanha com níveis de acesso específicos, incluindo perfis administrativos, especialistas operacionais e líderes ou operadores de campo.

### 2. RBAC mais granular

Além dos papéis já existentes no W9, a especificação propõe uma diferenciação mais funcional entre administrador executivo, especialista operacional, liderança de campo e operador de campo. O objetivo é restringir módulos sensíveis, sobretudo os jurídicos, contábeis e de mídia, a conjuntos menores de usuários.

### 3. Prestação de contas e conformidade jurídica

O documento enfatiza um módulo com regras de integridade eleitoral, incluindo:

- bloqueio ou trava para doações empresariais vedadas;
- atenção a janela de 72 horas para comunicação e exportação de informações financeiras;
- exigência documental para despesas, com NF-e ou recibo válido e identificação do fornecedor;
- formalização contratual para equipe remunerada e termos de voluntariado.

### 4. Estrutura financeira sugerida

A especificação propõe registros separados de receitas, despesas e processos jurídicos, com dados como tipo de recurso, CPF/CNPJ do doador ou fornecedor, valor, forma de pagamento, número de recibo, comprovante fiscal, status de conferência e prazos jurídicos.

## Cobertura atual do W9 em relação ao documento

### Já coberto ou parcialmente coberto

| Frente | Situação atual no W9 |
|---|---|
| Multi-tenant por organização e campanha | Implementado |
| RBAC por organização/campanha | Implementado, porém ainda não com a granularidade funcional proposta no PDF |
| Voluntariado e termos operacionais | Parcial, via portal e documentos, mas sem formalização jurídica completa |
| Registros financeiros básicos | Implementado |
| Repositório jurídico com PDF seguro | Implementado |
| Aprovação e trilha de revisão | Implementado |
| Exportação consolidada de prestação de contas | Parcial, há estrutura consolidada no backend, mas falta concluir experiência completa no painel |

### Lacunas prioritárias identificadas

| Lacuna | Prioridade | Motivo |
|---|---|---|
| Upload com prévia prática de documentos no módulo jurídico | Alta | Fecha o fluxo documental sugerido pelo PDF |
| Exportação CSV/PDF da prestação de contas | Alta | Necessária para conferência operacional e repasse à contabilidade |
| Vínculo de lançamentos a eventos, fornecedores e centros de custo | Alta | Alinha o financeiro à operação real da campanha |
| Regras de trava para doação vedada e documentação mínima | Alta | É a maior exigência específica do documento |
| Controle de prazo jurídico de 72 horas | Média/Alta | Importante para conformidade e alertas internos |
| Perfis funcionais mais granulares | Média | Relevante, mas pode vir após estabilizar o núcleo financeiro |
| Processos jurídicos com prazo fatal e status próprio | Média | Ainda não modelado no núcleo atual |

## Direção recomendada para a próxima implementação

1. Concluir o módulo financeiro-jurídico já iniciado com upload, prévia e exportação.
2. Adicionar validações de conformidade: documentação mínima, trava de origem vedada e alertas de prazo.
3. Só depois expandir para perfis funcionais finos e processos jurídicos mais completos.
