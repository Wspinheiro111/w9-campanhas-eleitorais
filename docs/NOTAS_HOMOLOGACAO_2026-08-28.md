# Notas de Homologação — W9 Campanhas Eleitorais

**Data:** 28 de agosto de 2026  
**Ambiente:** conta e organização temporárias, com dados inteiramente fictícios.

## Preparação aprovada

| Fluxo | Resultado | Evidência |
|---|---|---|
| Cadastro local | Aprovado | Conta temporária criada com e-mail reservado `.test`; nenhuma credencial real foi utilizada. |
| Login HTTPS | Aprovado | Login por e-mail e senha redirecionou ao `/painel` no domínio oficial. |
| Organização isolada | Aprovado | Organização temporária criada pelo onboarding. |
| Campanha isolada | Aprovado | Campanha fictícia criada e selecionada para os testes subsequentes. |

## Navegação inicial

Uma varredura automatizada dos itens do menu encontrou rotas acessíveis até a mudança rápida de página. As quatro primeiras rotas (`/painel`, `/executivo`, `/organizacoes` e `/tecnico`) preservaram a aplicação carregada. A partir de `/eventos/indicadores`, a leitura feita após apenas 220 ms relatou o título “404”; este resultado ainda é **inconclusivo**, pois a aplicação usa carregamento sob demanda e o próprio script mudou de rota em sequência. As rotas precisam ser reavaliadas individualmente com tempo de carregamento adequado antes de serem classificadas como defeito.

### Reteste individual

A rota `/tarefas`, que havia aparecido como 404 na varredura rápida, foi aberta diretamente e carregou corretamente o módulo **Metas e tarefas**. O achado inicial foi reclassificado como limitação do método de varredura, não como rota quebrada.

## Navegação autenticada por módulo

| Grupo | Resultado aprovado | Reteste necessário |
|---|---|---|
| Gestão inicial | Visão geral, Dashboard executivo, Organizações, Painel técnico, Equipe, Escalas e disponibilidade, Notificações e Voluntários carregaram com a campanha temporária. | Nenhum. |
| Campo e operação | Agenda, Tarefas, Metas operacionais, Coordenação diária e Contatos carregaram corretamente. | Indicadores de eventos e Prestação de contas exibiram 404 após 900 ms; Comunicação permaneceu em carregamento no mesmo intervalo. Estes três casos requerem abertura individual antes da classificação final. |

### Defeitos confirmados

| Código | Área | Evidência | Severidade | Complexidade estimada |
|---|---|---|---|---|
| HML-001 | Indicadores de eventos | A rota direta `/eventos/indicadores` exibe a página 404 autenticada, apesar de existir no menu lateral. | Alta | Baixa a média: conferir e registrar a rota no carregador de páginas. |
| HML-002 | Prestação de contas | A rota direta `/prestacao-contas` exibe a página 404 autenticada, apesar de existir no menu lateral. | Alta | Baixa a média: conferir e registrar a rota no carregador de páginas. |
| HML-004 | Desempenho do cadastro manual de contatos | O contato fictício foi criado e apareceu na lista após a conclusão da requisição. A chamada `voters.create` levou aproximadamente 12,6 s, deixando a interface em “Salvando...” sem indicação de progresso adicional. | Média | Média: reduzir tempo de resposta, registrar etapas de persistência e melhorar o retorno de progresso/tempo limite ao usuário. |
| HML-005 | Canal telefone na comunicação publicada | A Central de Comunicação publicada ainda oferece “Telefone” como canal de comunicação, apesar da política de bloqueio eleitoral implantada na versão de código ainda não publicada. | Alta | Baixa: publicar a versão de compliance e manter o teste de não regressão do canal bloqueado. |

### Reteste de carregamento

A rota `/comunicacao` concluiu o carregamento após a abertura individual. A tela mostrou corretamente a Central assistida, os filtros de canal, estado vazio de contatos consentidos, criação de modelo e histórico manual. A espera observada na varredura rápida não é classificada como defeito funcional.

| Grupo | Resultado aprovado |
|---|---|
| Campo e governança | Campo offline, Rua/demandas/materiais, Consentimentos e Sala de crise carregaram corretamente. |
| Planejamento e território | Pipeline, Mobilização, Simulador e Território carregaram corretamente. |
| Análise e conteúdo | Desempenho, Benchmark, Conteúdos, Áudio para CRM e Monitoramento carregaram corretamente. |
| Acesso e gestão | Instalar aplicativo, W9 Inteligência, Relatórios, Segurança e Auditoria carregaram corretamente. |

## Fluxos funcionais com dados fictícios

| Fluxo | Resultado | Evidência |
|---|---|---|
| Cadastro de tarefa | Aprovado | Uma tarefa fictícia foi criada com título, contexto e prazo na campanha temporária. |
| Kanban de tarefas | Aprovado | Após o cadastro, a tarefa surgiu na coluna “A fazer” com seletor de status disponível para as transições permitidas. |
| CRM e consentimento | Aprovado com observação de desempenho | A tela carregou com os fluxos de formulário público, modelo CSV, importação e cadastro manual, além dos filtros de bairro, região e perfil. O botão de cadastro permaneceu indisponível enquanto o consentimento explícito não foi marcado; após autorização, o registro foi concluído e apareceu na lista. |
| Central de Consentimento | Aprovado | A tela carregou, listou o contato fictício e gravou finalidade, origem, evidência e data no histórico auditável. A revogação foi concluída; o registro permaneceu no histórico como `revoked`. |
| Central de Comunicação | Aprovado com bloqueio esperado e divergência publicada | A tela informou corretamente que não há contatos elegíveis depois da revogação do consentimento fictício e não realizou disparos automáticos. O modelo interno fictício foi salvo e exibido na lista; o canal Telefone ficou exposto na versão publicada, classificado como HML-005. |
| Controle de acesso ao painel global | Aprovado | A conta temporária de cliente recebeu a tela “Acesso restrito” ao abrir `/paineladmin`; nenhum dado do painel administrativo foi exposto. |
| Relatórios | Aprovado para consulta e exportação CSV | A tela consolidou corretamente o contato e a tarefa fictícios, comparou o período selecionado e gerou o CSV, confirmado pela notificação de exportação concluída. |

## Regressão automatizada

Em 28 de agosto de 2026, a suíte completa foi executada novamente no estado final da homologação. O resultado foi **58 arquivos de teste aprovados, 215 testes aprovados, sem falhas**, em 19,49 segundos. A cobertura executada inclui isolamento multi-organização, fluxos de login e senha local, rotas do administrador global, PWA, upload, financeiro, CSV, consentimento, compliance, landing, páginas públicas, relatórios e componentes de interface.

### Reteste de acesso direto

Ao abrir diretamente `/campo`, a primeira captura mostrou “Selecione uma campanha” antes da conclusão da hidratação. O painel `/painel`, aberto diretamente em seguida e aguardado até o fim, restaurou corretamente a campanha temporária. O caso foi reclassificado como **necessidade de reteste com espera adequada em rota dependente de campanha**, e não como defeito confirmado de persistência.
