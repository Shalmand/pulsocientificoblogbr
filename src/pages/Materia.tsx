import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { SITE, absoluta, ehPubli, legendaCapa, registro, tamanhoImagem, urlMateria, urlTag, useCats, usePublicadas } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { usePedirLogin } from "@/lib/usePedirLogin";
import { data, dataCurta, quando } from "@/lib/formato";
import { comAnuncio, limparHtml, ligarVideos } from "@/lib/html";
import type { Materia as TMateria } from "@/lib/tipos";
import { AvatarAutor } from "@/components/Avatar";
import { Capa, Carregando } from "@/components/Cartoes";
import { Balao, Coracao, Documento, Marcador, Relogio } from "@/components/Icones";
import { EspacoAnuncio } from "@/components/EspacoAnuncio";
import { Comentarios } from "@/components/Comentarios";
import NaoEncontrada from "./NaoEncontrada";

function LegendaCapa({ m }: { m: TMateria }) {
  const cr = m.imagem_credito;
  if (cr?.fonte === "unsplash") return <>Foto de <a href={cr.perfil || cr.link} target="_blank" rel="noopener">{cr.autor}</a> no <a href="https://unsplash.com/?utm_source=pulso_cientifico&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>.</>;
  if ((cr?.fonte === "pexels" || cr?.fonte === "pixabay") && cr.link) return <>Foto: <a href={cr.link} target="_blank" rel="noopener">{cr.autor}</a> / {cr.fonte === "pexels" ? "Pexels" : "Pixabay"}.</>;
  return <>{legendaCapa(cr)}</>;
}

function Compartilhar({ m }: { m: TMateria }) {
  const toast = useToast();
  const url = SITE.dominio + urlMateria(m);
  const t = encodeURIComponent(m.titulo), u = encodeURIComponent(url);
  return (
    <div className="share">Compartilhar
      <a className="icon-btn" href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M2.2 13.8 3 11A6 6 0 1 1 5.2 13Z" /></svg></a>
      <a className="icon-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10.5 2.5H9A2.5 2.5 0 0 0 6.5 5v8.5M4.5 7.5h5" /></svg></a>
      <a className="icon-btn" href={`https://twitter.com/intent/tweet?text=${t}&url=${u}`} target="_blank" rel="noopener" aria-label="X"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m3 2.5 10 11M13 2.5l-10 11" /></svg></a>
      <a className="icon-btn" href={url} aria-label="Copiar link" onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(url).then(() => toast("Link copiado."), () => toast(url)); }}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.9.9M9.2 6.8a3 3 0 0 0-4.2 0l-2 2A3 3 0 0 0 7.2 13l.9-.9" /></svg></a>
    </div>
  );
}

