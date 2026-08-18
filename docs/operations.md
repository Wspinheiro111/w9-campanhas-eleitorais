# Operação do W9 Campanhas

## Primeiro acesso

O primeiro usuário autenticado como proprietário do projeto recebe o perfil administrativo da plataforma. Após o acesso, crie a campanha com os dados do candidato, cargo/eleição e região-base. Esse usuário fica automaticamente vinculado como administrador da campanha.

## Papéis de campanha

| Papel | Acesso principal |
| --- | --- |
| Administrador | Configura dados da campanha, administra equipe, agenda, metas, tarefas, indicadores, CRM, monitoramento, relatórios e IA. |
| Coordenador | Opera agenda, tarefas, metas, contatos, monitoramento, indicadores, relatórios e recursos de IA. |
| Parceiro | Visualiza e atualiza apenas tarefas, contatos e registros de campo sob sua própria responsabilidade. |

## Recursos de IA e áudio

O assistente e o processamento de áudio executam no servidor. A gravação de campo exige confirmação de base legítima e consentimento para o registro do contato. Todo resultado gerado por IA deve passar por revisão humana, especialmente antes de divulgação ou encaminhamento externo.

## Resumo diário e prazos

O painel inicial apresenta três faixas de prioridade: tarefas **vencidas**, tarefas com prazo **para hoje** e tarefas dos **próximos três dias**. Tarefas concluídas não aparecem nos alertas. O perfil parceiro visualiza somente os prazos de itens sob sua responsabilidade; administradores e coordenadores visualizam a agenda operacional consolidada.

## Importação de contatos por CSV

No módulo **Contatos**, use **Modelo CSV** para baixar a estrutura de planilha aceita e **Importar CSV** para enviar o arquivo preenchido. A importação aceita até 1.000 linhas e 2 MB por operação. As colunas obrigatórias são `nome` e `consentimento`; use `Sim` para confirmar a autorização de registro e contato. O sistema também valida e-mail, nível de engajamento e limites de tamanho dos campos. Se houver qualquer erro, nenhum contato é salvo e um relatório por linha é apresentado para correção.

Antes de salvar contatos válidos, o servidor encaminha somente os identificadores necessários ao serviço Python/Flask de deduplicação. E-mails são comparados sem distinção entre maiúsculas e minúsculas; telefones são comparados somente pelos dígitos. O serviço ignora duplicidades que já existam na campanha e também duplicidades no próprio arquivo, informando a linha e o motivo no relatório. Os contatos não duplicados seguem para o cadastro em lote; ao final, o relatório exibe também a lista nominal e a linha de origem de cada contato importado.

A importação agora possui duas etapas. Primeiro, a plataforma apresenta uma **prévia** sem alterar a base. Correspondências exatas por e-mail ou telefone são oferecidas como atualizações do contato existente e já vêm selecionadas, mas podem ser desmarcadas antes da aplicação. Correspondências apenas por nome e bairro são tratadas como possíveis duplicidades: ficam desmarcadas por padrão e só são criadas se o operador as aprovar explicitamente. Assim, não há atualização ou criação baseada em coincidência aproximada sem decisão humana.

## Território, pipeline e desempenho

O módulo **Território** consolida contatos por bairro e região e posiciona marcadores agregados no mapa quando houver registros geográficos. Ao cadastrar ou editar eventos e ocorrências, preencha também os campos de bairro e região: esses dados estruturados definem os marcadores e as listas territoriais. O módulo **Pipeline** organiza os contatos nas etapas identificado, abordado, engajado e mobilizado; parceiros somente movimentam contatos sob sua responsabilidade. Em **Desempenho**, a coordenação acompanha tarefas, conclusões, objetivos vinculados e eventos por integrante.

## Formulário público e QR Code

Em **Contatos**, selecione **Formulário público** para copiar o link ou compartilhar o QR Code. Campanhas em planejamento ou ativas podem receber cadastros públicos, sempre com consentimento obrigatório. Os novos contatos entram na etapa inicial do pipeline e não recebem responsável automático.

## Biblioteca e comparativos

A **Biblioteca de conteúdos** reúne textos, roteiros e links de materiais, identificados por canal, versão e status de aprovação. O módulo **Relatórios** permite comparar contatos, tarefas, metas, eventos e ocorrências em um intervalo com o período anterior de mesma duração.

## Validação técnica

Antes de disponibilizar uma nova versão, execute `pnpm check`, `pnpm test` e `pnpm build`. A suíte atual cobre logout, regras de perfil, bloqueios de contratos e cenários de edição da campanha, agenda, indicadores, tarefas, histórico de interações e acesso ao processamento de áudio.
