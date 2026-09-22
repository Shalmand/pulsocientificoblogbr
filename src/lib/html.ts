// Limpeza do HTML das matérias e das páginas: só tags e classes liberadas, sem estilo inline,
// sem script, sem eventos. A mesma lista vale para o editor, para o agente e para a exibição.

export const RTE_TAGS = ["p", "h2", "h3", "strong", "em", "u", "a", "ul", "ol", "li", "blockquote", "br", "div", "span", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td"];
export const RTE_CLASSES = ["texto-grande", "caixa-destaque", "numero-destaque", "img-materia", "video"];
const RTE_TROCA: Record<string, string> = { b: "strong", i: "em" };

export function limparHtml(sujo: string): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = sujo || "";
  const saida = document.createDocumentFragment();
  const copiar = (origem: Node, destino: Node) => {
    for (const no of [...origem.childNodes]) {
      if (no.nodeType === 3) { destino.appendChild(document.createTextNode(no.textContent ?? "")); continue; }
      if (no.nodeType !== 1) continue;
      const elOrig = no as Element;
      let tag = elOrig.tagName.toLowerCase();
      tag = RTE_TROCA[tag] || tag;
      if (["script", "style", "iframe", "object", "embed", "svg", "math"].includes(tag)) continue;
      const classes = [...elOrig.classList].filter((c) => RTE_CLASSES.includes(c));
      if (!RTE_TAGS.includes(tag) || ((tag === "div" || tag === "span") && !classes.length)) { copiar(elOrig, destino); continue; }
      const el = document.createElement(tag);
      if (classes.length) el.className = classes.join(" ");
      if (tag === "img") {
        const src = elOrig.getAttribute("src") || "";
        // imagem nossa, endereço https ou arquivo recém-enviado; nunca javascript:
        if (!/^(https:\/\/|\/|data:image\/(jpeg|png|webp);base64,)/i.test(src)) continue;
        el.setAttribute("src", src);
        el.setAttribute("alt", elOrig.getAttribute("alt") || "");
        el.setAttribute("loading", "lazy");
      }
      if (tag === "div" && classes.includes("video")) {
        const id = (elOrig.getAttribute("data-youtube") || "").match(/^[\w-]{6,15}$/);
        if (!id) continue;
        el.setAttribute("data-youtube", id[0]);
      }
      if (tag === "a") {
        const href = elOrig.getAttribute("href") || "";
        if (/^(https?:|mailto:|#|\/)/i.test(href)) {
          el.setAttribute("href", href);
          if (/^https?:/i.test(href)) { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
        }
      }
      copiar(elOrig, el);
      destino.appendChild(el);
    }
  };
  copiar(tpl.content, saida);
  const box = document.createElement("div");
  box.appendChild(saida);
  box.querySelectorAll("p,h2,h3,li,strong,em,u").forEach((el) => { if (!el.textContent?.trim() && !el.querySelector("br,img")) el.remove(); });
  return box.innerHTML;
}

export const htmlLegivel = (h: string) =>
  h.replace(/<\/(p|h2|h3|ul|ol|blockquote|div|figure)>/g, "$&\n").replace(/<(ul|ol|div[^>]*)>/g, "$&\n").replace(/<\/li>/g, "$&\n").trim();

/** Marcador onde entra o anúncio do meio do texto: antes do 2º título de seção; sem títulos, depois do 3º parágrafo. */
export const MARCA_ANUNCIO = '<div data-espaco-anuncio="meio"></div>';
export function comAnuncio(html: string): string {
  const h2 = [...html.matchAll(/<h2[\s>]/g)];
  if (h2.length >= 2) return html.slice(0, h2[1].index) + MARCA_ANUNCIO + html.slice(h2[1].index);
  const ps = [...html.matchAll(/<\/p>/g)];
  if (ps.length >= 3) { const i = (ps[2].index ?? 0) + 4; return html.slice(0, i) + MARCA_ANUNCIO + html.slice(i); }
  return html + MARCA_ANUNCIO;
}

export const textoPuro = (html: string) => html.replace(/<[^>]+>/g, " ");
export const contarPalavras = (html: string) => textoPuro(html).split(/\s+/).filter(Boolean).length;

export const idDoYoutube = (url: string) =>
  (String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{6,15})/) || [])[1] || null;

/** Player do YouTube em dois tempos: capa + botão; o iframe (e o cookie) só entram no clique. */
export function ligarVideos(raiz: HTMLElement) {
  raiz.querySelectorAll<HTMLElement>(".video[data-youtube]").forEach((bloco) => {
    if (bloco.dataset.ligado) return;
    bloco.dataset.ligado = "1";
    const id = bloco.dataset.youtube!;
    bloco.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
      <button type="button" aria-label="Tocar o vídeo no YouTube"><span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z"/></svg></span></button>
      <p class="aviso">Ao tocar, o vídeo carrega do YouTube e o Google pode gravar cookies.</p>`;
    bloco.querySelector("button")!.addEventListener("click", () => {
      bloco.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Vídeo do YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    });
  });
}
