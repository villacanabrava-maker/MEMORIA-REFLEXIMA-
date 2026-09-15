# Estado do projeto

## Destinos confirmados em 15 de setembro de 2026

- GitHub: `villacanabrava-maker/MEMORIA-REFLEXIMA-`, base `main` em `c8a496f2c3cf652a3601232278708b2ae0d03521`.
- Supabase: `MEMORIA-REFLEXIMA-`, referência `qkwcermdjgmvenzskevw`. Consulta ao esquema `public` retornou zero tabelas.
- Vercel: projeto `memoria-reflexima`, ID `prj_s7r3fEDQ23WFDhBgX0SoxQ3Ovca9`, equipe `roberth4`, Next.js, Node.js 24.
- Produção consultada: `dpl_HszsWTwdtkYN7WFCAZFHQGgSo3sJ`, estado `READY`, domínio `memoria-reflexima.vercel.app`.
- Os projetos distintos `reflexao-pessoal` e `memoria-reflexiva` não são destinos desta entrega.

## Incremento preparado em branch separada

- Biblioteca com criar, listar, buscar pelo título, paginar, abrir, editar e excluir textos.
- Formulários com validação no servidor, estados de erro e processamento, confirmação de exclusão e limites de tamanho.
- Verificação da versão antes de editar/excluir e carimbo de atualização monotônico no banco.
- Contagens do banco; indisponibilidade não é mostrada como uma biblioteca vazia.
- Login com retorno limitado a rotas internas conhecidas; botão de saída; verificação de identidade nas consultas e ações.
- Migração de `public.sources`, RLS para cada operação e privilégios por coluna.
- Ativação controlada por `PRIVATE_LIBRARY_ENABLED`, desativada por padrão e somente no servidor.

## Validações

- 42 testes unitários de validação, Unicode, busca e destinos de login executados localmente com sucesso.
- `Application quality` foi incluído para repetir testes, lint, build e verificar acesso anônimo contra cinco rotas privadas.
- `Database security` foi incluído para executar a migração e testes de isolamento/CRUD em PostgreSQL 17 descartável.
- O resultado remoto dos workflows deve ser conferido no GitHub Actions; a existência dos arquivos não significa que a execução passou.
- A clonagem pelo terminal local ficou indisponível por resolução de DNS. Os arquivos foram trabalhados pelo conector GitHub; não foi afirmada uma compilação local completa.
- Não foi realizado login real nem inserido qualquer conteúdo no Supabase remoto.

## Não ativado

A migração não foi aplicada ao projeto Supabase. A versão principal em produção não foi substituída por este incremento. A biblioteca permanece bloqueada até a ativação explícita; recursos de arquivos, IA e reflexões não estão implementados.

## Pendência de segurança

A chave administrativa anteriormente exposta precisa ser revogada/substituída. Nenhum valor de chave foi incluído nesta entrega e a chave exposta não foi utilizada. Não enviar a substituta pela conversa. RLS não neutraliza uma chave administrativa comprometida.

Depois de confirmar a revogação, conferir os testes, aplicar apenas a migração e validar acesso entre dois usuários antes de ativar a biblioteca. O bootstrap de CI nunca deve ser executado no Supabase real.
