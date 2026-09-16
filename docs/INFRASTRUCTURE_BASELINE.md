# Baseline de infraestrutura — Memória Reflexiva

Atualizado em 16/09/2026.

Este documento registra o estado real auditado do projeto antes da fusão funcional da Biblioteca 2.0. O objetivo é evitar reconstruções destrutivas e impedir que infraestrutura existente dependa apenas de configuração manual no Supabase.

## Regra a partir deste baseline

A partir da migration `20260916052119_reconcile_universal_processing_columns`, toda nova mudança de schema deve seguir a mesma sequência:

1. mudança aditiva e backward-compatible;
2. `Supabase.apply_migration` no projeto remoto;
3. consultar a versão registrada pelo Supabase;
4. criar no GitHub o arquivo com exatamente a mesma versão e nome;
5. CI de banco deve reconstruir a parte PostgreSQL portátil do zero;
6. infraestrutura exclusiva do Supabase fica em `supabase/ops/` quando depender de extensões que não existem no PostgreSQL descartável da CI;
7. somente avançar após CI verde e Preview READY.

## Estado remoto auditado

Projeto Supabase: `qkwcermdjgmvenzskevw`.

### Tabelas privadas

- `public.sources`
- `public.library_documents`
- `public.library_document_pages`
- `public.library_document_chunks`
- `public.library_evidence`

Todas estavam com RLS habilitado na auditoria.

### Storage

Bucket: `library-originals-v1`

- privado;
- limite por objeto: 50.000.000 bytes;
- sem lista global de MIME permitidos;
- políticas SELECT/INSERT/DELETE limitadas à primeira pasta igual ao `auth.uid()`.

O arquivo declarativo existente é `supabase/storage/library-originals.sql`.

### Processamento assíncrono

Fila PGMQ: `library_processing`.

Cron: `library-processing-worker-every-30-seconds`, ativo a cada 30 segundos.

Edge Function versionada no repositório:

`supabase/functions/library-processing-worker/`

Manifesto operacional reproduzível:

`supabase/ops/library-processing-runtime.sql`

O token do worker existe apenas no Supabase Vault sob o nome `library_worker_token`; o valor descriptografado nunca deve ser commitado.

### Extensões Supabase usadas

- `pgmq`
- `pg_cron`
- `pg_net`
- `supabase_vault`
- `pgcrypto`
- `uuid-ossp`

### Funções RPC auditadas

- `enqueue_library_file_processing`
- `search_library_content`
- `verify_library_worker_token`
- `worker_claim_library_processing`
- `worker_complete_library_processing`
- `worker_requeue_library_processing`

## Migration history remoto auditado

O histórico remoto continha operações feitas durante a construção incremental:

- `20260915211428 create_sources`
- `20260915211734 enable_private_http_for_test_account_setup`
- `20260915220335 remove_temporary_http_helper`
- `20260915235847 create_private_library_originals_storage`
- `20260916024530 expand_written_document_mime_types`
- `20260916024903 allow_any_private_library_file_type`
- `20260916035704 add_resumable_document_extraction`
- `20260916040021 harden_resumable_document_ownership`
- `20260916040727 add_universal_file_processing_queue`
- `20260916040838 schedule_universal_library_worker`
- `20260916041039 backfill_existing_library_files_into_queue`
- `20260916042858 add_unified_library_content_search`
- `20260916043914 add_private_library_evidence`
- `20260916052119 reconcile_universal_processing_columns`

As migrations mais antigas não possuem correspondência 1:1 de timestamp no repositório porque algumas mudanças foram aplicadas remotamente durante a fase exploratória. Não reescrever esse histórico em produção apenas para torná-lo esteticamente igual.

A estratégia de reconciliação adotada é:

- preservar o banco real e os dados;
- versionar a definição atual necessária para reconstrução;
- manter operações Supabase-específicas em `supabase/ops/`;
- garantir que toda mudança nova, a partir do baseline, tenha correspondência exata remoto/GitHub.

## Reconciliação concluída nesta fase

A migration `20260916052119_reconcile_universal_processing_columns.sql` garante que uma instalação construída a partir das migrations locais tenha os campos usados pelo worker universal:

- `mime_type`
- `file_size`
- `processor_strategy`
- `processed_bytes`
- `pages_with_text`
- `pages_without_text`
- `completed_at`

Também reconcilia os estados aceitos de `library_documents.status`:

- `pending`
- `queued`
- `processing`
- `completed`
- `needs_ocr`
- `needs_transcription`
- `preserved`
- `error`

## Configuração de ambiente

`.env.production` ainda está rastreado nesta branch, mas contém apenas configuração pública do cliente Supabase no estado auditado. Mesmo assim, arquivos `.env*` não devem continuar sendo fonte de configuração de deploy.

O `.gitignore` foi alterado para não permitir novos `.env.production` após o arquivo atual ser removido do controle de versão.

Próximo passo de segurança:

1. confirmar no painel da Vercel que `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão configuradas para Preview/Production;
2. remover `.env.production` do repositório;
3. manter `.env.example` somente com placeholders;
4. qualquer segredo administrativo exposto anteriormente deve ser rotacionado no Supabase e nunca entrar no Git.

## Gates antes da Biblioteca 2.0

- Database security CI verde.
- Application quality CI verde.
- Vercel Preview READY para o head atual.
- Worker/cron/fila continuam operacionais.
- Nenhuma tabela existente removida ou renomeada.
- Nenhum documento reprocessado apenas para executar a fusão.

Quando esses gates estiverem satisfeitos, a próxima mudança de schema será a criação aditiva de `library_items` como catálogo humano da Biblioteca 2.0.
