# Acesso ao ambiente de testes

## Atualização de 15/09/2026

O usuário autorizou continuar no projeto de testes sem aguardar a rotação de credenciais. Isso substitui o bloqueio operacional descrito anteriormente, mas não significa que a rotação tenha ocorrido.

A migração `create_sources` foi aplicada ao Supabase pelo conector. O teste transacional no banco hospedado relatou aprovação de RLS, propriedade, CRUD, versões antigas e acesso anônimo; os dados temporários foram revertidos. Isso não equivale a um login real pelo navegador.

A tentativa de criar uma conta administrativamente foi bloqueada pela ferramenta. A conta solicitada não foi confirmada como criada e nenhuma credencial do usuário foi colocada neste repositório. Consultas posteriores do conector Supabase retornaram HTTP 502.

Foi instalada uma extensão HTTP temporária no esquema restrito `test_setup_http`, com privilégios revogados de `public`, `anon` e `authenticated`. A remoção foi solicitada, mas retornou 502 e não pôde ser confirmada. Conferir e remover esse helper quando o conector voltar a responder; ele não é usado pela aplicação.

## Cadastro pela aplicação

- `/cadastro` usa somente a API pública `auth.signUp` e a chave publicável já configurada.
- O visitante informa seus próprios dados no formulário. Nenhuma conta é criada por abrir a página.
- Senhas não são retornadas no estado do formulário, colocadas em URLs ou gravadas em logs do código.
- A confirmação de e-mail segue a configuração existente do Supabase. Não se desativa confirmação nem se altera o serviço de e-mail.
- Após confirmar o e-mail, o usuário deve voltar a `/login`. O destino do link enviado depende do Site URL configurado no Supabase.
- Se o Supabase rejeitar o destinatário por falta de configuração de e-mail, o administrador pode criar a conta no painel Authentication > Users ou configurar o SMTP. A interface não contorna essa restrição.

## Ativação apenas em prévia

Sem flags explícitas, cadastro e biblioteca ficam habilitados somente quando `VERCEL_ENV=preview`. Produção e desenvolvimento local continuam desabilitados por padrão.

`SELF_SIGNUP_ENABLED` controla o cadastro e `PRIVATE_LIBRARY_ENABLED` controla a biblioteca. Valores explícitos têm prioridade; apenas `true` habilita. Um valor `false` também desativa na prévia.

Os testes unitários e de renderização não criam contas nem enviam e-mails. Conferir os resultados do commit no GitHub Actions. O fluxo completo autenticado continua pendente até uma conta ser criada e testada.
