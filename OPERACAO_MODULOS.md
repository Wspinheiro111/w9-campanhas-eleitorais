# Operação dos módulos de expansão

Este documento descreve a utilização operacional dos módulos adicionados ao W9 Campanhas Eleitorais. Todos os dados permanecem vinculados à organização e à campanha ativa, respeitando os papéis administrativos e o isolamento multi-tenant do sistema.

## Mobilização e pesquisas rápidas

O módulo **Mobilização** reúne mapa de calor, score de mobilização e pesquisas rápidas. A equipe pode criar uma pergunta, coletar respostas e registrar, quando disponível, o bairro e a região de cada retorno. Ao selecionar uma pesquisa no resumo, o painel apresenta a distribuição das respostas por alternativa e a consolidação territorial das coletas registradas.

| Recurso | Uso operacional | Regra de acesso |
|---|---|---|
| Mapa de calor | Priorizar áreas com maior atividade registrada de contatos, visitas, interações e respostas. | Gestão da campanha |
| Score de mobilização | Acompanhar sinais de relacionamento a partir de pipeline, consentimento, visitas e interações. | Gestão da campanha |
| Pesquisa rápida | Coletar pulso de opinião com resposta única, escala ou texto. | Criação e resumo: gestão; coleta: membros da campanha |

> O score e as projeções são indicadores operacionais. Eles não substituem pesquisa eleitoral, dados oficiais ou qualquer método de apuração.

## Calendário editorial e simulador

A Biblioteca de conteúdos permite registrar **canal, objetivo, data planejada, responsável, status e versão**. O responsável deve ser integrante da mesma campanha, validação feita no servidor antes da gravação. O simulador transforma premissas explícitas de visitas, eventos e taxas de conversão em uma estimativa de alcance, engajamento e mobilização.

| Recurso | Boa prática |
|---|---|
| Calendário editorial | Definir objetivo, responsável e data antes de submeter o conteúdo à aprovação. |
| Simulador de cenários | Registrar as premissas utilizadas e recalibrar as taxas conforme dados reais da campanha. |

## Portal do voluntário

O portal oferece um link público no formato `/voluntario/:campaignId`. O formulário solicita apenas informações necessárias para avaliar e organizar colaboração voluntária: identificação, contato, território, disponibilidade, habilidades e consentimento. Cada inscrição entra com status **Em análise**; a coordenação pode aprovar, acompanhar a formação e atribuir tarefas por território.

Após a primeira inscrição, o voluntário recebe um link privado para acompanhar o próprio status, atualizar disponibilidade e habilidades, aceitar tarefas e confirmar sua conclusão. O token do link é guardado no banco apenas como hash; o endereço não deve ser compartilhado. Por privacidade, uma nova tentativa de inscrição com o mesmo e-mail não reexibe esse acesso.

| Etapa | Ação da coordenação |
|---|---|
| Inscrição | Conferir disponibilidade, território e consentimento informado. |
| Aprovação | Alterar o status para ativo quando a pessoa estiver apta a colaborar. |
| Formação | Atualizar o andamento até a conclusão do treinamento. |
| Tarefa territorial | Atribuir atividade, território e data; concluir quando houver confirmação operacional. |
| Acompanhamento individual | O voluntário usa o link privado recebido na inscrição para atualizar informações e acompanhar apenas suas próprias tarefas. |

## Benchmark interno de equipe

O Benchmark regional consolida tarefas, entregas, eventos e visitas de campo por **região de trabalho**, sem apresentar nomes ou métricas individuais. Para reduzir risco de reidentificação, resultados de regiões com menos de dois integrantes ativos são suprimidos.

Tanto a gestão de voluntários quanto o benchmark são módulos de coordenação. Eles ficam ocultos para perfis com acesso restrito e, se acessados por link direto, exibem uma mensagem de acesso restrito em vez de carregar dados incompletos.

> O benchmark deve orientar distribuição de recursos, acompanhamento e apoio à equipe. Ele não deve ser usado como avaliação individual, mecanismo disciplinar ou base para exposição pública de desempenho.

| Métrica agregada | Composição |
|---|---|
| Índice operacional | Tarefas concluídas, eventos e visitas de campo, normalizados pelo número de integrantes da região. |
| Grupos protegidos | Regiões com menos de dois integrantes ativos; nenhum indicador de desempenho é exibido. |

## Validação desta entrega

A entrega foi validada por checagem de tipos e por suíte automatizada de regressão. A suíte cobre contratos de acesso e fluxos dos módulos prioritários, incluindo inscrição consentida de voluntário, pesquisa territorial e acesso administrativo ao benchmark regional.
