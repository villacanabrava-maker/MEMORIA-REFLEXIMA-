# Memória Reflexiva

Aplicativo web privado para guardar fontes, recuperar memórias com evidências e apoiar a criação de reflexões sem retirar do usuário a decisão sobre sua própria autoria.

## Estado atual

- Fundação criada com Next.js 16, React 19, TypeScript e Tailwind CSS 4.
- Primeira tela responsiva criada em português.
- Os números exibem somente o estado vazio do protótipo; não há banco conectado.
- Supabase Auth responde corretamente usando apenas a conexão pública.
- Repositório remoto informado: `villacanabrava-maker/MEMORIA-REFLEXIMA-`.
- O envio ao GitHub e a vinculação com a Vercel ainda dependem do acesso de escrita das conexões.

## Ordem segura de configuração

1. Substituir a chave administrativa que foi compartilhada por engano.
2. Concluir o envio seguro do código ao GitHub.
3. Criar e vincular um projeto Vercel.
4. Cadastrar as variáveis públicas diretamente na Vercel.
5. Criar o esquema mínimo do banco com permissões explícitas e RLS.

Consulte `.env.example` para os nomes das variáveis públicas. Chaves administrativas ou de IA nunca devem usar o prefixo `NEXT_PUBLIC_`.
