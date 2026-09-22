// Espaço de anúncio. Regra (docs/PUBLICIDADE.md):
//   off      → não mostra nada
//   interno  → sorteia uma campanha do espaço pelo peso; sem campanha, a lateral mostra o anúncio da casa
//   adsense  → cola o código do bloco como está (com os <script> recriados para rodar);
//              conta não aprovada, ou bloco vazio em 3 s → anúncio interno, se "fallback_interno"
// Exibição conta quando metade do anúncio aparece na tela; clique conta no clique.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { lerConsentimento } from "@/lib/consentimento";

export type IdEspaco = "topo" | "entre" | "lateral" | "meio";

interface Espaco { id: IdEspaco; nome: string; largura: number; altura: number; modo: "adsense" | "interno" | "off"; html_anuncio: string | null; fallback_interno: boolean }
interface Campanha { id: string; nome: string; anunciante: string; link_url: string; imagens: Record<string, string>; alt: string; espacos: string[]; peso: number }

export function useAnuncios() {
  return useQuery({
    queryKey: ["anuncios-publicos"],
    staleTime: 5 * 60e3,
    queryFn: async () => {
      const [cfg, esp, camp] = await Promise.all([
        db.from("anuncios_config").select("adsense_client, adsense_situacao").eq("id", 1).maybeSingle(),
        db.from("espacos_anuncio").select("*"),
        db.from("campanhas_internas").select("id, nome, anunciante, link_url, imagens, alt, espacos, peso"),
      ]);
      return {
        config: cfg.data as { adsense_client: string | null; adsense_situacao: string } | null,
        espacos: (esp.data ?? []) as Espaco[],
        campanhas: (camp.data ?? []) as Campanha[],
      };
    },
  });
}

export const HOUSE = (
  <a className="house" href="mailto:blog.pulsocientifico@gmail.com?subject=Anunciar%20no%20Pulso%20Cient%C3%ADfico">
    <span className="ad-tag">Publicidade</span>
    <div><small>Pulso Científico</small><b>Sua marca perto de quem lê ciência</b><p>Anúncios diretos por categoria, com relatório de exibições e cliques.</p></div>
    <span className="go">Quero anunciar</span>
  </a>
);

const FORMATO: Record<IdEspaco, string[]> = { topo: ["728x90", "320x100"], entre: ["728x90", "320x100"], lateral: ["300x250"], meio: ["300x250", "728x90"] };

function sortear(lista: Campanha[]) {
  const total = lista.reduce((s, c) => s + c.peso, 0);
  let r = Math.random() * total;
  for (const c of lista) { r -= c.peso; if (r <= 0) return c; }
  return lista[0];
}

export function BannerInterno({ campanha, espaco }: { campanha: Campanha; espaco: IdEspaco }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const celular = typeof window !== "undefined" && window.innerWidth < 740;
  const formatos = celular && FORMATO[espaco].includes("320x100") ? ["320x100", ...FORMATO[espaco]] : FORMATO[espaco];
  const url = formatos.map((f) => campanha.imagens?.[f]).find(Boolean) || Object.values(campanha.imagens ?? {})[0];
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((ents) => {
      if (ents.some((e) => e.intersectionRatio >= 0.5)) {
        obs.disconnect();
        db.rpc("registrar_evento_anuncio", { _campanha: campanha.id, _espaco: espaco, _tipo: "exibicao" });
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [campanha.id, espaco]);
  return (
    <a ref={ref} className="banner-interno" href={campanha.link_url} target="_blank" rel="noopener sponsored" title={campanha.anunciante}
      onClick={() => db.rpc("registrar_evento_anuncio", { _campanha: campanha.id, _espaco: espaco, _tipo: "clique" })}>
      <span className="ad-tag">Publicidade</span>
      {url ? <img src={url} alt={campanha.alt} /> : <span className="banner-vazio">{campanha.anunciante}</span>}
    </a>
  );
}

let scriptAdsense = false;
function BlocoAdsense({ html, onFalhou }: { html: string; onFalhou: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const falhouRef = useRef(onFalhou);
  falhouRef.current = onFalhou;
  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    // Sem "publicidade" no consentimento: anúncios não personalizados (LGPD), antes do primeiro push
    if (!lerConsentimento()?.publicidade) w.adsbygoogle.requestNonPersonalizedAds = 1;
    const frag = document.createRange().createContextualFragment(html);
    frag.querySelectorAll("script").forEach((velho) => {
      const src = velho.getAttribute("src") || "";
      if (/adsbygoogle\.js/.test(src)) { if (scriptAdsense) { velho.remove(); return; } scriptAdsense = true; }
      const novo = document.createElement("script");
      [...velho.attributes].forEach((a) => novo.setAttribute(a.name, a.value));
      novo.textContent = velho.textContent;
      velho.replaceWith(novo);
    });
    alvo.replaceChildren(frag);
    const t = window.setTimeout(() => {
      const ins = alvo.querySelector("ins.adsbygoogle");
      const status = ins?.getAttribute("data-ad-status");
      if (ins ? status !== "filled" : alvo.offsetHeight < 10) falhouRef.current();
    }, 3000);
    return () => window.clearTimeout(t);
  }, [html]);
  return <div ref={ref} />;
}

export function EspacoAnuncio({ id, className, style }: { id: IdEspaco; className?: string; style?: React.CSSProperties }) {
  const { data } = useAnuncios();
  const [falhou, setFalhou] = useState(false);
  const espaco = data?.espacos.find((e) => e.id === id);
  const campanha = useMemo(() => {
    const lista = (data?.campanhas ?? []).filter((c) => c.espacos?.includes(id));
    return lista.length ? sortear(lista) : null;
  }, [data, id]);
  if (!data || !espaco || espaco.modo === "off") return null;

  const aprovada = data.config?.adsense_situacao === "aprovada";
  const usarAdsense = espaco.modo === "adsense" && aprovada && !!espaco.html_anuncio && !falhou;
  const interno = espaco.modo === "interno" || (espaco.modo === "adsense" && espaco.fallback_interno && (!aprovada || falhou));
  let conteudo: React.ReactNode = null;
  if (usarAdsense) conteudo = <BlocoAdsense html={espaco.html_anuncio!} onFalhou={() => setFalhou(true)} />;
  else if (interno && campanha) conteudo = <BannerInterno campanha={campanha} espaco={id} />;
  else if (interno && id === "lateral") conteudo = HOUSE;
  if (!conteudo) return null;
  return <div className={className} style={style} data-espaco={id}>{conteudo}</div>;
}
