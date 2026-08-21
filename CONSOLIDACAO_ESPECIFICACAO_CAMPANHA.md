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

### Cobertura atual revisada

| Frente | Situação atual no W9 |
|---|---|
| Multi-tenant por organização e campanha | Implementado |
| RBAC por organização/campanha | Implementado com papéis `admin`, `manager`, `operator` e `partner`; a granularidade por função especializada permanece como evolução futura |
| Voluntariado e termos operacionais | Portal de voluntário, treinamento, certificados e repositório de termos/documentos implementados; a formalização contratual completa depende da revisão jurídica responsável |
| Registros financeiros | Implementado com receitas, despesas, status sequenciais, fornecedor, centro de custo, evento e controles de saldo ativo |
| Repositório jurídico com PDF seguro | Implementado com anexação validada, armazenamento isolado por campanha e pré-visualização em nova guia |
| Aprovação e trilha de revisão | Implementado com estados pendente, em revisão, aprovado, pago/recebido, conciliado e encerrado; operadores e parceiros não aprovam |
| Exportação consolidada de prestação de contas | Implementada em CSV e PDF, com filtros de receitas/despesas e preservação de “A consultar” para valores |
| Regras internas de conformidade | Implementadas por campanha: restrição configurável de CNPJ em receitas, documento/recibo mínimo para despesas e prazo interno de revisão |
| Alertas financeiros e jurídicos | Implementados para revisão em atraso e documentação pendente, sem disparos externos automáticos |
| Processos jurídicos | Implementados com documento associado, responsável da campanha, prazo, observações e status próprio |

### Situação das lacunas priorizadas

| Lacuna | Prioridade | Motivo |
|---|---|---|
| Upload com prévia prática de documentos no módulo jurídico | Concluída | PDF validado, armazenado por campanha e acessível no repositório |
| Exportação CSV/PDF da prestação de contas | Concluída | Exportações filtráveis disponíveis no painel, sem expor valores monetários |
| Vínculo de lançamentos a eventos, fornecedores e centros de custo | Concluída | Campos opcionais disponíveis no cadastro e na listagem de lançamentos |
| Regras de trava para doação vedada e documentação mínima | Concluída como regra interna | Configurações por campanha, sem prometer interpretação ou certificação legal automática |
| Controle de prazo jurídico de 72 horas | Concluída como alerta interno configurável | Prazo padrão de 72 horas editável por administradores; alerta visível no painel |
| Perfis funcionais mais granulares | Remanescente de prioridade média | Requer matriz de permissões por função e validação operacional antes de substituir os papéis atuais |
| Formalização jurídica completa de contratação/voluntariado | Remanescente de prioridade média | Exige modelos e validação profissional antes de padronizar instrumentos jurídicos |

## Direção recomendada para a próxima implementação

O núcleo prioritário financeiro-jurídico foi concluído: documentos, exportações, vínculos operacionais, controles internos, alertas e processos jurídicos estão disponíveis. O próximo ciclo deve tratar **perfis funcionais mais granulares** e a **formalização jurídica completa de instrumentos de equipe e voluntariado**, ambos dependentes de uma matriz de permissões e de validação jurídica responsável. Nenhuma dessas evoluções deve ser apresentada como certificação automática de aderência à legislação eleitoral.
