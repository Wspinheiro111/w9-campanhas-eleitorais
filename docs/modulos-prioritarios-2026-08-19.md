# Módulos Prioritários de Operação

## Canvassing de campo offline

O módulo **Campo offline** permite registrar visitas com resultado, observação, contato relacionado e referência única do dispositivo. Quando a conexão não está disponível, os registros são guardados localmente em IndexedDB; ao restabelecer a rede, o operador sincroniza a fila. A referência única evita duplicação caso a mesma visita seja enviada mais de uma vez.

## Central de consentimento

A **Central de consentimento** mantém registros separados por contato, campanha e organização. Cada autorização registra finalidade, origem, evidência, data, status e eventual revogação. A revogação é histórica: o registro não é apagado e o contato passa a ser bloqueado para novas comunicações caso não reste outra autorização ativa.

## Sala de crise

A **Sala de crise** organiza casos por gravidade e status operacional. Administradores e coordenadores podem abrir casos, acompanhar resposta e registrar decisões; perfis de campo não recebem os controles de gestão. Os registros ficam isolados por campanha e organização.

## Verificação

Os comandos `pnpm check`, `pnpm test` e `pnpm build` foram aprovados após a implementação. A validação inclui contratos de sincronização idempotente, registro de consentimento acessível ao responsável e bloqueio da sala de crise para perfis sem gestão.
