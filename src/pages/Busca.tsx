// Busca (/busca?q=): todas as palavras precisam aparecer, sem diferença de acento.
// Mesmo visual da página de categoria (cabeçalho, lista grande, lateral com anúncio).
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { materiasPorIds } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { Carregando } from "@/components/Cartoes";
import { ListaPaginada } from "@/components/ListaPaginada";
import { EspacoAnuncio } from "@/components/EspacoAnuncio";

export default function Busca() {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const [texto, setTexto] = useState(q);
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => { setTexto(q); if (!q) campo.current?.focus(); }, [q]);
  useSeo({ titulo: q ? `Busca: ${q}` : "Busca", descricao: "Busque matérias do Pulso Científico.", url: "/busca", semIndice: true });

  const { data: lista = [], isFetching } = useQuery({
    queryKey: ["busca", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await db.rpc("buscar_materias", { _q: q, _limite: 60 });
      if (error) throw error;
      return materiasPorIds(((data ?? []) as { id: string }[]).map((r) => r.id));
    },
  });

  return (
    <section className="view on" id="v-busca" aria-label="Busca">
      <div className="wrap">
        <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link>›<span>Busca</span></nav>
        <header className="cat-head">
          <span className="eyebrow">Busca</span>
          <h1>{q ? `“${q}”` : "O que você procura?"}</h1>
          <form className="busca-form" role="search" onSubmit={(e) => { e.preventDefault(); const t = texto.trim(); setParams(t ? { q: t } : {}); }}>
            <input ref={campo} className="input" type="search" name="q" placeholder="Doença, tecnologia, planeta, pesquisa…" aria-label="Buscar no Pulso Científico"
              value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button className="btn" type="submit">Buscar</button>
          </form>
          {q.length >= 2 && !isFetching && <p className="cat-conta">{lista.length} matéria{lista.length === 1 ? "" : "s"}</p>}
        </header>
        <div className="two-col">
          <div>
            {q.length < 2 ? <div className="cat-vazio">Digite pelo menos duas letras. A busca procura no título, no resumo, nas tags e no texto das matérias.</div>
              : isFetching ? <Carregando />
              : <ListaPaginada key={q} materias={lista} vazio={<div className="cat-vazio">Nada encontrado para “{q}”. Tente outra palavra, sem acento ou mais curta.</div>} />}
          </div>
          <aside className="sidebar"><div className="sticky"><EspacoAnuncio id="lateral" /></div></aside>
        </div>
      </div>
    </section>
  );
}
