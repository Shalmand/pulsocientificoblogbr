// Publicidade (admin): conta do AdSense, os 4 espaços do site e os anúncios internos (venda direta).
// Tudo vale na hora, sem mexer no código. Banner sobe pelo painel, direto para o bucket "anuncios".
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, msgErro } from "@/lib/db";
import { useToast } from "@/lib/toast";
import { useSeo } from "@/lib/seo";
import { dataCurta, hojeIso } from "@/lib/formato";
import { dimensoes, enviar, extensao, lerComoDataUrl } from "@/lib/arquivos";
import { PainelLayout } from "@/components/PainelLayout";
import { HOUSE } from "@/components/EspacoAnuncio";

interface Espaco { id: string; nome: string; largura: number; altura: number; largura_mobile: number; altura_mobile: number; modo: "adsense" | "interno" | "off"; html_anuncio: string | null; fallback_interno: boolean }
interface Campanha { id: string; nome: string; anunciante: string; link_url: string; imagens: Record<string, string>; alt: string; espacos: string[]; inicio: string | null; fim: string | null; peso: number; ativo: boolean }

const MODO_TXT: Record<string, [string, string]> = { adsense: ["m-adsense", "AdSense"], interno: ["m-interno", "Anúncio interno"], off: ["m-off", "Desligado"] };
const FORMATOS = [{ id: "728x90", nome: "Topo e entre seções", w: 728, h: 90 }, { id: "300x250", nome: "Lateral", w: 300, h: 250 }, { id: "320x100", nome: "Celular", w: 320, h: 100 }];
const tamanho = (e: Espaco) => `${e.largura}×${e.altura}${e.largura_mobile && (e.largura_mobile !== e.largura || e.altura_mobile !== e.altura) ? ` · celular ${e.largura_mobile}×${e.altura_mobile}` : ""}`;

function situacao(c: Campanha): [string, string] {
  if (!c.ativo) return ["st-draft", "Pausado"];
  const h = hojeIso();
  if (c.inicio && h < c.inicio) return ["st-rev", "Agendado"];
  if (c.fim && h > c.fim) return ["st-draft", "Encerrado"];
  return ["st-pub", "Ativo"];
}
const noAr = (c: Campanha) => situacao(c)[1] === "Ativo";
const periodo = (c: Campanha) => (c.inicio || c.fim ? `${dataCurta(c.inicio)} – ${dataCurta(c.fim)}` : "sempre");

