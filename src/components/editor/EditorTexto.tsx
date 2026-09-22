// Editor do texto da matéria: modo visual (barra de formatação) e modo HTML.
// O HTML sai sempre limpo (só as tags e classes liberadas em src/lib/html.ts).
import { useEffect, useRef, useState } from "react";
import { contarPalavras, htmlLegivel, idDoYoutube, limparHtml } from "@/lib/html";
import { useToast } from "@/lib/toast";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Legenda da imagem vira também o texto alternativo, para não publicar foto sem descrição. */
function alinharLegendas(raiz: HTMLElement) {
  raiz.querySelectorAll("figure.img-materia").forEach((fig) => {
    const img = fig.querySelector("img"), txt = (fig.querySelector("figcaption")?.textContent || "").trim();
    if (img && txt && !/^Escreva a legenda/.test(txt)) img.setAttribute("alt", txt);
  });
}

export function EditorTexto({ inicial, onChange, onImagem }: {
  inicial: string;
  onChange: (html: string) => void;
  onImagem: (arquivo: File) => Promise<string>;
}) {
  const toast = useToast();
  const area = useRef<HTMLDivElement>(null);
  const faixa = useRef<Range | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"visual" | "html">("visual");
  const [htmlTexto, setHtmlTexto] = useState("");
  const [bloco, setBloco] = useState("p");
  const [painel, setPainel] = useState<null | "link" | "video">(null);
  const [urlPainel, setUrlPainel] = useState("");
  const [palavras, setPalavras] = useState(0);

  const emitir = (html: string) => { setPalavras(contarPalavras(html)); onChange(html); };
  const lerVisual = () => { const a = area.current!; alinharLegendas(a); return limparHtml(a.innerHTML); };

  useEffect(() => {
    const limpo = limparHtml(inicial || "<p></p>");
    if (area.current) area.current.innerHTML = limpo;
    setHtmlTexto(htmlLegivel(limpo));
    emitir(limpo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const aoSelecionar = () => {
      const s = getSelection();
      if (modo !== "visual" || !s?.rangeCount || !area.current?.contains(s.anchorNode)) return;
      faixa.current = s.getRangeAt(0).cloneRange();
      let n: Node | null = s.anchorNode, achado: HTMLElement | null = null;
      while (n && n !== area.current) { if (n.nodeType === 1 && /^(P|H2|H3|BLOCKQUOTE|LI|DIV)$/.test((n as HTMLElement).tagName)) { achado = n as HTMLElement; break; } n = n.parentNode; }
      setBloco(!achado ? "p" : achado.classList.contains("texto-grande") ? "texto-grande" : ({ H2: "h2", H3: "h3", BLOCKQUOTE: "blockquote" } as Record<string, string>)[achado.tagName] || "p");
    };
    document.addEventListener("selectionchange", aoSelecionar);
    return () => document.removeEventListener("selectionchange", aoSelecionar);
  }, [modo]);

  const voltarFaixa = () => {
    area.current?.focus();
    if (faixa.current) { const s = getSelection()!; s.removeAllRanges(); s.addRange(faixa.current); }
  };
  const inserir = (html: string) => { voltarFaixa(); document.execCommand("insertHTML", false, html); emitir(lerVisual()); };

  const trocarModo = (novo: "visual" | "html") => {
    if (novo === modo) return;
    if (novo === "html") setHtmlTexto(htmlLegivel(lerVisual()));
    else if (area.current) { area.current.innerHTML = limparHtml(htmlTexto); emitir(limparHtml(htmlTexto)); }
    setModo(novo);
  };

  const acao = (b: HTMLButtonElement) => {
    voltarFaixa();
    if (b.dataset.cmd) { document.execCommand(b.dataset.cmd, false); emitir(lerVisual()); return; }
    switch (b.dataset.acao) {
      case "link": setPainel("link"); setUrlPainel(""); return;
      case "video": setPainel("video"); setUrlPainel(""); return;
      case "imagem": arquivo.current?.click(); return;
      case "caixa": {
        const t = getSelection()?.toString().trim() || "Escreva aqui o trecho que merece destaque.";
        inserir(`<div class="caixa-destaque"><p>${esc(t)}</p></div><p><br></p>`); return;
      }
      case "numero": inserir(`<div class="numero-destaque"><strong>00%</strong><p>Explique em uma frase o que esse número mostra e com o que ele é comparado.</p></div><p><br></p>`); return;
    }
  };

  const aplicarPainel = () => {
    const url = urlPainel.trim();
    if (painel === "link") {
      setPainel(null); voltarFaixa();
      if (/^https?:\/\//i.test(url)) document.execCommand("createLink", false, url);
      emitir(lerVisual());
    } else if (painel === "video") {
      const id = idDoYoutube(url);
      if (!id) { toast("Não reconheci o link. Cole o endereço do vídeo no YouTube."); return; }
      setPainel(null);
      inserir(`<div class="video" data-youtube="${id}"></div><p><br></p>`);
      toast("Vídeo inserido. No site, o player só carrega quando o leitor clica.");
    }
  };

  const desligado = modo !== "visual";
  return (
    <div className="rte" id="rte">
      <div className="rte-bar" role="toolbar" aria-label="Formatação do texto" onMouseDown={(e) => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}
        onClick={(e) => { const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null; if (b && (b.dataset.cmd || b.dataset.acao)) acao(b); }}>
        <select className="rte-bloco" id="rte-bloco" aria-label="Estilo do parágrafo" disabled={desligado} value={bloco} onChange={(e) => {
          voltarFaixa();
          const v = e.target.value;
          document.execCommand("formatBlock", false, v === "texto-grande" ? "p" : v);
          const s = getSelection();
          let n: Node | null = s?.anchorNode ?? null;
          while (n && n !== area.current && !(n.nodeType === 1 && /^(P|H2|H3|BLOCKQUOTE)$/.test((n as HTMLElement).tagName))) n = n.parentNode;
          if (n && n !== area.current) { const el = n as HTMLElement; el.classList.toggle("texto-grande", v === "texto-grande"); if (!el.className) el.removeAttribute("class"); }
          setBloco(v); emitir(lerVisual());
        }}>
          <option value="p">Texto normal</option>
          <option value="texto-grande">Texto grande</option>
          <option value="h2">Título de seção</option>
          <option value="h3">Subtítulo</option>
          <option value="blockquote">Citação</option>
        </select>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" data-cmd="bold" title="Negrito (Ctrl+B)" aria-label="Negrito" disabled={desligado}><b>B</b></button>
        <button type="button" data-cmd="italic" title="Itálico (Ctrl+I)" aria-label="Itálico" disabled={desligado}><i>I</i></button>
        <button type="button" data-cmd="underline" title="Sublinhado (Ctrl+U)" aria-label="Sublinhado" disabled={desligado}><u>S</u></button>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" data-cmd="insertUnorderedList" title="Lista com marcadores" disabled={desligado}>• Lista</button>
        <button type="button" data-cmd="insertOrderedList" title="Lista numerada" disabled={desligado}>1. Lista</button>
        <button type="button" data-acao="link" title="Inserir link" disabled={desligado}>Link</button>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" data-acao="caixa" title="Caixa com fundo verde para um trecho importante" disabled={desligado}>Caixa de destaque</button>
        <button type="button" data-acao="numero" title="Número grande com explicação ao lado" disabled={desligado}>Número em destaque</button>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" data-acao="imagem" title="Subir uma imagem para dentro do texto" disabled={desligado}>Imagem</button>
        <button type="button" data-acao="video" title="Inserir um vídeo do YouTube" disabled={desligado}>Vídeo</button>
        <button type="button" data-cmd="removeFormat" title="Tirar negrito, itálico e sublinhado do trecho" disabled={desligado}>Limpar</button>
        <div className="rte-modo" role="group" aria-label="Modo de edição">
          <button type="button" aria-pressed={modo === "visual"} onClick={() => trocarModo("visual")}>Visual</button>
          <button type="button" aria-pressed={modo === "html"} onClick={() => trocarModo("html")}>HTML</button>
        </div>
      </div>
      {painel && (
        <div className="rte-link">
          <input className="input" type={painel === "link" ? "url" : "text"} autoFocus value={urlPainel} onChange={(e) => setUrlPainel(e.target.value)}
            placeholder={painel === "link" ? "https://" : "Cole o link do YouTube (youtube.com/watch?v=… ou youtu.be/…)"} aria-label={painel === "link" ? "Endereço do link" : "Link do vídeo"}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarPainel(); } if (e.key === "Escape") { setPainel(null); voltarFaixa(); } }} />
          <button className="btn btn-sm" type="button" onClick={aplicarPainel}>{painel === "link" ? "Aplicar" : "Inserir"}</button>
          <button className="btn-ghost btn-sm" type="button" onClick={() => { setPainel(null); voltarFaixa(); }}>Cancelar</button>
        </div>
      )}
      <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) { toast("A imagem passa de 2 MB. Comprima antes de subir."); return; }
        try {
          toast("Enviando a imagem…");
          const url = await onImagem(f);
          inserir(`<figure class="img-materia"><img src="${esc(url)}" alt=""><figcaption>Escreva a legenda e o crédito da imagem.</figcaption></figure><p><br></p>`);
          toast("Imagem inserida. A legenda embaixo dela também vira a descrição para leitores de tela.");
        } catch (erro) { toast((erro as Error).message || "Não deu para enviar a imagem."); }
      }} />
      <div ref={area} className="rte-area content" id="ed-corpo-visual" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Texto da matéria"
        hidden={modo !== "visual"}
        onInput={() => emitir(lerVisual())}
        onPaste={(e) => {
          e.preventDefault();
          const html = e.clipboardData.getData("text/html"), txt = e.clipboardData.getData("text/plain");
          document.execCommand("insertHTML", false, html ? limparHtml(html) : esc(txt).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>"));
          emitir(lerVisual());
        }} />
      <textarea className="rte-html code" id="ed-corpo" spellCheck={false} aria-label="HTML da matéria" hidden={modo !== "html"} value={htmlTexto}
        onChange={(e) => { setHtmlTexto(e.target.value); emitir(limparHtml(e.target.value)); }} />
      <div className="rte-foot"><span id="ed-palavras">{palavras} palavras · {Math.max(1, Math.round(palavras / 200))} min de leitura</span><span>O anúncio entra sozinho antes do 2º título de seção.</span></div>
    </div>
  );
}