function AcoesMateria({ m, onMudou }: { m: TMateria; onMudou: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const pedirLogin = usePedirLogin();
  const qc = useQueryClient();
  const { data: meu } = useQuery({
    queryKey: ["minhas-acoes", user?.id, m.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, s] = await Promise.all([
        db.from("curtidas").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("materia_id", m.id),
        db.from("salvos").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("materia_id", m.id),
      ]);
      return { curtiu: !!c.count, salvou: !!s.count };
    },
  });
  const curtiu = !!meu?.curtiu, salvou = !!meu?.salvou;
  const alternar = async (tabela: "curtidas" | "salvos", ligado: boolean) => {
    if (!user) { pedirLogin(tabela === "curtidas" ? "curtir a matéria" : "salvar a matéria"); return; }
    const r = ligado
      ? await db.from(tabela).delete().eq("user_id", user.id).eq("materia_id", m.id)
      : await db.from(tabela).insert({ user_id: user.id, materia_id: m.id });
    if (r.error) { toast("Não deu certo. Tente de novo."); return; }
    if (tabela === "curtidas") toast(ligado ? "Curtida desfeita." : "Curtida registrada.");
    else toast(ligado ? "Tirada dos salvos." : "Salva na sua conta. Veja em Minha conta › Salvos.");
    qc.invalidateQueries({ queryKey: ["minhas-acoes", user.id, m.id] });
    onMudou();
  };
  return (
    <div className="acoes-materia" id="acoes-materia">
      <button type="button" className={`acao curtir${curtiu ? " on" : ""}`} aria-pressed={curtiu} onClick={() => alternar("curtidas", curtiu)}><Coracao /><b>{m.curtidas_qtd}</b><span className="visually-hidden">curtidas</span></button>
      <button type="button" className={`acao salvar${salvou ? " on" : ""}`} aria-pressed={salvou} onClick={() => alternar("salvos", salvou)}><Marcador />{salvou ? "Salva" : "Salvar"}</button>
      <button type="button" className="acao" onClick={() => document.getElementById("coment-root")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Balao /><b>{m.comentarios_qtd}</b> comentários</button>
      <span className="espaco" />
    </div>
  );
}

function Corpo({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [alvoAnuncio, setAlvoAnuncio] = useState<Element | null>(null);
  const limpo = useMemo(() => comAnuncio(limparHtml(html)), [html]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    ligarVideos(ref.current);
    setAlvoAnuncio(ref.current.querySelector("[data-espaco-anuncio]"));
  }, [limpo]);
  return (
    <>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: limpo }} />
      {alvoAnuncio && createPortal(<EspacoAnuncio id="meio" className="ad-inline-real" style={{ margin: "6px 0 30px" }} />, alvoAnuncio)}
    </>
  );
}

