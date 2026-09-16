# Memória Reflexiva

Aplicativo pessoal para transformar arquivos, textos e produção autoral em uma memória rastreável que futuramente apoiará análise do estilo, busca no acervo e criação de novas reflexões com revisão humana.

A fundação usa Next.js, React, TypeScript, Tailwind e Supabase.

## Estado atual da branch de desenvolvimento

- Login e rotas privadas com validação no servidor.
- Biblioteca textual em `sources`.
- Upload universal de arquivos com original preservado em Storage privado.
- Upload TUS resumível direto ao Supabase para arquivos de até 50 MB.
- Processamento assíncrono em segundo plano com Supabase Queue + Cron + Edge Function.
- PDF extraído página a página e de forma retomável.
- TXT/Markdown/DOCX/ODT/RTF e outros formatos textuais compatíveis geram conteúdo derivado em chunks.
- Imagens/PDFs sem texto podem ser classificados para OCR futuro; áudio/vídeo para transcrição futura.
- Pesquisa textual unificada no conteúdo processado.
- Evidências privadas com vínculo verificável ao arquivo e à página/parte de origem.
- RLS por proprietário nas tabelas privadas e Storage.

O arquivo original nunca é silenciosamente modificado pelo processamento.

## Direção do produto

A evolução planejada é aditiva:

`Original -> processamento -> página/chunk -> evidência -> memória -> Meu Cérebro -> criação de reflexão -> revisão -> aprovação -> incorporação autoral`

O plano completo de fusão entre a visão funcional e a infraestrutura já construída está em:

- `docs/FUSION_PLAN.md`
- `docs/INFRASTRUCTURE_BASELINE.md`
- `docs/PROJECT_STATUS.md`

## Infraestrutura Supabase

- Bucket privado: `library-originals-v1`.
- Fila: `library_processing`.
- Worker: `supabase/functions/library-processing-worker`.
- Manifesto operacional Supabase-específico: `supabase/ops/library-processing-runtime.sql`.
- Migrations PostgreSQL portáveis ficam em `supabase/migrations/`.

Segredos não devem ser commitados. O repositório mantém apenas `.env.example` com placeholders; deploys devem usar variáveis configuradas no ambiente da Vercel/Supabase.

## Ambiente e testes

Com Node.js 24:

- `npm ci`
- `npm test`
- `npm run lint`
- `npm run build`

O workflow de aplicação também testa acesso anônimo às rotas privadas. O workflow de banco usa PostgreSQL 17 descartável e aplica sequencialmente as migrations portáveis.

`tests/database/bootstrap.sql` é exclusivo do banco descartável de CI e nunca deve ser executado no Supabase real.

## Estratégia de desenvolvimento

A branch `feat/biblioteca-textual` continua separada de `main`. Mudanças de schema novas devem ser backward-compatible, testadas e possuir correspondência de migration entre Supabase remoto e GitHub antes de avançarmos para a próxima fase.
