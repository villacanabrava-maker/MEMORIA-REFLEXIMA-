# Plano de fusao — Memoria Reflexiva

Atualizado em 16/09/2026.

## Objetivo

Incorporar a visao funcional de Memoria Pessoal + Cerebro Autoral + Construcao de Reflexoes ao aplicativo existente sem destruir, renomear ou reprocessar silenciosamente a base atual.

A estrategia e evolutiva: preservar a infraestrutura validada e adicionar novas camadas sobre ela.

## Estado tecnico auditado

### Aplicacao
- Next.js 16.3.5, React 19.2.8, TypeScript.
- Supabase SSR/Auth.
- Branch de desenvolvimento: `feat/biblioteca-textual`.
- `main` permanece separada.
- CI atual no head auditado: Application quality e Database security aprovados.

### Dados existentes
- `sources`: textos escritos diretamente.
- `library_documents`: registro de arquivos processados.
- `library_document_pages`: texto de PDF por pagina.
- `library_document_chunks`: blocos de documentos textuais/DOCX/ODT/RTF.
- `library_evidence`: evidencias rastreaveis derivadas de pagina/bloco.
- Storage privado `library-originals-v1`, limite 50 MB por arquivo.
- RLS ativo nas tabelas privadas e Storage por pasta do usuario.

### Processamento
- Fila duravel `library_processing` via PGMQ.
- Cron ativo a cada 30 segundos.
- Edge Function worker para processamento universal.
- PDF paginado e retomavel; DOCX/TXT/MD/ODT/RTF com extratores; imagens/midia classificadas para etapas futuras.

### Busca
- Full Text Search em paginas e chunks com indices GIN.
- Resultado mantem arquivo e local de origem.
- Busca semantica ainda nao ativada.

## Riscos que devem ser resolvidos antes da expansao de schema

1. **Historico de migrations divergente**
   O Supabase remoto registra migrations que nao estao todas representadas no repositorio com os mesmos timestamps. Antes de novas tabelas, reconciliar o estado remoto/local e validar um reset completo em ambiente descartavel.

2. **Configuracao de ambiente versionada**
   `.env.production` continua no repositorio publico e `.gitignore` permite explicitamente esse arquivo. Remover do controle de versao somente depois de confirmar que Preview/Production possuem as variaveis necessarias na Vercel; rotacionar qualquer segredo que tenha sido exposto.

3. **Preview da Vercel atrasada**
   O CI do GitHub esta verde no head atual, mas o projeto Vercel ainda apresenta como ultimo deployment um commit anterior com erro. Revalidar a integracao GitHub -> Vercel antes de usar Preview como gate de fusao.

4. **Documentacao operacional desatualizada**
   `README`, `PROJECT_STATUS.md` e o corpo do PR ainda descrevem etapas anteriores. Atualizar apos a reconciliacao tecnica.

## Principio de fusao

Nenhuma tabela atual sera descartada para acomodar a nova visao. Usaremos uma camada de fachada/catalogo e novas entidades relacionadas.

Fluxo preservado:

`Original -> processamento -> pagina/chunk -> evidencia`

Fluxo adicionado:

`evidencia -> memoria -> insight do Cerebro -> projeto de reflexao -> versoes -> aprovacao -> incorporacao autoral`

## Fase 0 — estabilizacao e reconciliacao

- Capturar e comparar migration history remoto/local.
- Produzir uma baseline/reconciliacao versionada sem reexecutar alteracoes destrutivas.
- Garantir que Storage, fila, cron, funcoes RPC e Edge Function estejam reproduziveis a partir do repositorio.
- Fazer reset de banco descartavel e testes de RLS.
- Corrigir pipeline de Preview Vercel.
- Remover/rotacionar configuracao sensivel depois de confirmar variaveis externas.
- Atualizar documentacao e PR.

**Gate:** banco reconstruivel do zero + CI verde + Preview READY.

## Fase 1 — Biblioteca 2.0 (catalogo humano)

Adicionar uma tabela aditiva `library_items`, sem mover dados existentes.

Objetivo: unificar na experiencia do usuario arquivos e textos sem unificar fisicamente os mecanismos internos.

Campos iniciais propostos:
- `id`, `user_id`
- `title`
- `kind` (book, letter, reflection, report, note, document, text, other)
- `authorship` (user, external, mixed, ai)
- `author_name`, `year`, `category`, `theme`, `description`
- referencia opcional a `library_documents` ou `sources`
- `memory_eligible`, `memory_status`
- timestamps

