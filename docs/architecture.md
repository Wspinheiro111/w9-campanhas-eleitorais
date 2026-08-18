# Arquitetura da Plataforma W9

O sistema adota uma organização **multi-campanha**, na qual os registros operacionais são vinculados a uma campanha e verificados no servidor antes de qualquer leitura ou alteração. Os perfis de campanha são `admin`, `coordinator` e `partner`. Administradores controlam equipe e dados gerais, coordenadores operam os módulos táticos e parceiros têm escopo restrito às próprias tarefas, contatos e registros de campo.

Os recursos de inteligência artificial são chamados exclusivamente no servidor. A camada de IA seleciona um modelo Gemini disponível pelo catálogo do ambiente, mantém as credenciais fora do navegador e guarda apenas o histórico necessário por campanha e usuário. As instruções do assistente delimitam a atuação à organização e à comunicação institucional, impedindo inferências sensíveis, persuasão individualizada e a invenção de fatos.

O fluxo de áudio para CRM seguirá o princípio de minimização de dados: a captura é enviada ao armazenamento seguro, transcrita no servidor e submetida a extração estruturada somente para informações expressamente ditas no relato. A criação ou atualização de um contato deve depender da confirmação de que existe base legítima e consentimento para o registro e eventual contato.
