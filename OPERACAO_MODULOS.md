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

| Recurso | Acesso | Comportamento |
|---|---|---|
| Identidade visual | Coordenação com permissão de gestão | Altera cores, logotipo e assinatura apenas da campanha ativa. |
| Progresso da trilha | Voluntário no portal privado | Mostra percentual, quantidade concluída e etapas restantes para a emissão. |
| Histórico de certificados | Voluntário no portal privado | Lista os certificados emitidos no vínculo da campanha e permite baixar novamente o PDF. |
| Lembrete de pendências | Voluntário no portal privado | Exibe aviso visual com quantidade de módulos pendentes e atalho para a trilha. |

> O histórico e os arquivos exportados continuam vinculados ao acesso privado do voluntário. A personalização visual não altera o código, a data ou as regras de validação do certificado.

Quando a coordenação publica uma nova etapa em uma trilha já concluída, a formação volta a ficar pendente até que o voluntário conclua a etapa adicional. A nova conclusão gera uma **nova versão imutável** do certificado, com código e data próprios. As versões anteriores permanecem no histórico, podem ser exportadas novamente e continuam válidas para a consulta interna por QR Code.

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
