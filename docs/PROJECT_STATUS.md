# Estado do projeto

## Revisão — 15 de setembro de 2026

Destino: `villacanabrava-maker/MEMORIA-REFLEXIMA-`, branch `feat/biblioteca-textual`, PR #1. A `main` e o domínio principal permanecem separados.

### Concluído e verificado anteriormente

- Supabase `qkwcermdjgmvenzskevw` com `public.sources` e RLS por usuário.
- Conta de teste solicitada existente e e-mail confirmado; senha e login completo no navegador não foram validados por automação.
- Helper HTTP temporário removido sem `CASCADE`.
- Biblioteca textual com CRUD, busca, paginação e importação revisável de TXT/Markdown.

### Incremento preparado agora: arquivos originais

O código do módulo privado de arquivos originais foi adicionado, mas **permanece desativado** por `PRIVATE_FILES_ENABLED=false` enquanto o bucket do Supabase não estiver configurado.

- Formatos: PDF, TXT e Markdown; limite de 2 MB.
- Caminho do objeto sempre começa pelo `user.id` validado no servidor.
- Chave do arquivo combina UUID da tentativa, SHA-256 do conteúdo e nome original codificado.
- Upload não usa `upsert`; uma repetição da mesma tentativa só é aceita após conferir o SHA-256 do objeto existente.
- Downloads são servidos como `application/octet-stream` e `attachment`, nunca como HTML/PDF inline.
- Exclusão exige confirmação e passa pela Storage API.
- A listagem não expõe objetos cujo nome interno não possa ser validado.
- APIs sem sessão respondem JSON 401, em vez de redirecionar para HTML.

### Bloqueio atual do Storage

Uma consulta confirmou que o projeto ainda não possui buckets nem políticas em `storage.objects`. A tentativa de criar bucket e políticas pela ferramenta de migração foi bloqueada pela camada de segurança da ferramenta. Não foi contornada por SQL bruto.

O arquivo `supabase/storage/library-originals.sql` documenta a configuração necessária, mas **não foi aplicado** e fica fora de `supabase/migrations` para não quebrar o PostgreSQL descartável do CI, que não possui Supabase Storage.

Somente depois de configurar o bucket privado `library-originals-v1` e suas políticas deve-se definir `PRIVATE_FILES_ENABLED=true` na prévia. Até lá, a tela informa configuração pendente e não oferece upload.

### Próximos passos

1. Conferir os workflows deste commit e a nova prévia.
2. Criar o bucket e políticas pelo caminho de administração do Supabase quando a ferramenta permitir.
3. Ativar `PRIVATE_FILES_ENABLED=true` somente na prévia.
4. Validar login real, upload, download, listagem e exclusão com arquivos fictícios.
5. Só depois iniciar extração de texto/evidências e recursos de IA.
