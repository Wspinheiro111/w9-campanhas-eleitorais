# Validação publicada — Central de Comando W9

Data da verificação: 26 de agosto de 2026.

## Escopo verificado

A rota publicada `https://w9campanhaseleitorais.com.br/paineladmin` foi aberta em sessão autenticada do administrador exclusivo. A página exibiu o cabeçalho de **Portal independente**, a identificação **Central de Comando W9**, o e-mail autorizado e a navegação própria, fora do layout operacional.

## Evidências confirmadas

| Área | Resultado |
| --- | --- |
| Visão geral | Carregou sem página em branco e identificou os dados como reais. |
| Organizações | Exibiu 1 organização, sendo 1 ativa e 0 suspensas. |
| Clientes e usuários | Exibiu 0 clientes e 1 usuário; 0 aguardando primeiro acesso. |
| Comercial | Exibiu 0 novas demonstrações e 0 novos contatos. |
| Navegação | Exibiu Visão geral, Clientes e usuários, Segurança, Saúde da plataforma e Capacidades futuras. |
| Acesso | Permaneceu restrito à sessão de `gerentewilliam.pinheiro@gmail.com`. |

Os indicadores não exibem senhas, hashes, segredos, sessões ou dados pessoais de terceiros.

## Módulos adicionais verificados

| Área | Resultado |
| --- | --- |
| Segurança | Carregou fatores MFA, passkeys, eventos de autenticação e falhas agregadas, sem expor identidades ou segredos. |
| Saúde da plataforma | Carregou requisições, latência média, erros 5xx e erros de interface em períodos definidos. |
| Operação | No momento da verificação, a telemetria exibiu 19 requisições em 24h, 82 ms de média, 0 erros 5xx e 2 ocorrências de interface em 7 dias. |

As quantidades são observacionais e variam com o uso da plataforma. Recursos sem fonte operacional — como backups gerenciados, filas externas e cobrança SaaS — permanecem identificados como capacidades futuras, sem dados inventados.

## Carteira e módulos futuros

| Área | Resultado |
| --- | --- |
| Clientes e usuários | A navegação abriu a carteira existente, os filtros de exportação e o formulário de usuário master com e-mail, CPF/CNPJ, telefone e senha provisória. |
| Senha provisória | A interface informa que a senha deve ser trocada no primeiro acesso. |
| Capacidades futuras | Planos/licenças, cobrança, tickets e feature flags foram exibidos somente como capacidades sem fonte de dados configurada. |

Não foram encontrados dados simulados nessas seções durante a validação visual publicada.
