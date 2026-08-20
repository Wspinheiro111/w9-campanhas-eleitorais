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

## Painel de treinamento interativo

A coordenação pode publicar uma trilha de materiais no Portal do voluntário. Cada etapa aceita resumo, conteúdo textual, link complementar, duração estimada e tipo de material: guia, vídeo, checklist ou material externo. Os módulos ativos são apresentados em ordem ao voluntário no seu acesso privado.

| Etapa | Ação | Resultado |
|---|---|---|
| Publicação | A coordenação cria o material no painel interno de voluntários. | O módulo fica disponível na trilha privada da campanha. |
| Estudo | O voluntário abre o conteúdo ou o material complementar indicado. | A etapa permanece pendente até a confirmação pessoal. |
| Confirmação | O voluntário seleciona **Confirmar conclusão**. | O sistema grava a confirmação individual e atualiza o progresso. |
| Formação concluída | Todas as etapas ativas foram confirmadas. | O status da formação é alterado automaticamente para concluído. |

> A confirmação é vinculada ao link privado do voluntário e não libera acesso a informações de outros participantes ou da equipe interna.

### Certificado interno de conclusão

Ao confirmar todos os materiais ativos da trilha, o sistema emite automaticamente um **certificado interno de conclusão**. A emissão é idempotente: confirmações repetidas não criam certificados duplicados. O documento permanece associado ao voluntário, à campanha e à organização, com código único, data de emissão e quantidade de materiais concluídos.

| Quem consulta | Como acessa | Informações disponíveis |
|---|---|---|
| Voluntário | Link privado individual | Certificado visual, código interno e opção de impressão. |
| Coordenação autorizada | Base administrativa de voluntários | Status de formação e registro do certificado na listagem protegida da campanha. |

> O certificado é um registro interno da plataforma e não representa diploma, certificação profissional ou credencial externa.

### PDF, QR Code e celebração

O voluntário pode selecionar **Exportar PDF** no certificado para baixar uma cópia com a mesma identificação interna exibida no portal. O PDF contém o nome do participante, data, quantidade de materiais concluídos, código único e QR Code.

O QR Code encaminha para uma rota de validação interna. A rota exige autenticação e permissão de coordenação na própria campanha antes de mostrar dados do certificado, evitando que o código exponha informações pessoais em consultas públicas.

Depois que o último material é confirmado, a plataforma mostra uma celebração visual e acessível, informa que o certificado foi emitido e direciona o voluntário à área em que pode visualizar, imprimir ou exportar o documento.

### Identidade visual por campanha e histórico privado

No painel administrativo de voluntários, a coordenação pode definir a **cor principal**, a **cor de destaque**, o logotipo, a assinatura visual, o nome da assinatura e sua função. O logotipo e a assinatura podem ser enviados diretamente no painel em PNG, JPEG ou WebP de até 2 MB; os arquivos são armazenados de forma segura por campanha. A configuração é exclusiva da campanha selecionada e é aplicada ao certificado exibido no portal, ao QR Code e à exportação em PDF.

Antes do envio, o logotipo passa por uma etapa de **recorte quadrado**, com zoom e reposicionamento. Esse enquadramento garante uma apresentação consistente na visualização do certificado e no PDF.

