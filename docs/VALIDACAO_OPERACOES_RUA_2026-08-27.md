# Validação — Operações de Rua, Demandas e Materiais

## Evidências confirmadas

- A migração `0060_late_khan.sql` criou as tabelas de ações de rua, check-ins, demandas comunitárias, histórico de devolutivas, catálogo de materiais e movimentações.
- A execução inicial identificou o limite de tamanho de nomes de chaves estrangeiras do banco. As tabelas já criadas foram preservadas e as restrições restantes foram aplicadas com nomes curtos e compatíveis, sem remoção ou alteração de dados existentes.
- A verificação de tipos foi aprovada e a suíte automatizada concluiu com **196 testes aprovados**, incluindo cinco testes específicos para permissões de rua, demandas e materiais.
- A rota `/operacoes-rua` foi aberta na prévia sem sessão e encaminhou corretamente para `/login`, sem tela em branco ou erro de console.

## Validação autenticada pendente

A inspeção visual completa da nova tela depende de uma sessão autenticada na prévia. Nenhum dado de demonstração foi criado para esse fim. Após a publicação, a validação deve confirmar a criação de ação de rua, check-in próprio, protocolo de demanda e movimentação de material em uma campanha autorizada.
