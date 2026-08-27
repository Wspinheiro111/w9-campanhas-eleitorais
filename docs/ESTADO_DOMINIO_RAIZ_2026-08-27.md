# Estado operacional do domínio raiz

Em 27 de agosto de 2026, a operação decidiu manter `https://w9campanhaseleitorais.com.br` como endereço principal estável do W9 Campanhas Eleitorais. A tentativa de definir `www` como canônico foi descontinuada porque a borda da plataforma mantém `www` redirecionando para a raiz e uma regra equivalente na aplicação poderia reintroduzir um ciclo de redirecionamento.

## Validação de disponibilidade

| Endereço base | Landing `/` | Login `/login` | Administração `/paineladmin` | Saúde `/api/health` |
| --- | ---: | ---: | ---: | ---: |
| `w9campanhaseleitorais.com.br` | 200 | 200 | 200 | 200 |
| `w9campanhaseleitorais.manus.space` | 200 | 200 | 200 | 200 |

O domínio `.manus.space` foi mantido como contingência. Nenhum registro de e-mail, SPF, DKIM, DMARC, MX ou configuração de SSL foi alterado nesta validação.