| Recurso | Acesso | Comportamento |
|---|---|---|
| Identidade visual | Coordenação com permissão de gestão | Altera cores, logotipo e assinatura apenas da campanha ativa. |
| Progresso da trilha | Voluntário no portal privado | Mostra percentual, quantidade concluída e etapas restantes para a emissão. |
| Histórico de certificados | Voluntário no portal privado | Lista os certificados emitidos no vínculo da campanha e permite baixar novamente o PDF. |
| Lembrete de pendências | Voluntário no portal privado | Exibe aviso visual com quantidade de módulos pendentes e atalho para a trilha. |
| Prazo de módulo | Coordenação com permissão de gestão | Define ou remove a data de vencimento de cada etapa publicada. |
| Alerta de prazo | Voluntário no portal privado | Destaca módulos vencidos e etapas que vencem nos próximos três dias. |
| Progresso gerencial | Coordenação com permissão de gestão | Consolida taxa de conclusão e vencimentos, com filtros por responsável de equipe e região. |
| Lembrete assistido | Coordenação com permissão de gestão | Filtra voluntários ativos com formação pendente, permite copiar e-mails e abrir uma mensagem manual no cliente de e-mail. |
| Gestão da trilha | Coordenação com permissão de gestão | Edita título, conteúdo, duração, prazo e status do módulo; as setas reorganizam a ordem da trilha. |
| Exportações | Coordenação com permissão de gestão | Gera PDF da trilha e relatórios PDF ou CSV do painel de progresso conforme os filtros ativos. |
| Ranking mensal | Coordenação com permissão de gestão | Compara equipes responsáveis por conclusões mensais e avanço sobre as metas configuradas. |

> O histórico e os arquivos exportados continuam vinculados ao acesso privado do voluntário. A personalização visual não altera o código, a data ou as regras de validação do certificado.

Quando a coordenação publica uma nova etapa em uma trilha já concluída, a formação volta a ficar pendente até que o voluntário conclua a etapa adicional. A nova conclusão gera uma **nova versão imutável** do certificado, com código e data próprios. As versões anteriores permanecem no histórico, podem ser exportadas novamente e continuam válidas para a consulta interna por QR Code.

Para ativar os filtros de equipe no painel gerencial, associe cada voluntário a um responsável em **Responsáveis de equipe**. O painel apresenta apenas métricas operacionais de formação, sem reproduzir dados de contato no comparativo agregado.

## Lembretes manuais e relatórios

A campanha está configurada para **lembretes manuais assistidos**, sem disparos automáticos. A seção correspondente reúne apenas voluntários ativos com formação pendente ou prazos vencidos. A coordenação pode copiar os e-mails ou abrir uma mensagem individual, mantendo a revisão humana antes de qualquer contato.

Os relatórios de progresso podem ser exportados em CSV para tratamento em planilhas ou em PDF para compartilhamento interno. A exportação respeita os filtros de responsável de equipe e região selecionados no painel. A trilha também possui um PDF próprio, útil para revisão, treinamento presencial e arquivamento operacional.

## Ranking mensal por equipe

O ranking mensal consolida os voluntários que concluíram integralmente a trilha e receberam uma emissão de certificado no mês selecionado. Cada voluntário é contado uma única vez por equipe no período, mesmo que a trilha tenha sido atualizada. A coordenação pode definir uma meta de conclusões para cada equipe; o painel calcula automaticamente o percentual de avanço e ordena o comparativo por atingimento da meta, seguido pelo número de trilhas concluídas. Apenas indicadores agregados são apresentados: o ranking não mostra e-mails, telefones ou detalhes de progresso individual dos voluntários.

As medalhas são internas e calculadas automaticamente a partir da meta mensal: **Meta atingida** para equipes com ao menos 100% da meta, **Liderança de meta** para a primeira equipe que atingiu a meta e **Destaque mensal** para equipes com 125% ou mais. A coordenação pode exportar o ranking do mês selecionado em CSV ou PDF; os arquivos incluem posição, equipe, região, metas, progresso e medalha, sem contatos ou outros dados pessoais dos voluntários.

As regras podem ser ajustadas por campanha na seção **Regras de reconhecimento**. O percentual de **Meta atingida** define o início da elegibilidade, e o de **Destaque mensal** define a faixa superior. O painel compara automaticamente as trilhas concluídas e a posição de cada equipe com o mês anterior, exibindo subida, queda ou estabilidade; as exportações CSV e PDF preservam as duas variações. Caso o período anterior ou o histórico não possam ser carregados, a coordenação visualiza um aviso explícito e uma ação de nova tentativa, sem que resultados ausentes sejam tratados como zero. Ao selecionar **Registrar mês**, a coordenação grava um retrato agregado do ranking e das medalhas do período; o histórico preserva somente equipe, mês, posição, metas, progresso e reconhecimento.

