# Acesso ao domínio — 25 de agosto de 2026

Foi confirmado acesso autenticado ao Portal do Cliente HostGator e à Zona DNS avançada de `w9campanhaseleitorais.com.br`.

Antes da alteração, os apontamentos de site são `A @ → 69.6.249.231` e `CNAME www → w9campanhaseleitorais.com.br`. Os registros de e-mail, incluindo MX, SPF, DKIM e SRV, devem ser preservados.

O usuário forneceu os IPs do Manus `104.18.26.246` e `104.18.27.246` para o domínio raiz e `www`. Como CNAME e A não podem coexistir para o mesmo nome, o plano DNS compatível confirmado foi manter registros A no domínio raiz e usar um CNAME para `www`:

- `A @ → 104.18.26.246`
- `A @ → 104.18.27.246`
- `CNAME www → cname.manus.space`

Nenhum registro MX, SPF, DKIM, SRV ou subdomínio de e-mail será alterado.

## Estado da aplicação

- O registro `A @ → 69.6.249.231` foi substituído por `A @ → 104.18.26.246`.
- O `CNAME www → w9campanhaseleitorais.com.br` foi alterado com sucesso para `CNAME www → cname.manus.space`, com TTL de 3600 segundos. A confirmação de sucesso foi exibida pela HostGator.
- Os CNAMEs de `webmail` e `cpanel`, bem como os registros MX, SPF, DKIM, SRV e os subdomínios de e-mail, foram preservados sem modificações.
- A Zona DNS avançada da HostGator não concluiu a inclusão do segundo `A @ → 104.18.27.246`, embora nome, TTL e IPv4 tenham sido preenchidos. A interface permaneceu com o formulário aberto e sem apresentar confirmação ou erro. Não houve repetição da operação nem remoção do A já aplicado.

## Próximas validações

- A propagação do `A @ → 104.18.26.246` e do `CNAME www → cname.manus.space` foi observada por consulta pública. O host `www.w9campanhaseleitorais.com.br` já está listado no projeto Manus, redireciona HTTP para HTTPS e responde `200` à landing comercial do W9 Campanhas Eleitorais.
- O domínio raiz `w9campanhaseleitorais.com.br` foi posteriormente adicionado à lista de domínios do projeto Manus. Após o vínculo, passou a retornar `301` de HTTP para HTTPS e `200` em HTTPS com a landing comercial do W9 Campanhas Eleitorais; o certificado TLS está ativo.
- O segundo `A @ → 104.18.27.246` continua ausente porque o editor avançado da HostGator não confirmou sua criação. Como o domínio raiz está respondendo com HTTPS pelo primeiro A e o domínio foi validado pela plataforma, esse segundo IP não bloqueia a publicação. Ele pode ser solicitado posteriormente ao suporte como melhoria de redundância, sem remover o A vigente nem tocar em e-mail.

## Atendimento HostGator

Em 25 de agosto de 2026, foi aberta uma conversa com o assistente de suporte da HostGator para solicitar a inclusão do segundo registro `A @ → 104.18.27.246` com TTL de 3600 segundos, ou a confirmação do procedimento correto caso a inclusão múltipla não seja permitida pelo editor. O assistente recomendou a abertura de um chamado técnico, mas o formulário mostrou apenas a categoria de emissão de CSR, que não correspondia à solicitação de Zona DNS. Nenhum chamado de CSR foi enviado e nenhum registro de e-mail foi alterado. Durante essa verificação, o domínio raiz foi vinculado e validado pelo Manus, tornando o segundo A não bloqueante.
