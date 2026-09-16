# Estado do projeto — Memória Reflexiva

Atualizado em 16/09/2026.

## Ambiente atual

- Branch de desenvolvimento: `feat/biblioteca-textual`.
- Produção (`main`) permanece separada e não deve ser alterada antes da validação completa.
- Vercel Preview conectado ao GitHub e criando deployments automáticos novamente.
- Supabase usado para autenticação, banco e Storage privado.

## Biblioteca textual

- Login e rotas privadas.
- Criar, listar, buscar, paginar, abrir, editar e excluir textos.
- RLS por usuário em `public.sources`.
- Importação segura de TXT e Markdown com revisão antes de salvar.

## Arquivos privados

- Um único fluxo principal: **Adicionar arquivo**.
- Aceita qualquer formato de arquivo até 50 MB.
- Upload resumível TUS direto para o Supabase Storage, sem atravessar a memória da Vercel.
- Bucket privado `library-originals-v1`.
- Objetos organizados pela pasta do `auth.uid()` e protegidos por RLS.
- Arquivos aparecem automaticamente na Biblioteca após o upload.
- Biblioteca principal e lista completa mostram nome, formato, tamanho, data, download e exclusão.
- Cada arquivo agora possui uma página própria de **Visualização** dentro da Biblioteca.
- TXT e Markdown de até 400 KB já exibem o texto extraído sem modificar o original.
- Outros formatos continuam preservados e exibem o estado de extração ainda não disponível.

## Última validação concluída

Commit: `a1e765ac268520aa4d8b3a75c2f73631efd298f1`.

- Application quality: SUCCESS — run `35052446174`.
- Database security: SUCCESS — run `35052446278`.
- Vercel Preview: READY — deployment `dpl_EQ6Y4TiUHdCRZGaJdxRCZ6LikbaR`.
- Branch alias: `memoria-reflexima-git-feat-biblioteca-textual-roberth4.vercel.app`.

## Próxima etapa

Ampliar a leitura automática mantendo sempre o original intacto:

1. DOCX — extração de texto bruto com limite próprio de processamento.
2. PDF — extração página a página com limite de tamanho/páginas.
3. ODT e RTF — somente após validar abordagem segura.
4. DOC antigo, Pages e formatos desconhecidos permanecem apenas como original enquanto não houver extrator confiável.

O limite de 50 MB é de armazenamento, não de processamento. A extração deve usar limites menores e falhar com segurança, mantendo o original disponível.

Depois da camada de extração: texto revisável → evidências/trechos → memória → relações → reflexão/IA com rastreabilidade da fonte.
