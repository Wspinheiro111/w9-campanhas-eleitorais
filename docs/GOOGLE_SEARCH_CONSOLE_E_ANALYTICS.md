# Medição de SEO e Conversão — W9 Campanhas Eleitorais

## O que já foi preparado no site

O W9 Campanhas Eleitorais passou a registrar, sem enviar nome, e-mail, telefone ou outro dado de formulário para a ferramenta analítica, os seguintes eventos públicos: `trailer_opened`, `solution_page_opened`, `seo_solution_view`, `demo_request_submitted` e `contact_request_submitted`. Esses eventos permitem entender quais páginas e chamadas conduzem a solicitações de demonstração.

## Ação necessária no Google Search Console

A verificação do domínio requer uma ação da conta proprietária do domínio no Google Search Console. O método mais seguro é a verificação por DNS, pois ela não exige editar páginas internas ou alterar o domínio oficial.

1. Acesse [Google Search Console](https://search.google.com/search-console/) com a conta que administrará a propriedade.
2. Selecione **Adicionar propriedade** e escolha **Domínio**.
3. Informe `w9campanhaseleitorais.com.br`, sem `https`, `www` ou caminhos.
4. Copie o registro TXT de verificação fornecido pelo Google e adicione-o na zona DNS do domínio. Preserve os registros MX, SPF, DKIM, DMARC e SRV existentes; o TXT do Google é adicional.
5. Após a confirmação, abra **Sitemaps** e envie `https://w9campanhaseleitorais.com.br/sitemap.xml`.
6. Em **Inspeção de URL**, solicite indexação da home e das cinco páginas de soluções. Não solicite indexação de login, painéis, cadastros ou URLs com tokens.

## Rotina semanal de acompanhamento

| Indicador | Fonte | Objetivo da leitura |
|---|---|---|
| Páginas indexadas e erros de rastreamento | Search Console | Confirmar que a home e as cinco soluções estão acessíveis ao Google. |
| Impressões, cliques e consultas | Search Console | Encontrar buscas não relacionadas à marca e oportunidades entre posições 4 e 15. |
| Visualizações de solução e cliques internos | Analytics público | Identificar quais temas atraem interesse comercial. |
| Pedidos de demonstração e contatos | Analytics público + painel interno | Medir conversão real por origem e página de entrada. |

## Parâmetros para campanhas e conteúdo externo

Em links divulgados em Reels, posts, parceiros ou anúncios comerciais, utilize UTMs que não identifiquem pessoas. Exemplo: `https://w9campanhaseleitorais.com.br/?utm_source=instagram&utm_medium=organic_social&utm_campaign=lancamento_2026`. Para tráfego pago comercial, altere apenas o valor de `utm_medium` para `paid_social`.
