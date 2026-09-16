# Estado do projeto — Memória Reflexiva

Atualizado em 16/09/2026.

## Ambiente atual

- Branch de desenvolvimento: `feat/biblioteca-textual`.
- Produção (`main`) permanece separada e não deve ser alterada antes da validação completa.
- Vercel Preview conectado ao GitHub.
- Supabase usado para Auth, Postgres, Storage privado, Queue, Cron, Vault e Edge Function.
- Plano de fusão funcional: `docs/FUSION_PLAN.md`.
- Baseline técnico: `docs/INFRASTRUCTURE_BASELINE.md`.

## Fundação já implementada

- Login e rotas privadas com verificação no servidor.
- RLS por usuário nas tabelas privadas.
- Biblioteca textual legada em `public.sources`.
- Storage privado `library-originals-v1`.
- Upload TUS resumível direto ao Supabase para arquivos de até 50 MB.
- Um único fluxo principal de **Adicionar arquivo**.
- Original preservado separadamente de qualquer conteúdo derivado.

## Processamento universal

- Registro em `public.library_documents`.
- PDF extraído página a página em `public.library_document_pages`.
- Conteúdo textual/DOCX/ODT/RTF em `public.library_document_chunks`.
- Worker em `supabase/functions/library-processing-worker`.
- Fila PGMQ `library_processing`.
- Cron do Supabase ativo a cada 30 segundos.
- Processamento retomável em background; não depende da página do navegador permanecer aberta.
- Imagens e PDFs sem texto podem ser classificados para OCR futuro.
- Áudio/vídeo podem ser classificados para transcrição futura.
- Arquivos desconhecidos permanecem preservados sem execução automática.

## Busca e rastreabilidade

- Full Text Search em páginas e chunks com índices GIN.
- Página `/biblioteca/pesquisar` mantém referência de arquivo e página/parte.
- `public.library_evidence` guarda evidências derivadas de origem validada.
- Busca semântica/pgvector ainda não foi ativada; o plano prevê busca híbrida textual + semântica depois da camada de Memória.

## Validação real já concluída

- PDF real de 170 páginas: 170/170 páginas processadas, 170 com texto, 0 vazias, sem erro final.
- DOCX real: processamento em background concluído e conteúdo salvo em chunks.
- Worker/Queue/Cron já processaram arquivos sem navegador aberto.

## Reconciliação de infraestrutura

A fase exploratória gerou diferenças entre o histórico remoto de migrations e os arquivos locais. Não será feito rewrite destrutivo do banco apenas para igualar timestamps históricos.

A partir do baseline atual:

- toda nova migration deve ser aplicada remotamente e versionada no GitHub com o mesmo timestamp;
- SQL específico de extensões Supabase fica em `supabase/ops/`;
- `20260916052119_reconcile_universal_processing_columns.sql` reconcilia no histórico local os campos usados pelo worker universal;
- `supabase/ops/library-processing-runtime.sql` documenta/recria fila, RPCs e cron sem conter o token secreto;
- `.env.production` foi removido da branch de desenvolvimento e `.gitignore` voltou a bloquear `.env*`, exceto `.env.example`.

## Banco atual

Tabelas privadas principais:

- `sources`
- `library_documents`
- `library_document_pages`
- `library_document_chunks`
- `library_evidence`

A fusão com a visão de produto será aditiva. Nenhuma dessas tabelas será removida ou renomeada para implementar a nova experiência.

## Próxima etapa — Gate 0 e Biblioteca 2.0

Antes da primeira nova tabela de produto:

1. confirmar CI verde no head de reconciliação;
2. confirmar Preview Vercel READY sem `.env.production` versionado;
3. confirmar Queue/Cron/Worker operacionais;
4. manter `main` intocada.

Depois do Gate 0, iniciar a Biblioteca 2.0 com uma nova tabela aditiva `library_items` para metadados humanos e catálogo unificado, sem mover `sources`, `library_documents`, páginas, chunks ou arquivos do Storage.

Fluxo de produto planejado:

`Original -> processamento -> página/chunk -> evidência -> memória -> Meu Cérebro -> reflexão -> revisão -> aprovação -> incorporação autoral`.
