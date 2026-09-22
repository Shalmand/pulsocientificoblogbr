import { Link } from "react-router-dom";
import { urlMateria, useCats, usePublicadas } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { quando } from "@/lib/formato";
import { Capa, Cat, CatTxt, Carregando, ItemLista, Meta } from "@/components/Cartoes";
import { EspacoAnuncio } from "@/components/EspacoAnuncio";

export default function Home() {
  const { data: L = [], isLoading } = usePublicadas();
  const cats = useCats();
  useSeo({
    titulo: "Pulso Científico",
    descricao: "Pesquisas de saúde, inteligência artificial, tecnologia, espaço e meio ambiente explicadas em português simples, com link para a fonte original.",
    url: "/",
  });

  const [a, b, c] = L;
  // Mais lidas: leituras dos últimos 30 dias de publicação; empate decide por curtidas e data
  const mes = Date.now() - 30 * 864e5;
  const recentes = L.filter((m) => m.publicada_em && +new Date(m.publicada_em) > mes);
  const maisLidas = [...(recentes.length >= 4 ? recentes : L)].sort((x, y) =>
    (y.leituras_qtd ?? 0) - (x.leituras_qtd ?? 0) || y.curtidas_qtd - x.curtidas_qtd || (y.publicada_em ?? "").localeCompare(x.publicada_em ?? "")).slice(0, 4);
  // Por assunto: a matéria mais recente de cada subcategoria, na ordem do menu
  const porAssunto = cats.principais().flatMap((t) => cats.filhos(t.slug))
    .map((sc) => L.find((m) => m.subcategoria === sc.slug)).filter(Boolean) as typeof L;

  return (
    <section className="view on" id="v-home" aria-label="Home">
      <h1 className="visually-hidden">Pulso Científico: ciência recente explicada em português</h1>
      <div className="wrap">
        <EspacoAnuncio id="topo" className="ad-real ad-lead-real" style={{ margin: "26px auto 0", maxWidth: 728 }} />

        {isLoading ? <Carregando /> : !a ? <p className="conta-vazio" style={{ marginTop: 40 }}>Ainda não há matérias publicadas.</p> : (
          <div className="hero">
            <div>
              <div id="h-feat">
                <Link to={urlMateria(a)} className="feat">
                  <div className="media"><Capa m={a} largura={1200} prioridade /></div>
                  <Cat m={a} />
                  <div className="over"><h2>{a.titulo}</h2><Meta m={a} /></div>
                </Link>
              </div>
              <div className="duo" id="h-duo">
                {[b, c].filter(Boolean).map((m) => (
                  <Link key={m.id} to={urlMateria(m)} className="card">
                    <div className="media"><Capa m={m} /><Cat m={m} /></div>
                    <div className="body"><h3 className="ttl">{m.titulo}</h3><Meta m={m} /></div>
                  </Link>
                ))}
              </div>
            </div>
            <aside>
              <div className="block-head"><h2>Últimas Notícias</h2></div>
              <div className="side-list" id="h-ultimas">
                {L.slice(0, 8).map((m) => (
                  <Link key={m.id} to={urlMateria(m)} className="row">
                    <div>
                      <CatTxt m={m} />
                      <h3 className="ttl">{m.titulo}</h3>
                      <div className="meta"><b>{m.autor?.nome}</b><span className="dot" /><time dateTime={m.publicada_em ?? ""}>{quando(m.publicada_em, true)}</time></div>
                    </div>
                    <div className="media"><Capa m={m} /></div>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}

        {L.length > 0 && (
          <>
            <section className="section">
              <div className="block-head"><h2>Mais Lidas</h2></div>
              <div className="popular" id="h-populares">
                {maisLidas.map((m, i) => (
                  <Link key={m.id} to={urlMateria(m)} className="pop"><span className="n">{i + 1}</span><div><h3 className="ttl">{m.titulo}</h3><div className="meta">{quando(m.publicada_em, true)}</div></div></Link>
                ))}
              </div>
            </section>

            {porAssunto.length > 0 && (
              <section className="section">
                <div className="block-head lg"><h2>Por assunto</h2></div>
                <div className="grid5" id="h-editorias">
                  {porAssunto.map((m) => (
                    <Link key={m.id} to={urlMateria(m)} className="tile">
                      <div className="media"><Capa m={m} /></div>
                      <span className="cat-text" style={{ "--c": cats.corCat(m.editoria) } as React.CSSProperties}>{cats.nomeCat(m.subcategoria)}</span>
                      <h3 className="ttl">{m.titulo}</h3>
                      <div className="meta">{quando(m.publicada_em, true)}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <EspacoAnuncio id="entre" className="ad-real ad-lead-real" style={{ margin: "44px auto 0", maxWidth: 728 }} />

            <section className="section">
              <div className="two-col">
                <div>
                  <div className="block-head lg"><h2>Leia também</h2></div>
                  <div className="list-big" id="h-leia">{L.slice(3, 7).map((m) => <ItemLista key={m.id} m={m} />)}</div>
                </div>
                <aside className="sidebar"><EspacoAnuncio id="lateral" /></aside>
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
}
