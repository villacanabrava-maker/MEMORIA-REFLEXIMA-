# Estado do projeto — Memória Reflexiva

Atualizado em 16/09/2026.

## Ambiente atual

- Branch de desenvolvimento: `feat/biblioteca-textual`.
- PR #1 continua em draft; `main` e produção permanecem intocados.
- Supabase é usado para Auth, Postgres, Storage privado, Queue, Cron, Vault e Edge Functions.
- GitHub Actions valida aplicação e segurança do banco em PostgreSQL 17 descartável.
- A integração Vercel/GitHub está conectada, porém o Preview está temporariamente atrasado em relação ao head da branch; o último Preview listado ainda não contém toda a interface de Reflexões.
- Plano de fusão funcional: `docs/FUSION_PLAN.md`.
- Baseline técnico: `docs/INFRASTRUCTURE_BASELINE.md`.

## Fundação implementada

- Login e rotas privadas com verificação no servidor.
- RLS por usuário nas tabelas privadas e grants explícitos para a superfície exposta.
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
- Metadados humanos incluem tipo, autoria, autor, ano, categoria, tema e descrição.
- Novos `library_documents` e `sources` são catalogados automaticamente.
- Itens antigos foram catalogados sem mover ou reprocessar conteúdo.
- Cliente não pode trocar proprietário, origem técnica ou estado autoral interno.

## Busca e Evidências 2.0

- Full Text Search em páginas e chunks com índices GIN.
- `/biblioteca/pesquisar` preserva referência de arquivo e página/parte.
- `library_evidence` guarda evidências privadas ligadas à fonte real.
- Evidências precisas armazenam offsets, contexto e timestamp da fonte processada.
- Criação usa RPC protegida que relê a fonte no banco; o navegador não fornece o texto citado.
- INSERT direto de evidência e alteração do trecho citado são proibidos ao cliente.
- Busca semântica/pgvector ainda não foi ativada.

## Minha Memória

- `memory_nodes`: conceito, tema, experiência, pessoa, acontecimento, história, padrão ou ideia.
- `memory_evidence`: liga memória à evidência sem copiar a fonte.
- `memory_relations`: rede entre memórias (`related_to`, `contrasts_with`, `evolved_from`, `supports`, `part_of`, `example_of`, `influences`).
- Interface manual permite listar, criar, editar e relacionar memórias.
- Regra conceitual: evidência registra o que a fonte diz; memória registra a compreensão escolhida pelo usuário.

## Meu Cérebro — interpretação rastreável

- `brain_insights`: hipóteses interpretativas separadas da identidade/autoria do usuário.
- `brain_insight_memories` e `brain_insight_evidence`: proveniência da interpretação.
- `brain_feedback`: histórico append-only de avaliações (`correct`, `partial`, `incorrect`).
- Cliente não pode falsificar `origin = ai`.
- Interface `/cerebro` inclui criação manual, edição, “Por que você concluiu isso?” e feedback humano.
- `search_brain_context` oferece prévia inspecionável do contexto recuperado a partir de Memórias e Evidências.

## Infraestrutura de IA preparada — ainda desativada

- `brain_generation_runs`: auditoria de provedor, modelo, versão, prompt, objetivo, recuperação, tokens, status e erro.
- `brain_generation_memories` e `brain_generation_evidence`: registram exatamente qual contexto participou de uma execução.
- Contrato de Structured Outputs limita formato, quantidade e tipos de sugestões.
- Validação do servidor rejeita IDs de Memórias/Evidências que não estavam no contexto permitido.
- Edge Function `brain-insight-generator` está implantada e versionada, com `verify_jwt=true`.
- A função usa `store:false`, limita frequência e trata conteúdo recuperado como dado não confiável para reduzir prompt injection.
- A função só chama provedor externo se `BRAIN_AI_ENABLED=true` e `OPENAI_API_KEY` existirem. No estado atual, geração automática permanece DESATIVADA.

## Criar Reflexão — primeira versão funcional

