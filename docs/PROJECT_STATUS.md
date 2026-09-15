# Estado do projeto

## Revisão — 15 de setembro de 2026

Destino: `villacanabrava-maker/MEMORIA-REFLEXIMA-`, branch de trabalho `feat/biblioteca-textual`, PR #1. A `main` e o domínio principal não foram substituídos por esta entrega.

### Confirmado nas conexões

- O Supabase do projeto `qkwcermdjgmvenzskevw` voltou a responder.
- `public.sources` existe. A migração da biblioteca foi aplicada anteriormente.
- A conta de teste solicitada consta em Auth e seu e-mail está confirmado. Não foi testada a senha nem realizado login pelo navegador nesta revisão.
- A extensão HTTP temporária foi removida com `RESTRICT`, sem `CASCADE`. Consulta posterior confirmou que `test_setup_http` não existe mais.
- A consulta de Storage mostrou nenhum bucket. A tentativa de configurar a área de arquivos foi bloqueada pela ferramenta; não foi repetida por outro caminho. Não há confirmação de criação de bucket nem de upload de originais.

### Incremento de produto desta revisão

Importação de TXT e Markdown para a biblioteca textual, em `/biblioteca/importar`.

1. O arquivo é lido localmente no navegador, sem envio automático.
2. O conteúdo UTF-8 e o título sugerido aparecem em um formulário editável.
3. Apenas ao clicar em Guardar texto a ação de servidor existente valida a sessão e os campos e grava em `sources` com RLS.

Limites: arquivo de até 400.000 bytes e texto de até 100.000 caracteres. Conteúdo acima do limite é recusado, nunca cortado silenciosamente. Quebras de linha são padronizadas para LF; BOM inicial de UTF-8 é removido, com aviso. Markdown e HTML permanecem texto, sem interpretação. O arquivo original não é armazenado, e esta entrega não faz IA, extração de PDFs nem DOCX.

### Histórico de migrações reconciliado

O nome local de `create_sources` usava uma versão diferente da registrada no Supabase. Foi ajustado para `20260915211428`, sem reaplicar a tabela.

A versão remota `20260915211734` correspondeu ao helper temporário já aposentado. O arquivo local é explicitamente um marcador sem operação, não uma reprodução da instalação: ambientes novos não devem recriar esse helper. A remoção `20260915220335` é idempotente e não usa CASCADE. Nenhuma linha do histórico remoto foi editada.

### Verificação

- 40 testes específicos do decodificador passaram em execução local antes da integração.
- A suíte do repositório acrescenta também teste do retorno seguro de login à importação.
- O workflow executa testes unitários, lint, build e testes HTTP sem sessão, incluindo a nova rota.
- O workflow de banco aplica as migrações apenas a PostgreSQL 17 descartável e verifica o isolamento das fontes.
- Conferir o resultado do commit no GitHub Actions; os resultados finais são registrados no PR. Um build aprovado não comprova o fluxo autenticado no navegador.

### Próximos incrementos

Validar no navegador o fluxo completo: login, importar, revisar, guardar, buscar, editar e excluir. Em seguida, concluir a configuração de Storage para arquivos originais e só depois avançar para extração de evidências e reflexões. Essas etapas não são apresentadas como prontas.
