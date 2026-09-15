import Link from "next/link";

export function LibraryNotice({ status }: { status: "disabled" | "error" }) {
  return (
    <section className="library-panel notice" role="status">
      <p className="eyebrow">{status === "disabled" ? "Ativação pendente" : "Conexão indisponível"}</p>
      <h2>{status === "disabled" ? "A biblioteca está em preparação" : "Não foi possível carregar seus textos"}</h2>
      <p>{status === "disabled" ? "O armazenamento de textos ainda não foi ativado neste ambiente. Nenhum texto pode ser enviado por esta interface enquanto a configuração não estiver concluída." : "Isso não significa que sua biblioteca está vazia. Tente recarregar a página; não exibiremos contadores inventados ou uma falsa confirmação de sucesso."}</p>
      <Link className="workspace-button neutral" href="/biblioteca" prefetch={false}>Voltar à biblioteca</Link>
    </section>
  );
}
