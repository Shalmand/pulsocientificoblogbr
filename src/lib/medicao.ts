// Google Analytics 4 — só carrega com consentimento de "Estatísticas" e se houver o ID de medição
// (VITE_GA_ID, formato G-XXXXXXXXXX). Sem os dois, nada é carregado e nenhum cookie do Google é gravado.
// Também põe no <head> o link do feed RSS (o endereço depende do projeto no Lovable Cloud).
import { useEffect } from "react";
import { lerConsentimento, type Consentimento } from "./consentimento";

const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined)?.trim();
type Janela = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
let carregado = false;

export const urlFeed = () => `${(import.meta.env.VITE_SUPABASE_URL as string || "").replace(/\/+$/, "")}/functions/v1/feed`;

function carregarGa() {
  if (carregado || !GA_ID) return;
  carregado = true;
  const w = window as Janela;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { (w.dataLayer as unknown[]).push(arguments); };
  w.gtag("js", new Date());
  // page_view é enviado a cada troca de tela (o site não recarrega a página)
  w.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

export function useMedicao(caminho: string) {
  useEffect(() => {
    if (!document.querySelector('link[type="application/rss+xml"]') && import.meta.env.VITE_SUPABASE_URL) {
      const l = document.createElement("link");
      l.rel = "alternate"; l.type = "application/rss+xml"; l.title = "Pulso Científico"; l.href = urlFeed();
      document.head.appendChild(l);
    }
    const ligar = (c: Consentimento | null) => { if (c?.estatisticas) carregarGa(); };
    ligar(lerConsentimento());
    const ouvir = (e: Event) => ligar((e as CustomEvent<Consentimento>).detail);
    window.addEventListener("pulso:consentimento", ouvir);
    return () => window.removeEventListener("pulso:consentimento", ouvir);
  }, []);
  useEffect(() => {
    const w = window as Janela;
    if (!carregado || !w.gtag) return;
    const t = setTimeout(() => w.gtag!("event", "page_view", { page_path: caminho, page_title: document.title }), 300);
    return () => clearTimeout(t);
  }, [caminho]);
}