## Eventos e participação

A agenda pode habilitar RSVP público, limite de vagas e uma pergunta de retorno pós-evento. A coordenação acompanha inscrições, realiza check-in, marca ausências e consulta os indicadores de participação no próprio evento. Cada participante recebe um acesso privado para enviar sua avaliação sem acesso ao painel operacional. Eventos sem inscrições podem ser excluídos após confirmação; quando houver participantes registrados, o sistema bloqueia a exclusão e orienta o cancelamento para preservar o histórico.

### Indicadores territoriais de eventos

A página **Indicadores de eventos** consolida eventos, inscrições, presenças confirmadas, taxa de comparecimento e avaliação média no intervalo selecionado. Os filtros de data, bairro e região atualizam as leituras por território e por formato de evento. Os gráficos em barras usam presença confirmada como intensidade; resultados são agregados e não expõem nomes, telefones ou e-mails de participantes.

Os indicadores podem ser exportados em **CSV** ou **PDF** com os filtros ativos. Os arquivos trazem somente recorte agregado, eventos, inscrições, presenças, comparecimento e avaliação; não incluem dados pessoais. A coordenação também pode definir uma **meta de presença** por evento. O painel soma metas do período e mostra o percentual de avanço com base em check-ins confirmados.

Antes de gerar o PDF de indicadores ou a apresentação semanal, a coordenação usa **Pré-visualizar** para conferir título, período, identidade visual, métricas e escopo agregado. A exportação só é baixada após o botão **Confirmar exportação em PDF**; a ação **Voltar e ajustar** fecha a prévia sem baixar arquivo e permite revisar filtros ou dados.

Na prévia da apresentação semanal, a coordenação pode escolher os blocos de **resumo executivo**, **comparativo**, **leitura territorial** e **prioridades de mobilização**. Notas estratégicas opcionais são incluídas no documento após confirmação. Cada confirmação cria uma entrada no **Histórico de exportações** da campanha, preservando tipo, período, blocos, notas e snapshot agregado das métricas; esse histórico não armazena contatos ou outros dados pessoais.

Quando um evento agendado para as próximas 48 horas tem meta de presença e ainda não atingiu o objetivo, o painel exibe um alerta com o total restante. O relatório comparativo usa um período anterior de mesma duração e mostra a variação de eventos, inscrições e presenças; filtros territoriais permanecem aplicados nos dois períodos.

O botão **Preparar lembrete** abre o cliente de e-mail da coordenação com assunto e texto prontos para mobilização. O destinatário é sempre escolhido manualmente pela pessoa responsável, que deve utilizar apenas contatos elegíveis e consentidos. Não há envio automático, importação de endereços ou registro de entrega nessa ação. O comparativo também pode ser baixado em **PNG** como gráfico de tendência de eventos, inscrições e presenças.

## Central assistida de comunicação

A central assistida prepara comunicações sem realizar qualquer disparo automático. A coordenação define preferências explícitas de e-mail, WhatsApp e telefone em contatos com consentimento ativo, cria modelos com as variáveis `{{nome}}` e `{{campanha}}`, escolhe um contato elegível e registra a ação antes de abrir o canal manualmente. O histórico registra a ação iniciada, o canal, o modelo e a observação, permitindo auditoria sem alegar entrega da mensagem.

## Playbooks de campo

Playbooks padronizam roteiro de abertura, objetivo, território, pontos de fala e checklist para a equipe de campo. A coordenação cria, edita, ativa ou arquiva cada playbook. Toda edição incrementa sua versão; quando uma visita é sincronizada, o sistema guarda o playbook e a versão usados, inclusive se o registro permanecer temporariamente na fila offline. Perfis parceiros podem consultar somente playbooks ativos durante o canvassing.

