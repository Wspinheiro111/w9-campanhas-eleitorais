# Assistente eleitoral com Gemini

## Integração

O W9 utilizará a API direta do Google Gemini exclusivamente no servidor, por meio da variável de ambiente `GEMINI_API_KEY`. A chave não pode ser exposta ao navegador, registrada em logs ou incluída em código-fonte.

## Fontes normativas prioritárias

As respostas sobre legislação eleitoral deverão orientar o usuário a consultar normas e documentos oficiais do Tribunal Superior Eleitoral, incluindo Código Eleitoral, Lei das Eleições, resoluções, portarias, instruções normativas e a sistematização de normas eleitorais.

## Limites operacionais

O assistente deve responder em português brasileiro, indicar que sua resposta é informativa, não afirmar certificação ou parecer jurídico, não inventar fontes e recomendar revisão por advogado eleitoralista ou contador responsável quando houver caso concreto, prazo decisivo ou consequência jurídica.

## Fontes externas verificadas

- Google AI for Developers — Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Tribunal Superior Eleitoral — Legislação: https://www.tse.jus.br/legislacao
