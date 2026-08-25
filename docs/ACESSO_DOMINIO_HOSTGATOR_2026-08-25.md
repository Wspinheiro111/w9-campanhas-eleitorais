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
- O domínio raiz `w9campanhaseleitorais.com.br` ainda não está listado entre os domínios do projeto Manus. No momento da verificação, HTTP retornou `409` e HTTPS não concluiu o handshake TLS; portanto, ele não deve ser divulgado como endereço ativo antes do vínculo e da emissão de SSL pela plataforma.
- Incluir o segundo A raiz apenas após a HostGator aceitar a operação ou confirmar o procedimento pelo suporte.
- Vincular e validar o domínio raiz `w9campanhaseleitorais.com.br` no painel de Domínios do projeto Manus. O host `www` já consta na lista e está funcional; o raiz ainda não deve ser considerado ativo antes da validação e da emissão de SSL pela plataforma.
