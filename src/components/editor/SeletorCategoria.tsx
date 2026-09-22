// Seletor de categoria do editor: busca + duas colunas (categoria à esquerda; sub e micro à direita).
// Saúde só aparece para autor médico, editor e admin (o banco recusa o resto de qualquer jeito).
import { useEffect, useState } from "react";
import { useCats } from "@/lib/dados";
import { semAcento } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";

export interface Escolha { editoria: string; sub: string; micro: string }

export function SeletorCategoria({ valor, onChange, podeSaude }: { valor: Escolha; onChange: (e: Escolha) => void; podeSaude: boolean }) {
  const cats = useCats();
  const [q, setQ] = useState("");
  const [topoAberto, setTopoAberto] = useState<string | null>(null);
  const marcado = (slug: string) => [valor.editoria, valor.sub, valor.micro].includes(slug);
  const visivel = (c: Categoria) => (c.ativa || marcado(c.slug)) && (podeSaude || cats.raizDe(c.slug)?.slug !== "saude" || marcado(c.slug));
  useEffect(() => { if (!topoAberto && valor.editoria) setTopoAberto(valor.editoria); }, [valor.editoria, topoAberto]);

  const escolher = (slug: string) => {
    const cam = cats.caminhoDe(slug);
    onChange({ editoria: cam[0]?.slug || "", sub: cam[1]?.slug || "", micro: cam[2]?.slug || "" });
    if (cam[0]) setTopoAberto(cam[0].slug);
    setQ("");
  };
  const escolhido = valor.micro || valor.sub || valor.editoria;
  const busca = semAcento(q.trim());
  const topo = cats.acharCat(topoAberto || cats.principais(true).filter(visivel)[0]?.slug);
  const subs = topo ? cats.filhos(topo.slug, true).filter(visivel) : [];
  const achados = busca ? cats.todas.filter((c) => visivel(c) && semAcento(c.nome).includes(busca))
    .sort((a, b) => semAcento(a.nome).indexOf(busca) - semAcento(b.nome).indexOf(busca) || a.nivel - b.nivel).slice(0, 40) : [];

  return (
    <div className="catsel" id="catsel">
      <div className="catsel-topo">
        <div className="catsel-busca">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.8" /><path d="m13 13 4.5 4.5" /></svg>
          <input id="catsel-q" type="search" placeholder="Buscar categoria, subcategoria ou microcategoria" autoComplete="off" value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQ("");
              if (e.key === "Enter") { e.preventDefault(); if (achados[0]) escolher(achados[0].slug); }
            }} />
        </div>
        <div className="catsel-escolha" id="catsel-escolha" aria-live="polite">
          {escolhido
            ? <span className="catsel-chip" style={{ "--c": cats.corCat(escolhido) } as React.CSSProperties}><i />{cats.caminhoDe(escolhido).map((c) => c.nome).join(" › ")}
                {valor.sub && <button type="button" aria-label="Tirar subcategoria e microcategoria" onClick={() => escolher(valor.editoria)}>×</button>}</span>
            : <span className="catsel-vazio">Nenhuma categoria escolhida</span>}
        </div>
      </div>
      {!busca ? (
        <div className="catsel-cols" id="catsel-cols">
          <div className="catsel-col1" role="listbox" aria-label="Categorias">
            {cats.principais(true).filter(visivel).map((c) => (
              <button key={c.slug} type="button" className={`catsel-top${c.slug === topo?.slug ? " aberta" : ""}${marcado(c.slug) ? " on" : ""}`} role="option" aria-selected={marcado(c.slug)}
                style={{ "--c": c.cor } as React.CSSProperties}
                onClick={() => { setTopoAberto(c.slug); if (valor.editoria !== c.slug) escolher(c.slug); }}>
                <i /><span>{c.nome}</span><em>›</em>
              </button>
            ))}
          </div>
          <div className="catsel-col2" role="listbox" aria-label="Subcategorias e microcategorias">
            {topo && (
              <>
                <button type="button" className={`catsel-item geral${valor.editoria === topo.slug && !valor.sub ? " on" : ""}`} style={{ "--c": topo.cor } as React.CSSProperties} onClick={() => escolher(topo.slug)}>
                  <b>Só {topo.nome}</b><small>sem subcategoria</small>
                </button>
                {subs.map((sc) => {
                  const micros = cats.filhos(sc.slug, true).filter(visivel);
                  return (
                    <div className="catsel-grupo" key={sc.slug}>
                      <button type="button" className={`catsel-item sub${marcado(sc.slug) && !valor.micro ? " on" : ""}`} style={{ "--c": topo.cor } as React.CSSProperties} onClick={() => escolher(sc.slug)}><b>{sc.nome}</b></button>
                      {micros.length > 0 && (
                        <div className="catsel-micros">
                          {micros.map((mc) => <button key={mc.slug} type="button" className={`catsel-micro${marcado(mc.slug) ? " on" : ""}`} style={{ "--c": topo.cor } as React.CSSProperties} onClick={() => escolher(mc.slug)}>{mc.nome}</button>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="catsel-res" id="catsel-res" role="listbox" aria-label="Resultados da busca">
          {achados.length ? achados.map((c) => (
            <button key={c.slug} type="button" className={`catsel-item${marcado(c.slug) ? " on" : ""}`} role="option" aria-selected={c.slug === escolhido}
              style={{ "--c": cats.corCat(c.slug) } as React.CSSProperties} onClick={() => escolher(c.slug)}>
              <b>{c.nome}</b><small>{cats.caminhoDe(c.slug).slice(0, -1).map((x) => x.nome).join(" › ") || "Categoria principal"}</small>
            </button>
          )) : <p className="catsel-nada">Nenhuma categoria com “{q.trim()}”. O admin pode criar em Painel → Categorias.</p>}
        </div>
      )}
    </div>
  );
}
