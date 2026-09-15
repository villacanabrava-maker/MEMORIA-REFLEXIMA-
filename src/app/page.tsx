const nav = ["Início", "Biblioteca", "Meu Cérebro", "Criar reflexão", "Minhas reflexões"];

const metrics = [
  ["Conteúdos", "0", "Aguardando o primeiro envio", "amber"],
  ["Memórias", "0", "Criadas somente com evidências", "violet"],
  ["Reflexões", "0", "Nenhum rascunho iniciado", "blue"],
];

const steps = [
  ["1", "Guarde suas fontes", "Adicione textos, PDFs e documentos sem perder o arquivo original."],
  ["2", "Construa sua memória", "O aplicativo encontra ideias e sempre mostra de onde elas vieram."],
  ["3", "Crie com consciência", "Produza novas reflexões e decida o que realmente representa você."],
];

function Mark({ small = false }: { small?: boolean }) {
  return (
    <svg aria-hidden="true" className={small ? "mark small" : "mark"} fill="none" viewBox="0 0 48 48">
      <path d="M12.5 15.5A7.5 7.5 0 0 1 20 8h8a7.5 7.5 0 0 1 7.5 7.5v17A7.5 7.5 0 0 1 28 40h-8a7.5 7.5 0 0 1-7.5-7.5v-17Z" fill="currentColor" opacity=".16" />
      <path d="M17 17.5h14M17 23.5h10M17 29.5h7" stroke="currentColor" strokeLinecap="round" strokeWidth="2.8" />
      <path d="M31.5 28.5v9l-4-3-4 3v-5" fill="#f2b84b" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function Sparkle() {
  return <span aria-hidden="true" className="sparkle">✦</span>;
}

export default function Home() {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand">
          <Mark />
          <div><p>Memória</p><p>Reflexiva</p></div>
        </div>
        <nav aria-label="Navegação principal">
          {nav.map((item, index) => (
            <button aria-current={index === 0 ? "page" : undefined} className={index === 0 ? "nav-active" : ""} key={item} type="button">
              <span aria-hidden="true" className="nav-symbol">{["⌂", "▥", "◉", "✦", "□"][index]}</span>
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy"><span>⌾</span><div><strong>Espaço privado</strong><p>Seus conteúdos pertencem somente a você.</p></div></div>
          <button className="profile" type="button"><span className="avatar">MR</span><span><strong>Meu espaço</strong><small>Configurações</small></span></button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">Seu espaço de pensamento</p><h1>Olá. Vamos organizar suas ideias?</h1></div>
          <span className="badge"><i /> Protótipo inicial</span>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="kicker"><Sparkle /> Memória com origem. Reflexão com escolha.</p>
            <h2 id="hero-title">Transforme o que você viveu em clareza para o que vem depois.</h2>
            <p>Reúna seus conteúdos, reencontre ideias importantes e escreva novas reflexões com ajuda da inteligência artificial — sem perder a autoria.</p>
            <div className="actions"><button className="primary" type="button">＋ Adicionar conteúdo</button><button className="secondary" type="button"><Sparkle /> Criar reflexão</button></div>
          </div>
          <div aria-hidden="true" className="hero-art">
            <div className="orbit one" /><div className="orbit two" />
            <div className="note"><i /><i /><i /></div>
            <div className="art-mark"><Mark small /></div>
          </div>
        </section>

        <section aria-labelledby="overview-title">
          <div className="section-title"><div><p className="eyebrow">Visão geral</p><h2 id="overview-title">Seu acervo está pronto para começar</h2></div><span>Ambiente vazio e seguro</span></div>
          <div className="metrics">
            {metrics.map(([label, value, helper, tone]) => (
              <article className="metric" key={label}><div className={`metric-icon ${tone}`}>{tone === "amber" ? "▥" : tone === "violet" ? "◉" : "□"}</div><div><p>{label}</p><strong>{value}</strong><small>{helper}</small></div></article>
            ))}
          </div>
        </section>

        <section className="lower">
          <article className="journey" aria-labelledby="journey-title">
            <p className="eyebrow">Como funciona</p><h2 id="journey-title">Uma jornada em três movimentos</h2>
            <ol>{steps.map(([number, title, description]) => <li key={number}><span className="step"><b>{number}</b>{number === "1" ? "⇧" : number === "2" ? "◉" : "✦"}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
          </article>
          <article className="empty" aria-labelledby="activity-title">
            <p className="eyebrow">Atividade recente</p><h2 id="activity-title">Tudo começa com uma fonte</h2>
            <div aria-hidden="true" className="feather">⌁</div>
            <p>Quando você adicionar seu primeiro conteúdo, o andamento aparecerá aqui de forma clara e rastreável.</p>
            <button type="button">Entender o processamento →</button>
          </article>
        </section>

        <footer><span>♢ Privacidade por padrão</span><span>Fundação 0.1 · Dados ainda não conectados</span></footer>
      </main>
    </div>
  );
}
