// Seletor de capa: Pexels, Pixabay e Unsplash (pela função fotos-capa, com as chaves no servidor)
// ou envio do computador. Prioridade Pexels > Pixabay > Unsplash; o Unsplash tem 10 buscas por dia.
import { useEffect, useState } from "react";
import { chamarFuncao } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { enviar, extensao, dimensoes, lerComoDataUrl } from "@/lib/arquivos";
import { legendaCapa } from "@/lib/dados";
import type { Credito } from "@/lib/tipos";
import { IcFechar } from "../Icones";

type Fonte = "pexels" | "pixabay" | "unsplash";
type Aba = Fonte | "upload";
interface Foto { fonte: Fonte; id: string; largura: number; altura: number; alt: string; miniatura: string; fotografo: string; alertas: { pessoa: boolean; rosto: boolean; texto: boolean }; sugerida: boolean }
interface Resultado { total: number; fotos: Foto[]; cota: { usadas: number; limite: number } | null }
export interface CapaEscolhida { url: string; alt: string; credito: Credito }

const FONTES: Record<Fonte, { nome: string; regra: string; rodape: React.ReactNode }> = {
  pexels: { nome: "Pexels", regra: "Exibida direto do Pexels (não ocupa o armazenamento do site). Crédito ao fotógrafo na legenda.",
    rodape: <>Fotos do <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>. Uso gratuito, inclusive comercial.</> },
  pixabay: { nome: "Pixabay", regra: "Copiada para o armazenamento do Pulso (o Pixabay exige). Crédito opcional; mostramos por transparência. O Pixabay descreve as fotos só com tags, então a descrição da imagem você escreve.",
    rodape: <>Fotos do <a href="https://pixabay.com" target="_blank" rel="noopener">Pixabay</a>. Uso gratuito, inclusive comercial, sem crédito obrigatório.</> },
  unsplash: { nome: "Unsplash", regra: "Não ocupa armazenamento: a capa é exibida direto do Unsplash. Legenda com link para o fotógrafo e para o Unsplash é obrigatória. Fotos pagas (Unsplash+) não aparecem.",
    rodape: <>Fotos do <a href="https://unsplash.com/?utm_source=pulso_cientifico&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>. Uso gratuito, inclusive comercial, com crédito.</> },
};
const ORDEM: Fonte[] = ["pexels", "pixabay", "unsplash"];

export function SeletorCapa({ abaInicial, sugestoes, termoInicial, slug, onFechar, onUsar }: {
  abaInicial: Aba; sugestoes: string[]; termoInicial: string; slug: string;
  onFechar: () => void; onUsar: (c: CapaEscolhida) => void;
}) {
  const { user } = useAuth();
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [termo, setTermo] = useState(termoInicial);
  const [buscado, setBuscado] = useState("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [status, setStatus] = useState<React.ReactNode>("");
  const [erro, setErro] = useState<React.ReactNode>(null);
  const [evitarRosto, setEvitarRosto] = useState(true);
  const [evitarTexto, setEvitarTexto] = useState(true);
  const [escolhida, setEscolhida] = useState<Foto | null>(null);
  const [restamUnsplash, setRestamUnsplash] = useState<number | null>(null);
  const [confirmouUnsplash, setConfirmouUnsplash] = useState(false);
  const [usando, setUsando] = useState(false);
  // upload
  const [arq, setArq] = useState<File | null>(null);
  const [previa, setPrevia] = useState("");
  const [infoUp, setInfoUp] = useState<{ texto: string; erro: boolean } | null>(null);
  const [credUp, setCredUp] = useState("");
  const [direito, setDireito] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    document.addEventListener("keydown", esc);
    chamarFuncao<{ usadas: number; limite: number } | null>("fotos-capa", { acao: "uso", fonte: "unsplash" })
      .then((u) => setRestamUnsplash(u ? Math.max(0, u.limite - u.usadas) : null)).catch(() => {});
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", esc); };
  }, [onFechar]);

  const buscar = async (t: string, fonte: Fonte, confirmado = false) => {
    const q = t.trim();
    setEscolhida(null); setErro(null); setRes(null); setBuscado(q);
    if (!q) { setStatus("Digite um termo para buscar."); return; }
    if (fonte === "unsplash" && !confirmado && !confirmouUnsplash) { setStatus(""); return; }
    setStatus("Buscando…");
    try {
      const r = await chamarFuncao<Resultado>("fotos-capa", { acao: "buscar", fonte, termo: q });
      setRes(r);
      if (r.cota) setRestamUnsplash(Math.max(0, r.cota.limite - r.cota.usadas));
      setStatus("");
    } catch (e) {
      setStatus("");
      const msg = (e as Error).message;
      setErro(/não conectado|chave/i.test(msg)
        ? <><b>{FONTES[fonte].nome} ainda não conectado.</b><br />Falta a chave gratuita da API no servidor (Lovable Cloud → Secrets).</>
        : msg);
    }
  };

  useEffect(() => { if (aba !== "upload") buscar(termo, aba); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps

  const proxima = aba !== "upload" ? ORDEM[ORDEM.indexOf(aba) + 1] : undefined;
  const LinkProxima = () => proxima ? (
    <button type="button" className="link-sm px-prox" onClick={() => setAba(proxima)}>
      {proxima === "unsplash" ? `Não achou? Última opção: Unsplash${restamUnsplash !== null ? ` (restam ${restamUnsplash} hoje)` : ""} →` : `Não achou? Tentar no ${FONTES[proxima].nome} →`}
    </button>
  ) : null;

  const visiveis = (res?.fotos ?? []).filter((f) => !(evitarRosto && f.alertas.rosto) && !(evitarTexto && f.alertas.texto));
  const ocultas = (res?.fotos.length ?? 0) - visiveis.length;

  const lerArquivo = async (a: File | undefined) => {
    if (!a) return;
    setArq(null); setPrevia("");
    if (!/^image\/(jpeg|png|webp)$/.test(a.type)) { setInfoUp({ texto: "Formato não aceito. Use JPG, PNG ou WebP.", erro: true }); return; }
    if (a.size > 8 * 1024 * 1024) { setInfoUp({ texto: "Arquivo maior que 8 MB.", erro: true }); return; }
    const url = await lerComoDataUrl(a);
    const { w, h } = await dimensoes(url);
    const pequena = w < 1200 || h < 675;
    setPrevia(url);
    setInfoUp({ texto: `${a.name} · ${w} × ${h} · ${(a.size / 1024 / 1024).toFixed(1)} MB${pequena ? " · menor que 1200 × 675, vai ficar borrada na capa" : ""}`, erro: pequena });
    if (!pequena) setArq(a);
  };

  const pronto = aba === "upload" ? !!arq && direito : !!escolhida;
  const usar = async () => {
    if (!pronto || usando) return;
    setUsando(true);
    try {
      if (aba === "upload" && arq && user) {
        const url = await enviar("capas", `${user.id}/capa-${Date.now()}.${extensao(arq)}`, arq);
        onUsar({ url, alt: "", credito: { fonte: "upload", autor: credUp.trim() || "Arquivo do autor" } });
      } else if (escolhida) {
        const r = await chamarFuncao<{ arquivo: string; alt: string; credito: Credito }>("fotos-capa", { acao: "usar", fonte: escolhida.fonte, id: escolhida.id, slug });
        onUsar({ url: r.arquivo, alt: escolhida.fonte === "pixabay" ? "" : r.alt, credito: r.credito });
      }
    } catch (e) { setErro((e as Error).message); }
    setUsando(false);
  };

  const resumo = aba === "upload"
    ? (arq ? <><img src={previa} alt="" /><span><b>{legendaCapa({ fonte: "upload", autor: credUp.trim() || "Arquivo do autor" })}</b></span></> : "Nenhuma imagem selecionada.")
    : (escolhida ? <><img src={escolhida.miniatura} alt="" /><span><b>{legendaCapa({ fonte: escolhida.fonte, autor: escolhida.fotografo })}</b>{escolhida.alt.slice(0, 90)}</span></> : "Nenhuma imagem selecionada.");

  return (
    <div className="modal" id="capa-modal">
      <div className="modal-fundo" onClick={onFechar} />
      <div className="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="capa-modal-titulo">
        <header className="modal-topo">
          <div><h2 id="capa-modal-titulo">Escolher capa</h2><p>Bancos de fotos gratuitos ou imagem própria. Nunca figuras do artigo científico.</p></div>
          <button className="icon-btn" type="button" onClick={onFechar} aria-label="Fechar"><IcFechar /></button>
        </header>
        <nav className="modal-abas" role="tablist" aria-label="Origem da capa">
          {(["pexels", "pixabay", "unsplash", "upload"] as Aba[]).map((a) => (
            <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => { setAba(a); setEscolhida(null); }}>
              {a === "upload" ? "Enviar do computador" : a === "unsplash" && restamUnsplash !== null ? `Unsplash · restam ${restamUnsplash} hoje` : FONTES[a as Fonte].nome}
            </button>
          ))}
        </nav>

        {aba !== "upload" ? (
          <section className="modal-corpo">
            <form className="px-busca" onSubmit={(e) => { e.preventDefault(); buscar(termo, aba); }}>
              <input className="input" id="px-q" type="search" placeholder="Buscar fotos em português" aria-label="Termo de busca" value={termo} onChange={(e) => setTermo(e.target.value)} autoFocus />
              <button className="btn" type="submit" style={{ height: 42 }}>Buscar</button>
            </form>
            <p className="px-regra">{FONTES[aba].regra}</p>
            <div className="px-linha">
              <div className="px-sug">{sugestoes.length > 0 && <>Sugestões: {sugestoes.map((t) => <button key={t} type="button" aria-pressed={t === buscado} onClick={() => { setTermo(t); buscar(t, aba); }}>{t}</button>)}</>}</div>
              <div className="px-filtros">
                <label className="check-sm"><input type="checkbox" checked={evitarRosto} onChange={(e) => setEvitarRosto(e.target.checked)} /> Evitar rosto em destaque</label>
                <label className="check-sm"><input type="checkbox" checked={evitarTexto} onChange={(e) => setEvitarTexto(e.target.checked)} /> Evitar foto com texto escrito</label>
              </div>
            </div>
            <p className="px-status" role="status">
              {status || (res && <><b>{Number(res.total).toLocaleString("pt-BR")}</b> fotos para “{buscado}” no {FONTES[aba].nome} · mostrando {visiveis.length}{ocultas ? ` (${ocultas} escondida${ocultas > 1 ? "s" : ""} pelos filtros)` : ""}. As 3 com melhor encaixe estão marcadas. <LinkProxima /></>)}
            </p>
            <div className="px-grade" id="px-grade">
              {erro ? <div className="px-vazio">{erro}<br /><LinkProxima /></div>
                : aba === "unsplash" && !confirmouUnsplash && !res ? (
                  <div className="px-vazio">
                    {restamUnsplash === 0
                      ? <><b>Limite de hoje atingido.</b><br />As 10 buscas diárias do Unsplash já foram usadas. Volta a liberar à meia-noite.<br />Use o Pexels ou o Pixabay, ou envie uma imagem do computador.</>
                      : <><b>O Unsplash é a última opção.</b><br />O site todo pode fazer até 10 buscas por dia nele.{restamUnsplash !== null && <> Hoje restam <b>{restamUnsplash}</b>.</>}<br />Buscas repetidas no mesmo dia não contam.
                        <div className="px-sug"><button type="button" className="btn btn-sm" onClick={() => { setConfirmouUnsplash(true); buscar(termo, "unsplash", true); }}>Buscar “{termo.trim()}” no Unsplash</button></div></>}
                  </div>
                ) : res && !visiveis.length ? <div className="px-vazio">Os filtros esconderam todas as fotos desta busca. Desligue um filtro ou tente outro termo.</div>
                : visiveis.map((f) => (
                  <button key={f.id} type="button" className="px-foto" aria-pressed={escolhida?.id === f.id} title={f.alt} onClick={() => setEscolhida(f)}>
                    <img src={f.miniatura} alt={f.alt} loading="lazy" />
                    {f.sugerida && <span className="px-selo">Sugerida</span>}
                    <span className="px-alertas">{f.alertas.pessoa && <span>Tem pessoa</span>}{f.alertas.texto && <span>Tem texto</span>}{f.alertas.rosto && <span>Rosto</span>}</span>
                    <span className="px-meta"><b>{f.fotografo}</b>{f.largura} × {f.altura}</span>
                  </button>
                ))}
            </div>
            <p className="px-credito">{FONTES[aba].rodape}</p>
          </section>
        ) : (
          <section className="modal-corpo">
            <label className={`up-zona${arrastando ? " arrastando" : ""}`} htmlFor="up-arquivo"
              onDragEnter={(e) => { e.preventDefault(); setArrastando(true); }} onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={(e) => { e.preventDefault(); setArrastando(false); }} onDrop={(e) => { e.preventDefault(); setArrastando(false); lerArquivo(e.dataTransfer.files[0]); }}>
              <input type="file" id="up-arquivo" accept="image/jpeg,image/png,image/webp" onChange={(e) => lerArquivo(e.target.files?.[0])} />
              <b>Clique para escolher</b> ou arraste a imagem aqui
              <small>JPG, PNG ou WebP · mínimo 1200 × 675 · até 8 MB</small>
            </label>
            {infoUp && (
              <div className="up-prev">
                <div className="up-img">{previa && <img src={previa} alt="" />}</div>
                <div>
                  <p className={infoUp.erro ? "err" : ""}>{infoUp.texto}</p>
                  <div className="field"><label htmlFor="up-cred">Crédito <span>quem fez a foto</span></label><input className="input" id="up-cred" placeholder="Ex.: Arquivo pessoal / Nome do fotógrafo" value={credUp} onChange={(e) => setCredUp(e.target.value)} /></div>
                  <label className="check-sm"><input type="checkbox" checked={direito} onChange={(e) => setDireito(e.target.checked)} /> Tenho direito de uso desta imagem e ela não mostra paciente identificável.</label>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="modal-rodape">
          <div className="sel-resumo">{resumo}</div>
          <button className="btn-ghost" type="button" onClick={onFechar} style={{ padding: "0 16px" }}>Cancelar</button>
          <button className="btn" type="button" disabled={!pronto || usando} style={{ height: 42, opacity: pronto ? 1 : 0.45 }} onClick={usar}>{usando ? "Preparando…" : "Usar esta imagem"}</button>
        </footer>
      </div>
    </div>
  );
}
