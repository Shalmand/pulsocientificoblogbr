// Título, descrição, canonical, Open Graph e dados estruturados de cada tela.
import { useEffect } from "react";
import { SITE, absoluta } from "./dados";

interface Seo {
  titulo: string;
  descricao?: string | null;
  url?: string;
  imagem?: string | null;
  dados?: Record<string, unknown>;
  semIndice?: boolean;
  /** Matéria: og:type article e as datas que o Facebook, o LinkedIn e o Google leem */
  artigo?: { publicado?: string | null; modificado?: string | null; secao?: string; tags?: string[] };
}

function meta(seletor: string, atributo: "content" | "href", valor: string, criar?: () => HTMLElement) {
  let el = document.head.querySelector(seletor) as HTMLElement | null;
  if (!el && criar) { el = criar(); document.head.appendChild(el); }
  el?.setAttribute(atributo, valor);
}

const criarMeta = (propriedade: string) => () => { const m = document.createElement("meta"); m.setAttribute("property", propriedade); m.dataset.artigo = "1"; return m; };

export function aplicarSeo({ titulo, descricao, url, imagem, dados, semIndice, artigo }: Seo) {
  document.title = titulo === SITE.nome ? titulo : `${titulo} — ${SITE.nome}`;
  meta('meta[name="description"]', "content", descricao || "");
  meta('meta[property="og:title"]', "content", titulo);
  meta('meta[property="og:description"]', "content", descricao || "");
  meta('meta[property="og:image"]', "content", absoluta(imagem || "/marca/pulso-simbolo.svg"));
  meta('meta[property="og:url"]', "content", SITE.dominio + (url || "/"), () => { const m = document.createElement("meta"); m.setAttribute("property", "og:url"); return m; });
  meta('link[rel="canonical"]', "href", SITE.dominio + (url || "/"));
  meta('meta[name="robots"]', "content", semIndice ? "noindex" : "index,follow", () => { const m = document.createElement("meta"); m.setAttribute("name", "robots"); return m; });
  meta('meta[property="og:type"]', "content", artigo ? "article" : "website");
  document.head.querySelectorAll("meta[data-artigo]").forEach((m) => m.remove());
  if (artigo) {
    if (artigo.publicado) meta('meta[property="article:published_time"]', "content", artigo.publicado, criarMeta("article:published_time"));
    if (artigo.modificado) meta('meta[property="article:modified_time"]', "content", artigo.modificado, criarMeta("article:modified_time"));
    if (artigo.secao) meta('meta[property="article:section"]', "content", artigo.secao, criarMeta("article:section"));
    (artigo.tags ?? []).forEach((t) => { const m = criarMeta("article:tag")(); m.setAttribute("content", t); document.head.appendChild(m); });
  }
  const ld = document.getElementById("dados-google");
  if (ld) ld.textContent = JSON.stringify(dados || { "@context": "https://schema.org", "@type": "WebSite", name: SITE.nome, url: SITE.dominio });
}

export function useSeo(seo: Seo | null) {
  const chave = JSON.stringify(seo);
  useEffect(() => { if (seo) aplicarSeo(seo); }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
}
