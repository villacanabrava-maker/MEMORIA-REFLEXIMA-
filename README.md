# Memória Reflexiva

Aplicativo para guardar fontes e apoiar futuras memórias e reflexões sem retirar do usuário a decisão sobre sua autoria.

## Incremento: biblioteca textual

Esta branch implementa cadastro, listagem, busca por título, paginação, leitura, edição e exclusão confirmada de textos. O painel usa contagens do banco quando disponível. Recursos de IA, upload e reflexões continuam identificados como futuros, não como funcionalidades prontas.

A autenticação é verificada no servidor antes de ler ou alterar dados. A migração proposta usa RLS por proprietário e permissões por coluna. Edições e exclusões verificam a versão carregada para não sobrescrever alterações concorrentes.

**O incremento não está ativado em produção.** A flag de servidor `PRIVATE_LIBRARY_ENABLED` fica desativada por padrão. Sem ela, não são exibidos formulários de gravação e as ações recusam alterações. A flag é um controle de implantação, não substitui RLS ou autenticação.

## Segurança e ativação

O histórico registra uma chave administrativa exposta, sem confirmação de revogação. Antes de aplicar a migração ou guardar dados reais, revogue/substitua a chave no painel do Supabase e atualize somente os serviços que a utilizam. Não envie a nova chave por chat nem pelo repositório.

1. Confirmar a revogação da chave exposta.
2. Conferir `Application quality` e `Database security` no GitHub Actions.
3. Aplicar `supabase/migrations/20260915220000_create_sources.sql` pelo histórico de migrações do Supabase.
4. Testar login real e CRUD com dois usuários em ambiente controlado.
5. Ativar `PRIVATE_LIBRARY_ENABLED=true` primeiro na prévia e só depois promover a produção.

Não execute `tests/database/bootstrap.sql` no Supabase: ele existe apenas para um PostgreSQL descartável de testes.

## Desenvolvimento

Requer Node.js 24, compatível com a configuração consultada da Vercel.

```sh
npm ci
cp .env.example .env.local
npm run dev
npm test
npm run lint
npm run build
```

Configure as variáveis públicas em `.env.local` ou no ambiente da hospedagem. Chaves administrativas e de IA nunca devem receber prefixo `NEXT_PUBLIC_`. O aplicativo deste incremento usa apenas o cliente público e a sessão autenticada, sem chave administrativa.

## Limites explícitos

- Texto: até 100.000 caracteres; título: até 200.
- Busca somente pelo título, sem busca semântica.
- Exclusão permanente, com confirmação; ainda não há lixeira nem histórico de versões.
- Sem arquivos, processamento por IA, embeddings ou criação de reflexões.
- Testes SQL usam usuários fictícios; não substituem a validação de Auth, JWT e PostgREST reais.

Consulte `docs/PROJECT_STATUS.md` para os destinos verificados e as pendências.
