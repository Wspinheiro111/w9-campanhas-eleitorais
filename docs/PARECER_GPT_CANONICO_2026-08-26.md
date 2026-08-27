# Parecer técnico GPT — domínio canônico W9

Data da consulta: 26 de agosto de 2026.

## Evidência analisada

Na consulta pública mais recente, `https://w9campanhaseleitorais.com.br` respondeu `200`, enquanto `https://www.w9campanhaseleitorais.com.br` respondeu `301` com destino para o domínio raiz. Como esse salto ocorre antes da aplicação, a hipótese técnica mais provável é uma regra de domínio primário na borda da plataforma ou CDN.

> A recomendação do parecer é **não** reativar o middleware da aplicação enquanto existir a regra inversa `www → raiz`, pois isso pode criar um ciclo de redirecionamentos.

## Decisão recomendada

| Camada | Decisão | Motivo |
| --- | --- | --- |
| Plataforma/CDN | Definir `www.w9campanhaseleitorais.com.br` como domínio primário e aplicar `301` da raiz para `www`. | A regra atual é executada antes de a aplicação receber a requisição. |
| DNS | Manter o A da raiz e o CNAME de `www` atuais, salvo instrução explícita da plataforma. | DNS direciona hosts; não executa `301`. |
| Aplicação | Manter o middleware canônico desativado até a borda não ter mais `www → raiz`. | Evita novo loop raiz ↔ www. |
| E-mail | Não alterar MX, SPF, DKIM, DMARC ou SRV. | Preserva a operação de e-mail. |

## Solicitação objetiva para a plataforma

Definir `www.w9campanhaseleitorais.com.br` como domínio canônico/primário e configurar redirecionamento HTTP permanente `301` de `https://w9campanhaseleitorais.com.br` para `https://www.w9campanhaseleitorais.com.br`, preservando HTTPS, caminho e parâmetros de URL. Remover ou inverter qualquer regra atual de `www` para a raiz e limpar cache de redirecionamento na borda, quando aplicável.

## Rollback

Se houver loop, falha de login ou erro TLS, reverter somente a configuração canônica na borda ao estado anterior e limpar o cache de `301`. Não é necessário alterar DNS ou os registros de e-mail para esse rollback.

## Critérios de aceite

| Verificação | Resultado esperado |
| --- | --- |
| Raiz com caminho e query | `301` em um salto para `https://www.w9campanhaseleitorais.com.br/<caminho>?<query>`. |
| www | `200` em HTTPS, sem retorno à raiz. |
| TLS | Certificado válido nos dois hosts. |
| Login por senha | Sessão criada e mantida no `www`. |
| Google OAuth | Início e retorno sem loop ou erro de callback; validar após a borda canônica estar ativa. |
| E-mail | MX, SPF, DKIM, DMARC e SRV inalterados. |

## Limite da recomendação

O parecer técnico não substitui a alteração na plataforma. Como a borda atual controla o redirecionamento, a mudança deve ser aplicada pelo painel que administra o domínio primário ou pelo suporte oficial da plataforma.
