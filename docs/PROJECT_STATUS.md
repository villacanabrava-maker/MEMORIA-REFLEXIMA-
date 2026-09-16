# Estado do projeto — Memória Reflexiva

Atualizado em 16/09/2026.

## Ambiente atual

- Branch de desenvolvimento: `feat/biblioteca-textual`.
- Produção (`main`) permanece separada e não deve ser alterada antes da validação completa.
- Vercel Preview conectado ao GitHub; Preview de Meu Cérebro validado como READY.
- Supabase usado para Auth, Postgres, Storage privado, Queue, Cron, Vault e Edge Function.
- Plano de fusão funcional: `docs/FUSION_PLAN.md`.
- Baseline técnico: `docs/INFRASTRUCTURE_BASELINE.md`.

## Fundação implementada

- Login e rotas privadas com verificação no servidor.
- RLS por usuário nas tabelas privadas.
- Biblioteca textual legada em `public.sources` preservada.
- Storage privado `library-originals-v1`.
- Upload TUS resumível direto ao Supabase para arquivos de até 50 MB.
- Original preservado separadamente de qualquer conteúdo derivado.
- `.env.production` removido da branch de desenvolvimento; `.gitignore` bloqueia `.env*` exceto `.env.example`.

## Processamento universal

- `library_documents` registra arquivos processados.
- PDFs são extraídos página a página em `library_document_pages`.
- DOCX/TXT/MD/ODT/RTF e formatos textuais compatíveis geram chunks em `library_document_chunks`.
- Worker em `supabase/functions/library-processing-worker`.
- Fila PGMQ `library_processing` + Cron a cada 30 segundos.
- Processamento retomável em background sem depender do navegador aberto.
- Imagens/PDFs sem texto ficam preparados para OCR futuro; áudio/vídeo para transcrição futura; formatos desconhecidos permanecem preservados.

## Biblioteca 2.0

- `library_items` funciona como catálogo humano sem substituir as origens técnicas.
- Arquivos e textos aparecem numa Biblioteca unificada.
- Metadados: tipo, autoria, autor, ano, categoria, tema e descrição.
- Novos `library_documents` e `sources` são catalogados automaticamente.
- Itens antigos foram catalogados sem mover ou reprocessar conteúdo.
- Autoria antiga permanece `unknown` até revisão humana.
- Cliente não pode trocar proprietário, origem técnica ou estado autoral interno.

## Busca e Evidências 2.0

- Full Text Search em páginas e chunks com índices GIN.
- `/biblioteca/pesquisar` preserva referência de arquivo e página/parte.
- `library_evidence` guarda evidências privadas ligadas à fonte real.
- Evidências precisas armazenam offsets, contexto e timestamp da fonte processada.
- Criação de evidência usa RPC protegida que relê a fonte no banco; o navegador não fornece o texto citado.
- INSERT direto de evidência pelo cliente é proibido; o trecho citado é imutável pelo cliente.
- Busca semântica/pgvector ainda não foi ativada.

## Minha Memória

- `memory_nodes`: conceito, tema, experiência, pessoa, acontecimento, história, padrão ou ideia.
- `memory_evidence`: liga memórias às evidências que as sustentam/contextualizam/contrastam/exemplificam.
- `memory_relations`: relações privadas entre memórias, incluindo `related_to`, `contrasts_with`, `evolved_from`, `supports`, `part_of`, `example_of` e `influences`.
- Interface manual criada para listar, criar, editar e relacionar memórias.
- Memória permanece separada do texto documental: evidência registra o que a fonte diz; memória registra a compreensão do usuário.

## Meu Cérebro — primeira versão rastreável

- `brain_insights`: interpretações sobre estilo, temas, conceitos, forma de pensar, histórias, evolução e tensões.
- `brain_insight_memories`: memórias relacionadas à interpretação.
- `brain_insight_evidence`: evidências documentais relacionadas à interpretação.
- `brain_feedback`: histórico append-only de avaliações humanas (`correct`, `partial`, `incorrect`).
- Insight criado pelo navegador nasce com `origin = manual`; o cliente não pode falsificar `origin = ai`.
- Interface `/cerebro` criada com criação, edição, tela “Por que você concluiu isso?” e feedback humano.
- Geração automática por IA ainda NÃO está habilitada.
- Dashboard mostra contagens reais de Biblioteca, Evidências, Memória e Meu Cérebro.

## Segurança e CI

Os testes em PostgreSQL 17 descartável validam atualmente:

- RLS e isolamento de `sources`;
- catálogo `library_items`, autocatalogação e mutações restritas;
- evidências precisas, anti-forgery e proveniência;
- memória, ligações e relações entre usuários;
- Meu Cérebro, proveniência, bloqueio de origem de IA pelo cliente e feedback imutável.

Application quality cobre testes Node, lint, build Next.js e smoke tests de rotas privadas.

## Validação real já concluída

- PDF real de 170 páginas: 170/170 páginas processadas, 170 com texto, 0 vazias, sem erro final.
- DOCX real: processamento em background concluído e conteúdo salvo em chunks.
- Worker/Queue/Cron já processaram arquivos sem navegador aberto.

## Reconciliação de infraestrutura

A fase exploratória gerou diferenças entre migrations remotas antigas e arquivos locais. Não será feito rewrite destrutivo apenas para igualar timestamps históricos.

A partir do baseline reconciliado:

- toda nova migration é aplicada remotamente e versionada no GitHub com o mesmo timestamp;
- SQL específico de extensões Supabase fica em `supabase/ops/`;
- `20260916052119_reconcile_universal_processing_columns.sql` reconcilia campos usados pelo worker universal;
- `supabase/ops/library-processing-runtime.sql` documenta/recria fila, RPCs e cron sem conter o token secreto.

## Próxima etapa

A próxima grande camada é **Criar Reflexão**, mas antes da geração de texto final serão preparadas duas capacidades reutilizáveis:

1. recuperação controlada de contexto (Biblioteca + Memória + Meu Cérebro), inicialmente textual e depois híbrida com pgvector;
2. geração estruturada de sugestões/insights por IA com proveniência, versão do modelo e revisão humana obrigatória.

Fluxo de produto atual:

`Original -> processamento -> página/chunk -> evidência -> memória -> Meu Cérebro -> reflexão -> revisão -> aprovação -> incorporação autoral`.

Regra permanente: conteúdo gerado por IA não entra automaticamente na memória autoral; somente conteúdo explicitamente revisado/aprovado pelo usuário poderá ser incorporado.
