// Redes sociais do perfil (todas opcionais), guardadas em autores.links:
// {site, instagram, youtube, tiktok, doctoralia, email}. O autor digita o @ ou o endereço
// completo; a gente normaliza e monta o link. rel="nofollow": o link é de quem assina.
import type { Links } from "./tipos";

type IdRede = keyof Links;

export const REDES: { id: IdRede; nome: string; dica: string; svg: string }[] = [
  { id: "site", nome: "Site", dica: "seusite.com.br",
    svg: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7.2"/><path d="M2.8 10h14.4M10 2.8c1.9 2 2.9 4.5 2.9 7.2s-1 5.2-2.9 7.2c-1.9-2-2.9-4.5-2.9-7.2S8.1 4.8 10 2.8Z"/></svg>' },
  { id: "instagram", nome: "Instagram", dica: "@seuperfil",
    svg: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="14" height="14" rx="4.4"/><circle cx="10" cy="10" r="3.4"/><circle cx="14.2" cy="5.8" r=".9" fill="currentColor" stroke="none"/></svg>' },
  { id: "youtube", nome: "YouTube", dica: "@seucanal",
    svg: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="4.6" width="16" height="10.8" rx="3.4"/><path d="M8.6 7.8l4.4 2.2-4.4 2.2Z" fill="currentColor" stroke="none"/></svg>' },
  { id: "tiktok", nome: "TikTok", dica: "@seuperfil",
    svg: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M11.4 2.6v8.9a3 3 0 1 1-2.6-3"/><path d="M11.4 4.6a4 4 0 0 0 3.9 3.1"/></svg>' },
  { id: "doctoralia", nome: "Doctoralia", dica: "link do seu perfil",
    svg: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M10 17.4S3.2 13.3 3.2 8.6a3.6 3.6 0 0 1 6.8-1.7 3.6 3.6 0 0 1 6.8 1.7c0 4.7-6.8 8.8-6.8 8.8Z"/><path d="M10 7.9v4.2M7.9 10h4.2" stroke-linecap="round"/></svg>' },
  { id: "email", nome: "E-mail", dica: "contato@exemplo.com",
    svg: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2.6" y="4.6" width="14.8" height="10.8" rx="2.4"/><path d="m3.4 6 6.6 4.6L16.6 6"/></svg>' },
];

export function urlRede(id: IdRede, valor: string | null | undefined): string {
  const v = (valor || "").trim();
  if (!v) return "";
  if (id === "email") return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v) ? "mailto:" + v.toLowerCase() : "";
  if (/^https?:\/\//i.test(v)) return v;
  const conta = v.replace(/^@/, "").replace(/\/+$/, "");
  if (!conta) return "";
  if (id === "instagram") return "https://instagram.com/" + conta;
  if (id === "youtube") return "https://youtube.com/@" + conta;
  if (id === "tiktok") return "https://tiktok.com/@" + conta;
  if (id === "doctoralia") return "https://www.doctoralia.com.br/" + conta;
  return "https://" + conta; // site
}

export function Redes({ links, classe = "redes" }: { links: Links | null | undefined; classe?: string }) {
  const itens = REDES.map((r) => {
    const url = urlRede(r.id, links?.[r.id]);
    if (!url) return null;
    const valor = links?.[r.id] ?? "";
    const rotulo = r.id === "email" ? "Enviar e-mail" : `${r.nome}${valor.startsWith("@") ? " " + valor : ""}`;
    return <a key={r.id} className="rede" href={url} target="_blank" rel="noopener nofollow" title={rotulo} aria-label={rotulo} dangerouslySetInnerHTML={{ __html: r.svg }} />;
  }).filter(Boolean);
  return itens.length ? <div className={classe}>{itens}</div> : null;
}

/** Campos de redes num formulário (controlados pelo componente pai). */
export function CamposRedes({ valores, erro, onChange, prefixo }: {
  valores: Links; erro?: string | null; onChange: (v: Links) => void; prefixo: string;
}) {
  return (
    <div className="redes-campos">
      {REDES.map((r) => (
        <div className="field rede-campo" key={r.id}>
          <label htmlFor={`${prefixo}-${r.id}`}>
            <span dangerouslySetInnerHTML={{ __html: r.svg }} style={{ display: "contents" }} />
            {r.nome} <span>opcional</span>
          </label>
          <input className={`input${erro === r.id ? " erro-campo" : ""}`} id={`${prefixo}-${r.id}`} value={valores[r.id] ?? ""}
            placeholder={r.dica} onChange={(e) => onChange({ ...valores, [r.id]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

/** Valida e devolve só as redes preenchidas; lança erro com o nome da rede inválida. */
export function lerRedes(valores: Links): Links {
  const links: Links = {};
  for (const r of REDES) {
    const v = (valores[r.id] ?? "").trim();
    if (!v) continue;
    if (!urlRede(r.id, v)) { const e = new Error(`Confira o ${r.nome}.`) as Error & { rede?: string }; e.rede = r.id; throw e; }
    links[r.id] = v;
  }
  return links;
}
