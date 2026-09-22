// Páginas institucionais: o texto vem da tabela `paginas`, pelo endereço.
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useSeo } from "@/lib/seo";
import { data } from "@/lib/formato";
import { limparHtml } from "@/lib/html";
import type { Pagina as TPagina } from "@/lib/tipos";
import { Carregando } from "@/components/Cartoes";
import NaoEncontrada from "./NaoEncontrada";

export default function Pagina() {
  const slug = useLocation().pathname.replace(/^\/+|\/+$/g, "");
  const { data: pg, isLoading } = useQuery({
    queryKey: ["pagina", slug],
    queryFn: async () => {
      const { data: linha } = await db.from("paginas").select("*").eq("slug", slug).maybeSingle();
      return (linha as TPagina) ?? null;
    },
  });
  // Numera os títulos de seção para o índice "Nesta página"
  const { html, secoes } = useMemo(() => {
    if (!pg) return { html: "", secoes: [] as { id: string; texto: string }[] };
    const tmp = document.createElement("div");
    tmp.innerHTML = limparHtml(pg.corpo_html);
    const secoes = [...tmp.querySelectorAll("h2")].map((h, i) => { h.id = "secao-" + (i + 1); return { id: h.id, texto: h.textContent ?? "" }; });
    return { html: tmp.innerHTML, secoes };
  }, [pg]);
  useSeo(pg ? { titulo: pg.titulo, descricao: pg.linha_fina, url: "/" + pg.slug } : null);

  if (isLoading) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!pg) return <NaoEncontrada />;

  return (
    <section className="view on" id="v-pagina" aria-label="Página institucional">
      <div className="wrap" id="pagina-root">
        <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link>›<span>{pg.titulo}</span></nav>
        <header className="post-head pagina-head">
          <span className="eyebrow">Institucional</span>
          <h1>{pg.titulo}</h1>
          {pg.linha_fina && <p className="dek">{pg.linha_fina}</p>}
          <p className="pagina-data">Atualizada em {data(pg.atualizada_em)}</p>
        </header>
        <div className="pagina-grid">
          <div className="content" dangerouslySetInnerHTML={{ __html: html }} />
          {secoes.length > 2 && (
            <aside className="toc" aria-label="Nesta página"><p>Nesta página</p><ol>
              {secoes.map((x) => <li key={x.id}><a href={`#${x.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(x.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{x.texto}</a></li>)}
            </ol></aside>
          )}
        </div>
      </div>
    </section>
  );
}
