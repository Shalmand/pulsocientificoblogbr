// Consentimento de cookies (LGPD). Guarda a escolha por 12 meses em "pulso-consentimento".
// Sem "publicidade", o AdSense recebe requestNonPersonalizedAds = 1 antes de exibir anúncios.
// Google Analytics só carrega com "estatisticas".

export interface Consentimento { versao: 1; data: string; necessarios: true; estatisticas: boolean; publicidade: boolean }

const CHAVE = "pulso-consentimento";
const VALIDADE = 365 * 864e5;
let memoria: Consentimento | null = null; // vale para a visita se o navegador bloquear o armazenamento

export function lerConsentimento(): Consentimento | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE) || "null") as Consentimento | null;
    if (c && Date.now() - new Date(c.data).getTime() < VALIDADE) return c;
  } catch { /* armazenamento bloqueado */ }
  return memoria;
}

export function salvarConsentimento(estatisticas: boolean, publicidade: boolean) {
  const c: Consentimento = { versao: 1, data: new Date().toISOString(), necessarios: true, estatisticas, publicidade };
  memoria = c;
  try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* segue só na memória */ }
  window.dispatchEvent(new CustomEvent("pulso:consentimento", { detail: c }));
  return c;
}

/** Abre o aviso de cookies já na tela de preferências (link do rodapé). */
export const abrirPreferenciasCookies = () => window.dispatchEvent(new CustomEvent("pulso:abrir-cookies"));