Ao criar um playbook, a coordenação pode partir de modelos editáveis para **escuta territorial**, **convite para evento**, **retorno de demanda** e **mobilização voluntária**. Cada modelo preenche um objetivo, roteiro inicial, pontos de fala e checklist; a revisão do conteúdo, do território e do status antes da ativação continua obrigatória.

Cada playbook também pode receber um link opcional para um **vídeo de orientação** próprio da campanha. O vídeo é salvo junto da versão do playbook e fica disponível à equipe que selecionar aquela orientação durante o trabalho de campo. A coordenação deve usar somente vídeos institucionais ou de treinamento autorizados e revisar o link antes da ativação.

Guias e roteiros complementares podem ser anexados em **PDF** de até 5 MB. O arquivo é validado no servidor, armazenado com chave privada por campanha e preserva a versão do playbook no momento do envio. A coordenação gerencia os anexos, enquanto a equipe pode abrir os materiais do playbook selecionado durante a visita.

No envio, a coordenação classifica cada material por **tipo** — guia, roteiro, checklist, norma, apresentação ou outro — e pode informar um **tema** livre. Tipo e tema aparecem nas listas administrativa e operacional para tornar a consulta de documentos mais rápida no campo.

## Benchmark interno de equipe

O Benchmark regional consolida tarefas, entregas, eventos e visitas de campo por **região de trabalho**, sem apresentar nomes ou métricas individuais. Para reduzir risco de reidentificação, resultados de regiões com menos de dois integrantes ativos são suprimidos.

Tanto a gestão de voluntários quanto o benchmark são módulos de coordenação. Eles ficam ocultos para perfis com acesso restrito e, se acessados por link direto, exibem uma mensagem de acesso restrito em vez de carregar dados incompletos.

> O benchmark deve orientar distribuição de recursos, acompanhamento e apoio à equipe. Ele não deve ser usado como avaliação individual, mecanismo disciplinar ou base para exposição pública de desempenho.

| Métrica agregada | Composição |
|---|---|
| Índice operacional | Tarefas concluídas, eventos e visitas de campo, normalizados pelo número de integrantes da região. |
| Grupos protegidos | Regiões com menos de dois integrantes ativos; nenhum indicador de desempenho é exibido. |

## Identidade visual da aplicação

O seletor de identidade visual fica no cabeçalho da navegação lateral e disponibiliza oito paletas: **Vermelho e branco**, **Verde e amarelo**, **Azul e branco**, **Verde esmeralda**, **Laranja**, **Roxo e violeta**, **Azul escuro e vermelho** e **Padrão neutro**. As amostras exibem as três cores predominantes de cada opção antes da seleção.

A escolha é aplicada imediatamente por tokens globais de interface — fundo, superfície, texto, bordas, destaques, botões, gráficos e navegação — e fica salva primeiro no navegador para evitar mudança visual no carregamento. Para usuários autenticados, a mesma preferência também é registrada no perfil e sincronizada nos próximos acessos em outros dispositivos. As paletas usam pares de primeiro plano e fundo com contraste reforçado em textos, botões, foco e itens ativos; não se deve inserir cores fixas em novos componentes quando houver token semântico disponível.

Além das paletas predefinidas, a opção **Paleta personalizada** permite definir manualmente principal, secundária, destaque, fundo, superfície, texto e borda. O formulário só permite aplicar combinações que atinjam o contraste mínimo para texto e ações. A mesma identidade passa a ser usada nos gráficos do painel de eventos, no PNG de tendência, no PDF de indicadores e na apresentação semanal de mobilização, preservando cor de fundo, títulos, cartões e séries gráficas na exportação.

## Validação desta entrega

A entrega foi validada por checagem de tipos e por suíte automatizada de regressão. A suíte cobre contratos de acesso e fluxos dos módulos prioritários, incluindo inscrição consentida de voluntário, pesquisa territorial e acesso administrativo ao benchmark regional.
