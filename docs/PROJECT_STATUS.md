# Estado do projeto

## Revisão — 15 de setembro de 2026

Destino: `villacanabrava-maker/MEMORIA-REFLEXIMA-`, branch `feat/biblioteca-textual`, PR #1. A `main` e o domínio principal permanecem separados.

### Biblioteca textual
CRUD, busca, paginação e importação revisável de TXT/Markdown continuam disponíveis na branch de testes, protegidos por autenticação e RLS.

### Arquivos originais — limite elevado para 500 MB
O módulo foi redesenhado para arquivos grandes. O limite de aplicação agora é **500.000.000 bytes (500 MB)** por PDF, TXT ou Markdown.

Arquivos não atravessam uma função da Vercel: o navegador envia diretamente ao Supabase Storage usando o protocolo **TUS resumível**, com blocos de 6 MiB, progresso visível e tentativa de retomada após interrupções. O caminho do objeto começa pelo `user.id` autenticado e não usa `upsert`. Downloads grandes usam URL assinada temporária, evitando carregar centenas de megabytes na memória da função Next.js.

O bucket continua **desativado** por `PRIVATE_FILES_ENABLED=false` porque a ferramenta administrativa ainda não permitiu criar `library-originals-v1`. O arquivo `supabase/storage/library-originals.sql` registra bucket privado, limite de 500 MB, tipos aceitos e RLS por pasta do usuário; ele não foi aplicado.

### Limite da plataforma
A documentação atual do Supabase informa que o limite global de Storage do projeto também precisa permitir 500 MB. Projetos Free têm teto global de 50 MB; Pro e planos superiores podem configurar até 500 GB. Portanto, o app está preparado para 500 MB, mas o Storage só aceitará esse tamanho quando o plano/configuração global do projeto permitir.

### Próximos passos
1. Conferir CI e Vercel Preview do commit de 500 MB.
2. Criar o bucket privado e políticas pelo caminho administrativo autorizado do Supabase.
3. Garantir limite global de Storage >= 500 MB no projeto.
4. Ativar `PRIVATE_FILES_ENABLED=true` somente na prévia.
5. Validar upload resumível, retomada, download e exclusão com arquivos fictícios antes de produção.