function extrair(html: string) {
  const client = (html.match(/data-ad-client=["']?(ca-pub-\d{16})/) || [])[1];
  const slot = (html.match(/data-ad-slot=["']?(\d{6,})/) || [])[1];
  const formato = (html.match(/data-ad-format=["']?([\w-]+)/) || [])[1] || "auto";
  const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)/g)].map((m) => m[1]);
  const estranhos = scripts.filter((s) => !/^https:\/\/pagead2\.googlesyndication\.com\//.test(s));
  return { client, slot, formato, estranhos };
}

function EditorCampanha({ c, espacos, onFechar }: { c: Campanha | null; espacos: Espaco[]; onFechar: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ nome: c?.nome ?? "", anunciante: c?.anunciante ?? "", peso: String(c?.peso ?? 3), link: c?.link_url ?? "", alt: c?.alt ?? "", inicio: c?.inicio ?? "", fim: c?.fim ?? "", ativo: c?.ativo ?? true });
  const [imagens, setImagens] = useState<Record<string, { url: string; info: string; aviso: string }>>(
    Object.fromEntries(Object.entries(c?.imagens ?? {}).filter(([, u]) => u).map(([k, u]) => [k, { url: u, info: "imagem já publicada", aviso: "" }])));
  const [marcados, setMarcados] = useState<string[]>(c?.espacos ?? []);
  const [enviando, setEnviando] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["campanhas-admin"] }); qc.invalidateQueries({ queryKey: ["anuncios-publicos"] }); };

  const subir = async (formato: typeof FORMATOS[number], arq: File) => {
    if (arq.size > 500 * 1024) return toast("A imagem passa de 500 KB. Comprima antes de enviar.");
    setEnviando(formato.id);
    try {
      const { w, h } = await dimensoes(await lerComoDataUrl(arq));
      const prop = (w / h) / (formato.w / formato.h);
      const aviso = prop < 0.92 || prop > 1.08 ? `Enviada em ${w}×${h}: proporção diferente de ${formato.w}×${formato.h}, a imagem vai aparecer com sobra.` : "";
      const url = await enviar("anuncios", `${Date.now()}-${formato.id}.${extensao(arq)}`, arq);
      setImagens((x) => ({ ...x, [formato.id]: { url, info: `${arq.name} · ${Math.round(arq.size / 1024)} KB`, aviso } }));
      toast(aviso ? "Imagem enviada, mas confira a proporção." : "Imagem pronta. Salve o anúncio para valer no site.");
    } catch (e) { toast(msgErro(e)); }
    setEnviando(null);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const imgs = Object.fromEntries(Object.entries(imagens).map(([k, v]) => [k, v.url]));
    if (f.nome.trim().length < 3) return toast("Dê um nome ao anúncio.");
    if (!f.anunciante.trim()) return toast("Informe o anunciante.");
    if (!/^https:\/\//i.test(f.link.trim())) return toast("O link precisa começar com https://");
    if (!f.alt.trim()) return toast("Escreva o texto alternativo da imagem (acessibilidade).");
    if (!Object.keys(imgs).length) return toast("Envie pelo menos uma imagem do anunciante.");
    if (!marcados.length) return toast("Escolha pelo menos um espaço.");
    if (f.inicio && f.fim && f.fim < f.inicio) return toast("A data final vem depois da inicial.");
    const dados = { nome: f.nome.trim(), anunciante: f.anunciante.trim(), link_url: f.link.trim(), alt: f.alt.trim(), imagens: imgs, espacos: marcados,
      inicio: f.inicio || null, fim: f.fim || null, peso: Math.min(10, Math.max(1, +f.peso || 1)), ativo: f.ativo };
    const r = c ? await db.from("campanhas_internas").update(dados).eq("id", c.id) : await db.from("campanhas_internas").insert(dados);
    if (r.error) return toast(msgErro(r.error));
    toast(c ? "Anúncio salvo. Vale no site na hora." : "Anúncio criado. Já entra no revezamento dos espaços marcados.");
    recarregar(); onFechar();
  };

  const apagar = async () => {
    if (!c || !window.confirm(`Apagar “${c.nome}”? As exibições e cliques registrados saem junto.`)) return;
    const r = await db.from("campanhas_internas").delete().eq("id", c.id);
    if (r.error) return toast(msgErro(r.error));
    toast(`“${c.nome}” apagado.`); recarregar(); onFechar();
  };

  return (
    <form className="pad camp-editor" onSubmit={salvar}>
      <header className="camp-editor-topo"><h3>{c ? "Editar anúncio" : "Novo anúncio interno"}</h3><button type="button" className="btn-ghost btn-sm" onClick={onFechar}>Fechar</button></header>
      <div className="ed-row">
        <div className="field"><label htmlFor="cp-nome">Nome interno</label><input className="input" id="cp-nome" maxLength={60} placeholder="Como você vai reconhecer na lista" value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
        <div className="field"><label htmlFor="cp-anunciante">Anunciante</label><input className="input" id="cp-anunciante" maxLength={60} placeholder="Nome de quem está pagando" value={f.anunciante} onChange={(e) => set("anunciante", e.target.value)} /></div>
      </div>
      <div className="ed-row">
        <div className="field"><label htmlFor="cp-link">Link de destino</label><input className="input" id="cp-link" placeholder="https://site-do-anunciante.com.br/?utm_source=pulso" value={f.link} onChange={(e) => set("link", e.target.value)} /><small>Precisa ser https. Vale usar utm para o anunciante medir.</small></div>
        <div className="field"><label htmlFor="cp-peso">Peso no revezamento <span>1 a 10</span></label><input className="input" id="cp-peso" type="number" min={1} max={10} value={f.peso} onChange={(e) => set("peso", e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="cp-alt">Texto alternativo da imagem</label><input className="input" id="cp-alt" maxLength={120} placeholder="O que a imagem mostra, para quem usa leitor de tela" value={f.alt} onChange={(e) => set("alt", e.target.value)} /></div>
      <div className="field"><label>Imagens do anunciante <span>pelo menos uma</span></label>
        <div className="camp-imagens">
          {FORMATOS.map((fo) => {
            const img = imagens[fo.id];
            return (
              <div key={fo.id} className={`banner-campo${img?.url ? " tem" : ""}`}>
                <div className="banner-previa" style={{ height: Math.max(40, Math.round(132 / fo.w * fo.h)) }}>{img?.url ? <img src={img.url} alt="" /> : `${fo.w}×${fo.h}`}</div>
                <div className="banner-info">
                  <b>{fo.nome} · {fo.w}×{fo.h}</b>
                  <small>{enviando === fo.id ? "enviando…" : img?.url ? (img.aviso ? <span className="erro">{img.aviso}</span> : img.info) : "nenhuma imagem ainda"}</small>
                  <div className="banner-botoes">
                    <label className="btn-ghost btn-sm" style={{ cursor: "pointer" }}>{img?.url ? "Trocar" : "Enviar imagem"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; if (a) subir(fo, a); }} /></label>
                    {img?.url && <button type="button" className="btn-ghost btn-sm" onClick={() => setImagens((x) => { const n = { ...x }; delete n[fo.id]; return n; })}>Remover</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <small>JPG, PNG ou WebP, até 500 KB. O arquivo vai direto para o site; não precisa mexer em storage.</small>
      </div>
      <div className="field"><label>Onde pode aparecer</label><div className="parceria-areas">
        {espacos.map((s) => <label className="area-chip" key={s.id}><input type="checkbox" checked={marcados.includes(s.id)} onChange={(e) => setMarcados((x) => e.target.checked ? [...x, s.id] : x.filter((y) => y !== s.id))} /><span style={{ "--c": "var(--blue)" } as React.CSSProperties}>{s.nome}</span></label>)}
      </div></div>
      <div className="ed-row">
        <div className="field"><label htmlFor="cp-inicio">Começa em <span>opcional</span></label><input className="input" id="cp-inicio" type="date" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} /></div>
        <div className="field"><label htmlFor="cp-fim">Termina em <span>opcional</span></label><input className="input" id="cp-fim" type="date" value={f.fim} onChange={(e) => set("fim", e.target.value)} /></div>
      </div>
      <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => set("ativo", e.target.checked)} /><span><b>Ativo.</b> Desmarque para pausar sem apagar — o anúncio some do revezamento na hora.</span></label>
      <div className="save-bar">
        <button className="btn" type="submit">Salvar anúncio</button>
        {c && <button className="btn-ghost btn-perigo" type="button" onClick={apagar}>Apagar</button>}
      </div>
    </form>
  );
}

function Tela() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["campanhas-admin"],
    queryFn: async () => {
      const [cfg, esp, camp, res] = await Promise.all([
        db.from("anuncios_config").select("*").eq("id", 1).maybeSingle(),
        db.from("espacos_anuncio").select("*"),
        db.from("campanhas_internas").select("*").order("criado_em", { ascending: false }),
        db.rpc("resumo_campanhas"),
      ]);
      const ordem = ["topo", "entre", "lateral", "meio"];
      return {
        config: cfg.data as { adsense_client: string | null; adsense_situacao: string } | null,
        espacos: ((esp.data ?? []) as Espaco[]).sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id)),
        campanhas: (camp.data ?? []) as Campanha[],
        numeros: new Map(((res.data ?? []) as { campanha_id: string; exibicoes: number; cliques: number }[]).map((x) => [x.campanha_id, x])),
      };
    },
  });
  const [pub, setPub] = useState("");
  const [sit, setSit] = useState("aguardando");
  const [atual, setAtual] = useState("topo");
  const [rasc, setRasc] = useState<Espaco | null>(null);
  const [camp, setCamp] = useState<string | null>(null); // id, "novo" ou null
  const [adsTxt, setAdsTxt] = useState<"sim" | "nao" | "?">("?");
  const carregou = useRef(false);

  useEffect(() => {
    if (!data || carregou.current) return;
    carregou.current = true;
    setPub(data.config?.adsense_client ?? "");
    setSit(data.config?.adsense_situacao ?? "aguardando");
  }, [data]);
  useEffect(() => { const e = data?.espacos.find((x) => x.id === atual); if (e) setRasc({ ...e }); }, [data, atual]);
  useEffect(() => {
    fetch("/ads.txt").then((r) => r.ok ? r.text() : "").then((t) => setAdsTxt(/pub-\d{16}/.test(t) ? "sim" : "nao")).catch(() => setAdsTxt("nao"));
  }, []);

  const salvarConta = async (dados: Record<string, string | null>, msg: string) => {
    const r = await db.from("anuncios_config").update({ ...dados, atualizado_em: new Date().toISOString() }).eq("id", 1);
    if (r.error) return toast(msgErro(r.error));
    toast(msg); qc.invalidateQueries({ queryKey: ["campanhas-admin"] }); qc.invalidateQueries({ queryKey: ["anuncios-publicos"] });
  };

  const validacao = useMemo(() => {
    if (!rasc || rasc.modo !== "adsense") return null;
    const code = rasc.html_anuncio ?? "";
    const e = extrair(code);
    let msg: [string, string];
    if (!code.trim()) msg = ["msg err", "Cole o código do bloco para usar o AdSense neste espaço."];
    else if (!e.client || !e.slot) msg = ["msg err", "Não encontrei a conta (ca-pub-…) e o número do bloco. Confira se copiou o código inteiro."];
    else if (pub.trim() && e.client !== pub.trim()) msg = ["msg err", "A conta deste código é diferente do ID do editor cadastrado acima."];
    else if (e.estranhos.length) msg = ["msg err", "Atenção: o código tem scripts que não são do Google. Eles vão rodar no site do jeito que foram colados."];
    else msg = ["msg ok", "Código válido. Vai para o site exatamente como foi colado."];
    return { e, msg, valido: !!code.trim() && !!e.client && !!e.slot && !(pub.trim() && e.client !== pub.trim()) };
  }, [rasc, pub]);

  if (!data || !rasc) return <p style={{ padding: 40 }}>Carregando…</p>;
  const doEspaco = data.campanhas.filter((c) => noAr(c) && c.espacos.includes(rasc.id));
  const soma = data.campanhas.reduce((a, c) => { const n = data.numeros.get(c.id); return { e: a.e + Number(n?.exibicoes ?? 0), c: a.c + Number(n?.cliques ?? 0) }; }, { e: 0, c: 0 });

  const salvarEspaco = async () => {
    if (rasc.modo === "adsense" && !validacao?.valido) return toast("Não salvou: corrija o código do AdSense.");
    const r = await db.from("espacos_anuncio").update({ modo: rasc.modo, html_anuncio: rasc.html_anuncio || null, fallback_interno: rasc.fallback_interno }).eq("id", rasc.id);
    if (r.error) return toast(msgErro(r.error));
    toast(`“${rasc.nome}” salvo. Já vale no site.`);
    qc.invalidateQueries({ queryKey: ["campanhas-admin"] }); qc.invalidateQueries({ queryKey: ["anuncios-publicos"] });
  };

  const prevW = Math.min(rasc.largura, 340);
  const prevH = rasc.largura < 340 && rasc.altura >= 250 ? rasc.altura : Math.round(prevW / rasc.largura * rasc.altura);
  const primeira = doEspaco[0];
  const previa = rasc.modo === "off" ? null
    : rasc.modo === "interno" ? (primeira
      ? <a className="banner-interno" href={primeira.link_url} target="_blank" rel="noopener sponsored"><span className="ad-tag">Publicidade</span>{Object.values(primeira.imagens)[0] ? <img src={primeira.imagens[`${rasc.largura}x${rasc.altura}`] || Object.values(primeira.imagens)[0]} alt={primeira.alt} /> : <span className="banner-vazio">{primeira.anunciante}</span>}</a>
      : rasc.id === "lateral" ? HOUSE : <div className="ad"><div><em>Publicidade</em>Nenhum anúncio interno ativo para este espaço</div></div>)
    : <div className="ad"><div><em>Publicidade</em>AdSense · bloco {validacao?.e.slot || "?"}</div></div>;

  return (
    <>
      <div className="app-top">
        <div><h1>Publicidade</h1><p>Escolha o que aparece em cada espaço do site. Vale na hora, sem mexer no código.</p></div>
      </div>
      <div className="ads-grid">
        <div>
          <div className="card-p">
            <header><h2>Conta do AdSense</h2><span>Vale para todos os espaços</span></header>
            <div className="pad">
              <div className="cfg-row">
                <div className="field"><label htmlFor="ads-pub">ID do editor</label>
                  <input className="input" id="ads-pub" placeholder="ca-pub-0000000000000000" value={pub} onChange={(e) => setPub(e.target.value)}
                    onBlur={() => { const v = pub.trim(); if (v === (data.config?.adsense_client ?? "")) return; if (v && !/^ca-pub-\d{16}$/.test(v)) return toast("O ID do editor tem o formato ca-pub- seguido de 16 números."); salvarConta({ adsense_client: v || null }, "ID do editor salvo."); }} />
                  <small>Aparece no AdSense em Conta → Informações da conta.</small></div>
                <div className="field"><label htmlFor="ads-status">Situação da conta</label>
                  <select className="select" id="ads-status" value={sit} onChange={(e) => { setSit(e.target.value); salvarConta({ adsense_situacao: e.target.value }, "Situação da conta salva."); }}>
                    <option value="aguardando">Aguardando aprovação</option><option value="aprovada">Aprovada</option><option value="pausada">Pausada</option>
                  </select><small>Enquanto não aprovar, os espaços usam o anúncio interno.</small></div>
              </div>
              <div className="health">
                <span className={`status ${adsTxt === "sim" ? "st-pub" : "st-rev"}`}>{adsTxt === "sim" ? "ads.txt no ar" : adsTxt === "nao" ? "ads.txt ainda não publicado" : "Conferindo ads.txt…"}</span>
              </div>
            </div>
          </div>

          <div className="card-p">
            <header><h2>Espaços do site</h2><span>Clique para editar</span></header>
            <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="tbl" style={{ minWidth: 560 }}>
                <thead><tr><th>Espaço</th><th>Tamanho</th><th>Mostra</th><th>Se falhar</th></tr></thead>
                <tbody>
                  {data.espacos.map((s) => {
                    const [cls, txt] = MODO_TXT[s.modo];
                    return (
                      <tr key={s.id} className={`slot-row${s.id === atual ? " sel" : ""}`} tabIndex={0} onClick={() => setAtual(s.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAtual(s.id); } }}>
                        <td><b>{s.nome}</b></td><td className="num">{tamanho(s)}</td><td><span className={`mode ${cls}`}>{txt}</span></td>
                        <td className="fb">{s.modo === "adsense" ? (s.fallback_interno ? "Anúncio interno" : "Espaço some") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-p">
            <header><h2>Anúncios internos</h2><span>{soma.e ? `${soma.e.toLocaleString("pt-BR")} exibições · ${soma.c} cliques` : "sem dados ainda"}</span><button className="btn btn-sm" type="button" onClick={() => setCamp("novo")}>+ Novo anúncio</button></header>
            <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="tbl" style={{ minWidth: 620 }}>
                <thead><tr><th>Anúncio</th><th>Período</th><th>Status</th><th className="num">Exibições</th><th className="num">Cliques</th></tr></thead>
                <tbody>
                  {data.campanhas.length ? data.campanhas.map((c) => {
                    const [cls, txt] = situacao(c);
                    const n = data.numeros.get(c.id), ex = Number(n?.exibicoes ?? 0), cl = Number(n?.cliques ?? 0);
                    return (
                      <tr key={c.id} tabIndex={0} className={camp === c.id ? "sel" : ""} onClick={() => setCamp(c.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCamp(c.id); } }}>
                        <td><div className="camp"><i className="alt" /><div><b>{c.nome}</b><small>{c.anunciante} · {Object.keys(c.imagens || {}).filter((k) => c.imagens[k]).join(" e ") || "sem imagem ainda"}</small></div></div></td>
                        <td className="num">{periodo(c)}</td>
                        <td><span className={`status ${cls}`}>{txt}</span></td>
                        <td className="num">{ex.toLocaleString("pt-BR")}</td>
                        <td className="num">{cl}{ex ? ` · ${(cl / ex * 100).toFixed(1).replace(".", ",")}%` : ""}</td>
                      </tr>
                    );
                  }) : <tr className="vazio"><td colSpan={5}>Nenhum anúncio interno ainda. Sem anúncio vendido, a lateral mostra o anúncio da casa (“Sua marca perto de quem lê ciência”).</td></tr>}
                </tbody>
              </table>
            </div>
            {camp && <EditorCampanha key={camp} c={data.campanhas.find((x) => x.id === camp) ?? null} espacos={data.espacos} onFechar={() => setCamp(null)} />}
          </div>
          <p className="panel-note">Visitantes com bloqueador de anúncio não veem o AdSense. Com "Se falhar → anúncio interno" ligado, eles veem o seu anúncio no lugar do espaço vazio.</p>
        </div>

        <aside>
          <div className="card-p">
            <header><h2>{rasc.nome}</h2><span>{tamanho(rasc)}</span></header>
            <div className="pad">
              <div className="seg" role="radiogroup" aria-label="O que mostrar">
                {(["adsense", "interno", "off"] as const).map((m) => <label key={m}><input type="radio" name="modo" checked={rasc.modo === m} onChange={() => setRasc({ ...rasc, modo: m })} />{MODO_TXT[m][1] === "Desligado" ? "Desligado" : MODO_TXT[m][1]}</label>)}
              </div>
              {rasc.modo === "adsense" && (
                <div>
                  <div className="field"><label htmlFor="ads-code">Código do bloco de anúncio</label><textarea className="textarea code" id="ads-code" spellCheck={false} value={rasc.html_anuncio ?? ""} onChange={(e) => setRasc({ ...rasc, html_anuncio: e.target.value })} /><small>Cole o código que o AdSense mostra em Anúncios → Por bloco de anúncio → Obter código.</small></div>
                  {validacao && <>
                    <dl className="extract"><dt>Conta</dt><dd className={validacao.e.client ? "" : "bad"}>{validacao.e.client || "não encontrada"}</dd><dt>Bloco</dt><dd className={validacao.e.slot ? "" : "bad"}>{validacao.e.slot || "não encontrado"}</dd><dt>Formato</dt><dd>{validacao.e.formato}</dd></dl>
                    <p className={validacao.msg[0]}>{validacao.msg[1]}</p>
                  </>}
                  <label className="check"><input type="checkbox" checked={rasc.fallback_interno} onChange={(e) => setRasc({ ...rasc, fallback_interno: e.target.checked })} /><span><b>Se o AdSense não mostrar anúncio, exibir o anúncio interno.</b> Acontece quando não há anunciante para o espaço, a conta ainda não foi aprovada ou o leitor usa bloqueador.</span></label>
                </div>
              )}
              {rasc.modo === "interno" && (
                <div className="field"><label>Anúncios que se revezam aqui</label>
                  <p className="sub" style={{ margin: 0 }}>{doEspaco.length ? doEspaco.map((c) => `${c.nome} (peso ${c.peso})`).join(" · ") : ""}</p>
                  <small>Com mais de um anúncio ativo no espaço, eles se revezam pelo peso.</small>
                  {!doEspaco.length && <p className="msg err">Nenhum anúncio interno cobre este espaço. Crie um em “Anúncios internos” e marque este espaço.{rasc.id === "lateral" ? " Enquanto isso, aparece o anúncio da casa." : ""}</p>}
                </div>
              )}
              <div className="preview">
                <p>{rasc.modo === "off" ? "Prévia · espaço oculto no site" : rasc.modo === "interno" ? "Prévia · anúncio interno" : rasc.fallback_interno ? "Prévia · AdSense (anúncio interno se falhar)" : "Prévia · AdSense"}</p>
                <div className="frame" style={{ width: prevW, height: rasc.modo === "off" ? 0 : prevH }}>{previa}</div>
              </div>
              <div className="save-bar"><button className="btn" type="button" onClick={salvarEspaco}>Salvar espaço</button></div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Publicidade() {
  useSeo({ titulo: "Publicidade", url: "/painel/publicidade", semIndice: true });
  return <PainelLayout nivel="admin"><Tela /></PainelLayout>;
}