Estruturas:

- `reflections`: identidade da reflexão e estado (`draft`, `review`, `approved`, `archived`).
- `reflection_versions`: histórico imutável de versões/etapas.
- `reflection_memories`: Memórias usadas no processo.
- `reflection_evidence`: Evidências documentais usadas no processo.
- `reflection_insights`: Insights de Meu Cérebro usados no processo.

Etapas representadas no histórico:

1. Externa;
2. Meu comentário;
3. Memórias e contexto (proveniência explícita, não cópia);
4. Conflitos;
5. Plano;
6. Rascunho de IA (reservado ao processo confiável; ainda desativado);
7. Revisão.

Regras:

- nova reflexão sempre nasce como rascunho;
- cliente não escolhe estado arbitrariamente nem cria `ai_draft`;
- cada envio cria uma nova versão; versões antigas não são editáveis pelo cliente;
- transições de estado usam RPCs controladas;
- RPCs `SECURITY DEFINER` têm `search_path=''`, nomes de schema qualificados e execução restrita ao papel autenticado;
- aprovação exige uma versão `revision` do mesmo usuário/reflexão;
- arquivamento de uma reflexão aprovada preserva versão e data da aprovação;
- depois de aprovada/arquivada, novas versões e alterações de proveniência são bloqueadas;
- Memórias, Evidências e Insights de outro usuário não podem ser associados;
- a interface `/reflexoes` permite criar, versionar, revisar, aprovar, arquivar e inspecionar a base rastreável da reflexão.

## Dashboard

A página inicial mostra contagens reais de:

- Minha Biblioteca;
- Evidências;
- Minha Memória;
- Meu Cérebro;
- Reflexões.

## Segurança e CI

Os testes em PostgreSQL 17 descartável validam atualmente:

- RLS e isolamento de `sources`;
- catálogo `library_items`, autocatalogação e mutações restritas;
- evidências precisas, anti-forgery e proveniência;
- memória, ligações e relações entre usuários;
- Meu Cérebro, proveniência, origem de IA protegida e feedback imutável;
- auditoria de geração de IA;
- Reflexões versionadas, estados controlados, versões imutáveis, isolamento por usuário, proveniência Memória/Evidência/Insight congelada após conclusão e preservação do histórico de aprovação.

Application quality cobre testes Node, lint, build Next.js e smoke tests de rotas privadas.

Head validado antes desta atualização documental: `8bb3089d19bab8edf07b20d68b826572898e5e20`.

- Application quality: SUCCESS.
- Database security: SUCCESS.

## Validação real já concluída

- PDF real de 170 páginas: 170/170 páginas processadas, 170 com texto, 0 vazias, sem erro final.
- DOCX real: processamento em background concluído e conteúdo salvo em chunks.
- Worker/Queue/Cron já processaram arquivos sem navegador aberto.

Ainda pendente: E2E autenticado completo das novas áreas de Memória/Cérebro/Reflexões no Preview mais recente.

## Próximas etapas

1. Fazer a Vercel alcançar o head atual e validar visualmente `/reflexoes` em Preview autenticado.
2. Melhorar seleção/pesquisa de Memórias, Evidências e Insights quando houver mais de 100 itens.
3. Criar um conjunto de avaliações em português para comparar modelos antes de habilitar IA real.
4. Definir explicitamente política de retenção/privacidade e configurar o provedor apenas depois dessa decisão.
5. Depois, habilitar de forma gradual o passo 6 (IA) como rascunho, nunca como aprovação automática.
6. Em fase posterior, adicionar busca semântica/pgvector e recuperação híbrida.

Fluxo atual:

`Original -> processamento -> página/chunk -> evidência -> memória -> Meu Cérebro -> reflexão versionada -> revisão humana -> aprovação`.

Regra permanente: conteúdo gerado por IA não entra automaticamente na memória autoral; somente conteúdo explicitamente revisado/aprovado pelo usuário poderá ser incorporado.
