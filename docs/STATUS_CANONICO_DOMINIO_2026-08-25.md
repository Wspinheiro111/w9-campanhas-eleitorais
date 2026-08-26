# Status do domínio canônico — 25 de agosto de 2026

Após o checkpoint `7a69a2ba`, a verificação pública de `https://w9campanhaseleitorais.com.br/contato?origem=landing` retornou `200`, enquanto `https://www.w9campanhaseleitorais.com.br/` retornou `301` para o domínio raiz. Esse redirecionamento acontece antes de a requisição alcançar o middleware do servidor do projeto.

O projeto contém um redirecionamento permanente `308` de raiz para `www`, testado localmente com preservação de caminho e consulta. Entretanto, não deve ser considerado ativo em produção enquanto a configuração de domínio principal da plataforma continuar enviando `www` para a raiz, pois a combinação causaria um ciclo depois da próxima publicação.

O painel do projeto apresenta o cartão do website com `www.w9campanhaseleitorais.com.br`, mas a interface de projeto não expôs, nesta etapa, o controle de domínio principal. A próxima ação necessária é localizar o painel de Domínios do website e definir `www.w9campanhaseleitorais.com.br` como domínio canônico, ou solicitar suporte da plataforma para essa inversão.