export default function Materia({ editoria, slug }: { editoria: string; slug: string }) {
  const cats = useCats();
  const qc = useQueryClient();
  const { data: publicadas = [] } = usePublicadas();
  const { data: m, isLoading } = useQuery({
    queryKey: ["materia", slug],
    queryFn: async () => {
      const { data: linha } = await db.from("materias").select("*, autor:autores(*)").eq("slug", slug).maybeSingle();
      return (linha as TMateria) ?? null;
    },
  });
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["materia", slug] }); qc.invalidateQueries({ queryKey: ["publicadas"] }); };

  const autor = m?.autor;
  const url = m ? urlMateria(m) : "";
  const f = m?.fonte;
  const trilhaSeo = m ? cats.caminhoDe(m.microcategoria || m.subcategoria || m.editoria) : [];
  useSeo(m ? {
    titulo: m.titulo, descricao: m.linha_fina, url, imagem: m.imagem_url ? tamanhoImagem(m.imagem_url, 1200) : null,
    semIndice: m.status !== "publicada",
    artigo: { publicado: m.publicada_em, modificado: m.corrigida_em || m.atualizada_em, secao: cats.nomeCat(m.editoria), tags: m.seo?.tags },
    dados: { "@context": "https://schema.org", "@graph": [{
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: SITE.dominio + "/" },
        ...trilhaSeo.map((c, i) => ({ "@type": "ListItem", position: i + 2, name: c.nome, item: SITE.dominio + cats.urlCat(c.slug) })),
        { "@type": "ListItem", position: trilhaSeo.length + 2, name: m.titulo, item: SITE.dominio + url },
      ],
    }, {
      "@type": "NewsArticle",
      headline: m.titulo, description: m.linha_fina,
      image: m.imagem_url ? [absoluta(tamanhoImagem(m.imagem_url, 1200))] : undefined,
      datePublished: m.publicada_em,
      dateModified: m.corrigida_em || m.atualizada_em || m.publicada_em,
      articleSection: cats.nomeCat(m.editoria),
      keywords: (m.seo?.tags || []).join(", "),
      inLanguage: "pt-BR",
      author: { "@type": autor?.tipo === "redacao" ? "Organization" : "Person", name: autor?.nome || "", ...(autor?.slug ? { url: `${SITE.dominio}/autor/${autor.slug}` } : {}) },
      publisher: { "@type": "Organization", name: SITE.nome, url: SITE.dominio, logo: { "@type": "ImageObject", url: `${SITE.dominio}/marca/pulso-simbolo.svg` } },
      mainEntityOfPage: { "@type": "WebPage", "@id": SITE.dominio + url },
      ...(f?.doi ? { citation: { "@type": "ScholarlyArticle", name: f.titulo_original, identifier: `https://doi.org/${f.doi}`, isPartOf: f.revista } } : {}),
      ...(m.nota_correcao ? { correction: m.nota_correcao } : {}),
    }] },
  } : null);

  // Leitura: conta uma vez por visita (sessão do navegador), só em matéria publicada. Alimenta "Mais lidas".
  useEffect(() => {
    if (!m || m.status !== "publicada") return;
    const chave = `pulso-lida-${m.id}`;
    try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, "1"); } catch { /* sem armazenamento: conta mesmo assim */ }
    db.rpc("registrar_leitura", { _materia: m.id });
  }, [m?.id, m?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (isLoading) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!m) return <NaoEncontrada texto="Matéria não encontrada." />;
  if (m.editoria !== editoria) return <Navigate to={url} replace />;

  const reg = registro(autor);
  // Relacionadas: primeiro o mesmo assunto, depois a mesma área, depois as mais recentes
  const afinidade = (x: TMateria) => (m.microcategoria && x.microcategoria === m.microcategoria ? 3 : 0)
    + (m.subcategoria && x.subcategoria === m.subcategoria ? 2 : 0) + (x.editoria === m.editoria ? 1 : 0);
  const outras = publicadas.filter((x) => x.slug !== m.slug)
    .map((x, i) => ({ x, n: afinidade(x), i })).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 3).map((o) => o.x);
  const rotuloFonte = ({ estudo: "Fonte original", preprint: "Fonte original · preprint", comunicado: "Fonte original · comunicado" } as Record<string, string>)[f?.tipo || "estudo"];
  const linkFonte = f?.url || (f?.doi ? `https://doi.org/${f.doi}` : "");
  const trilha = [m.subcategoria, m.microcategoria].filter((x): x is string => !!x && !!cats.acharCat(x));

  return (
    <article className="view on" id="v-materia" aria-label="Matéria">
      <div className="wrap" id="materia-root">
        {m.status !== "publicada" && <p className="cat-aviso" style={{ marginTop: 18 }}>Prévia: esta matéria ainda não está publicada. Só você e a equipe veem esta página.</p>}
        <nav className="crumbs" aria-label="Você está em">
          <Link to="/">Início</Link>›<Link to={cats.urlCat(m.editoria)}>{cats.nomeCat(m.editoria)}</Link>›
          {trilha.map((x) => <span key={x} style={{ display: "contents" }}><Link to={cats.urlCat(x)}>{cats.nomeCat(x)}</Link>›</span>)}
          <span>{m.titulo}</span>
        </nav>
        <header className="post-head">
          <Link className="cat" to={cats.urlCat(m.editoria)} style={{ "--c": cats.corCat(m.editoria) } as React.CSSProperties}>{cats.nomeCat(m.editoria)}</Link>
          {ehPubli(autor) ? <span className="publi-tag">Publicidade</span> : autor?.tipo === "organizacao" ? <span className="parceiro-tag">Parceria editorial</span> : m.tipo === "artigo" ? <span className="tipo-tag">Artigo do autor</span> : null}
          <h1>{m.titulo}</h1>
          <p className="dek">{m.linha_fina}</p>
          <div className="post-bar">
            <div className="meta">
              <AvatarAutor autor={autor} />
              <span>Por <Link to={`/autor/${autor?.slug ?? ""}`} className="byline-link">{autor?.nome}</Link>{reg ? ` · ${reg.split(" · ")[0]}` : ""}</span>
              <span className="dot" />
              <time dateTime={m.publicada_em ?? ""} title={data(m.publicada_em, true)}>{quando(m.publicada_em)}</time>
              {m.corrigida_em && <><span className="dot" /><span className="corrigida">Corrigida em {data(m.corrigida_em, true)}</span></>}
              <span className="dot" />
              <span><Relogio />{m.tempo_leitura} min de leitura</span>
            </div>
            <Compartilhar m={m} />
          </div>
        </header>
        <div className="post-grid">
          <div>
            <figure className="post-hero" style={{ margin: 0 }}>
              <div className="media">{m.imagem_url && <img src={tamanhoImagem(m.imagem_url, 1400)} alt={m.imagem_alt ?? ""} {...{ fetchpriority: "high" }} />}</div>
              <figcaption className="caption"><LegendaCapa m={m} /></figcaption>
            </figure>
            <div className="content">
              <Corpo html={m.corpo_html} />
              {m.nota_correcao && <aside className="nota-correcao"><b>Correção</b><p>{m.nota_correcao}{m.corrigida_em && <> <span>Atualizada em {data(m.corrigida_em, true)}.</span></>}</p></aside>}
              {m.tipo !== "artigo" && f && (
                <aside className="source" aria-label="Fonte original">
                  <header><Documento />{rotuloFonte}</header>
                  <div className="ref">{f.autores ? f.autores + " " : ""}<cite>{f.titulo_original}.</cite> {f.citacao || [f.revista, f.data && dataCurta(f.data)].filter(Boolean).join(", ")}.
                    {f.tipo === "preprint" && <p className="aviso-preprint">Preprint: ainda não passou pela revisão de outros cientistas.</p>}
                    <div className="links">
                      {linkFonte && <a href={linkFonte} target="_blank" rel="noopener">{f.tipo === "comunicado" ? "Ler o comunicado" : `Ler ${f.revista ? "em " + f.revista : "a fonte"}`} ↗</a>}
                      {f.doi && <a href={`https://doi.org/${f.doi}`} target="_blank" rel="noopener">DOI {f.doi} ↗</a>}
                      {f.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${f.pmid}/`} target="_blank" rel="noopener">PubMed · PMID {f.pmid} ↗</a>}
                    </div>
                  </div>
                </aside>
              )}
              <p className="disclaimer">
                {ehPubli(autor) ? `Conteúdo comercial, produzido e assinado por ${autor?.nome}. A redação do Pulso Científico não participou da apuração nem da escrita.`
                  : autor?.tipo === "organizacao" ? `Conteúdo produzido por ${autor.nome}, organização parceira do Pulso Científico, sem contrapartida comercial.`
                  : m.tipo === "artigo" ? "Artigo de opinião e informação assinado pelo autor."
                  : <>Matéria escrita com inteligência artificial a partir de pesquisa científica publicada, com os números conferidos no material original. Saiba como fazemos na <Link to="/politica-editorial">Política editorial</Link>.</>}
                {m.editoria === "saude" ? " Não substitui consulta, diagnóstico ou tratamento com profissional de saúde." : " Conteúdo informativo: não é recomendação técnica, financeira ou de compra."}
              </p>
              <AcoesMateria m={m} onMudou={recarregar} />
              <div className="tags">{(m.seo?.tags || []).map((t) => <Link key={t} to={urlTag(t)}>{t}</Link>)}</div>
              {autor && (
                <Link className="sobre-autor" to={`/autor/${autor.slug}`}>
                  <AvatarAutor autor={autor} classe="g-avatar" />
                  <div><span>{autor.tipo === "redacao" ? "Sobre a redação" : "Quem escreve"}</span><b>{autor.nome}</b>{reg && <em>{reg}</em>}<p>{autor.bio || ""}</p></div>
                </Link>
              )}
            </div>
            <Comentarios materiaId={m.id} onMudou={recarregar} />
          </div>
          <aside className="sidebar"><div className="sticky">
            <EspacoAnuncio id="lateral" />
            <div><div className="block-head"><h2>Principais Posts</h2></div>
              {outras.map((o) => (
                <Link key={o.id} to={urlMateria(o)} className="mini"><div className="media"><Capa m={o} /></div><div><h3 className="ttl">{o.titulo}</h3><div className="meta">{quando(o.publicada_em, true)}</div></div></Link>
              ))}
            </div>
          </div></aside>
        </div>
      </div>
    </article>
  );
}
