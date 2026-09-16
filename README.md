# Memória Reflexiva

Aplicativo para organizar fontes e apoiar reflexões com autoria. A fundação usa Next.js, React, TypeScript, Tailwind e Supabase.

## Nesta branch de testes

- Login e cadastro por e-mail; rotas privadas verificam o usuário no servidor.
- Biblioteca textual: criar, listar, buscar por título, paginar, ler, editar e excluir com confirmação.
- Entrada única de arquivos pelo botão **Adicionar arquivo**, com preservação privada do original no Supabase Storage.
- Upload resumível direto ao Supabase para arquivos de até 50 MB.
- RLS por proprietário em `sources`; edição e exclusão conferem a versão do texto.

Arquivos compatíveis podem receber leitura e extração específicas sem alterar o original. Arquivos desconhecidos permanecem preservados com segurança, sem processamento automático.

## Ambiente e testes

Consulte `.env.example`. Sem flags explícitas, cadastro e biblioteca ficam ativos somente em Vercel Preview. Chaves administrativas nunca devem entrar no repositório nem usar prefixo `NEXT_PUBLIC_`.

Com Node.js 24: `npm ci`, `npm test`, `npm run lint` e `npm run build`. O workflow também testa acesso sem sessão às rotas privadas. O workflow de banco usa PostgreSQL 17 descartável.

`tests/database/bootstrap.sql` é exclusivo do banco descartável: nunca executá-lo no Supabase real. O histórico local foi reconciliado com as versões consultadas no projeto; o antigo helper de configuração foi removido e não é recriado em instalações novas.

O PR de testes permanece separado da `main`. O estado das conexões, limites de validação e pendências de Storage estão em `docs/PROJECT_STATUS.md`; o roteiro de uso está em `docs/TEST_ACCESS.md`.

Último disparo de Preview após reconexão GitHub ↔ Vercel: 16/09/2026.
