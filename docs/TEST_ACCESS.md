# Acesso ao ambiente de testes

## Situação após a revisão de 15/09/2026

A conta de teste solicitada existe no Supabase e o e-mail está confirmado. Isso foi consultado diretamente no banco; não comprova que a senha tenha sido testada nem que o fluxo autenticado completo esteja validado. Nenhuma credencial pessoal foi incluída no código.

Use o alias da branch, que acompanha as próximas publicações bem-sucedidas:

`https://memoria-reflexima-git-feat-biblioteca-textual-roberth4.vercel.app/login`

Links de deploy antigos são imutáveis e podem exibir versões anteriores. O domínio principal continua separado deste PR.

## Teste da importação

Após entrar, abra Biblioteca > Importar TXT / Markdown. Escolha um pequeno arquivo UTF-8, confira que nada foi salvo automaticamente, revise o título e clique em Guardar texto. Em seguida, procure o título na biblioteca, abra o texto, edite e confira a exclusão com confirmação usando somente conteúdo de teste.

A leitura inicial ocorre no navegador. Só o texto revisado é enviado ao salvar; o arquivo original não é guardado. Textos têm limite de 100.000 caracteres; arquivos, 400 KB. Arquivos PDF e DOCX não são aceitos por esse importador.

## Cadastro e ativação

O cadastro `/cadastro` usa a API pública do Supabase e mantém as regras existentes de confirmação. `SELF_SIGNUP_ENABLED` e `PRIVATE_LIBRARY_ENABLED` têm prioridade quando definidos; sem configuração explícita, cadastro e biblioteca ficam habilitados apenas em Vercel Preview. O cadastro não representa garantia de envio de e-mails, que depende do projeto.

## Pendências atualizadas

O antigo helper HTTP foi removido; a consulta confirmou a limpeza. A tentativa de configurar Storage para originais foi bloqueada, então o módulo de originais não foi ativado. A importação de textos desta entrega não depende desse helper nem de buckets.

O usuário autorizou o trabalho neste ambiente de testes sem aguardar rotação de chaves. Isso não confirma que alguma chave tenha sido substituída. Não publicar credenciais no repositório e não usar conteúdo real sensível durante estes testes.