Regras:
- uma origem tecnica continua existindo em exatamente um lugar;
- `library_items` e catalogo/fachada, nao copia do conteudo bruto;
- backfill idempotente cria itens para documentos e sources existentes;
- nova UI usa `library_items`, enquanto rotas antigas permanecem funcionando durante a transicao.

## Fase 2 — Evidencias 2.0

Evoluir `library_evidence` sem quebrar registros existentes:
- permitir selecao de trecho dentro de pagina/chunk;
- manter referencia imutavel a origem;
- guardar offsets/contexto suficiente para revalidacao;
- impedir texto de evidencia inventado pelo cliente;
- adicionar observacao do usuario separada do trecho original.

## Fase 3 — Minha Memoria

Adicionar:
- `memory_nodes`: conceito, tema, experiencia, pessoa, evento, historia, padrao;
- `memory_evidence`: ligacao N:N entre memoria e evidencias;
- `memory_relations`: relacoes tipadas entre memorias;
- `memory_feedback`: confirmacao/correcao humana quando necessario.

Primeiro manual/assistido; automacao de IA entra somente depois de termos rastreabilidade e revisao.

## Fase 4 — Meu Cerebro

Adicionar:
- `brain_insights`: interpretacoes sobre estilo, metodo, temas, conceitos, historias e evolucao;
- `brain_insight_evidence`: provas de cada insight;
- `brain_feedback`: correto, parcial, incorreto, editado.

Regra de produto: nunca apresentar um insight como verdade absoluta; sempre como interpretacao baseada em evidencias.

## Fase 5 — Criar Reflexao

Workflow persistente em 7 etapas:
1. reflexao externa;
2. comentario atual do usuario;
3. memorias/evidencias relacionadas;
4. possiveis conflitos/evolucoes;
5. plano da reflexao;
6. texto gerado;
7. revisao humana.

Tabelas previstas:
- `reflection_projects`
- `reflection_inputs`
- `reflection_context_items`
- `reflection_conflicts`
- `reflection_plans`
- `reflection_versions`

## Fase 6 — Minhas Reflexoes e autoria

Estados:
- draft
- building
- ai_generated
- reviewing
- approved
- finalized
- incorporated

Regra critica: conteudo gerado por IA nunca entra automaticamente na memoria autoral. Somente uma versao explicitamente aprovada e incorporada pelo usuario pode se tornar material elegivel para futuras recuperacoes autorais.

## Fase 7 — Busca hibrida

Manter Full Text Search atual e adicionar busca semantica por significado.

Estrategia:
- pgvector no Postgres;
- embeddings por pagina/chunk/evidencia/memoria conforme utilidade;
- modelo de embeddings multilíngue;
- fusao por RRF entre ranking textual e semantico;
- filtros de tipo, autoria, periodo e fonte antes/depois do ranking.

Nao ativar HNSW por padrao no primeiro momento; medir o acervo e adotar indice aproximado somente quando necessario.

## Fase 8 — IA/RAG autoral

A IA nao recebe o acervo inteiro. O pipeline recupera somente contexto relevante:

`consulta atual -> busca hibrida -> evidencias/memorias -> perfil autoral relevante -> conflitos -> contexto aprovado -> geracao`

Toda resposta/geracao importante deve conseguir apontar de volta para evidencia e origem.

## Fases posteriores

- OCR paginado para imagens/PDFs escaneados.
- Transcricao de audio/video.
- Linha do tempo intelectual.
- Mapa de ideias.
- Conversar com Minha Memoria.
- Narracao/voz.

## Metodologia permanente

Para cada marco:
1. pesquisar documentacao oficial e bibliotecas mantidas;
2. registrar decisao e alternativas;
3. fazer alteracao aditiva/backward-compatible;
4. criar migration versionada;
5. testar reset do banco;
6. testar RLS/seguranca;
7. executar testes, lint e build;
8. publicar Preview;
9. testar fluxo real autenticado;
10. somente depois avancar.

## Proximo passo imediato

Executar a Fase 0. Nao criar `library_items` antes de reconciliar migrations, garantir Preview READY e retirar a dependencia de configuracao sensivel versionada. Depois disso iniciar Biblioteca 2.0 por uma migration aditiva e um backfill idempotente, mantendo todas as rotas e tabelas atuais funcionais durante a transicao.
