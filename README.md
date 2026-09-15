# Memória Reflexiva

Aplicativo para organizar fontes e apoiar reflexões com autoria. A fundação usa Next.js, React, TypeScript, Tailwind e Supabase.

## Nesta branch de testes

- Login e cadastro por e-mail; rotas privadas verificam o usuário no servidor.
- Biblioteca textual: criar, listar, buscar por título, paginar, ler, editar e excluir com confirmação.
- Importação de TXT e Markdown: leitura UTF-8 no navegador, revisão antes de guardar e validação no servidor ao salvar.
- RLS por proprietário em `sources`; edição e exclusão conferem a versão do texto.

A importação aceita arquivos de até 400 KB e textos de até 100.000 caracteres. Ela guarda somente o texto revisado, não o arquivo original. Não faz interpretação de HTML, extração de PDFs, embeddings ou IA.

## Ambiente e testes

Consulte `.env.example`. Sem flags explícitas, cadastro e biblioteca ficam ativos somente em Vercel Preview. Chaves administrativas nunca devem entrar no repositório nem usar prefixo `NEXT_PUBLIC_`.

Com Node.js 24: `npm ci`, `npm test`, `npm run lint` e `npm run build`. O workflow também testa acesso sem sessão às rotas privadas. O workflow de banco usa PostgreSQL 17 descartável.

`tests/database/bootstrap.sql` é exclusivo do banco descartável: nunca executá-lo no Supabase real. O histórico local foi reconciliado com as versões consultadas no projeto; o antigo helper de configuração foi removido e não é recriado em instalações novas.

O PR de testes permanece separado da `main`. O estado das conexões, limites de validação e pendências de Storage estão em `docs/PROJECT_STATUS.md`; o roteiro de uso está em `docs/TEST_ACCESS.md`.
