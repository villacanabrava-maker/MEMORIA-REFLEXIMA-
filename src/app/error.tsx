"use client";

export default function AppError({ reset }: { reset: () => void }) {
  return <main><section className="library-panel"><h1>Não foi possível concluir esta operação</h1><p>Seu conteúdo não será exibido em mensagens de erro. Verifique a conexão e tente novamente.</p><button className="workspace-button neutral" onClick={() => reset()} type="button">Tentar novamente</button></section></main>;
}
