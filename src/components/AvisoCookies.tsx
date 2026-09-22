import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lerConsentimento, salvarConsentimento } from "@/lib/consentimento";
import { useToast } from "@/lib/toast";

/** Aviso de cookies (LGPD): aparece na primeira visita; o rodapé reabre nas preferências. */
export function AvisoCookies() {
  const toast = useToast();
  const [aberto, setAberto] = useState(() => !lerConsentimento());
  const [detalhe, setDetalhe] = useState(false);
  const [estat, setEstat] = useState(!!lerConsentimento()?.estatisticas);
  const [publi, setPubli] = useState(!!lerConsentimento()?.publicidade);

  useEffect(() => {
    const abrir = () => {
      const c = lerConsentimento();
      setEstat(!!c?.estatisticas); setPubli(!!c?.publicidade);
      setDetalhe(true); setAberto(true);
    };
    window.addEventListener("pulso:abrir-cookies", abrir);
    return () => window.removeEventListener("pulso:abrir-cookies", abrir);
  }, []);

  const salvar = (e: boolean, p: boolean) => {
    salvarConsentimento(e, p);
    setAberto(false);
    toast(p ? "Preferências salvas." : "Preferências salvas. Os anúncios serão não personalizados.");
  };

  return (
    <section className="cookies" id="aviso-cookies" aria-label="Aviso de cookies" hidden={!aberto}>
      <div id="ck-resumo" hidden={detalhe}>
        <h2>Cookies no Pulso Científico</h2>
        <p>Usamos cookies necessários para o site funcionar e, com a sua permissão, cookies de estatísticas e de publicidade personalizada. Se recusar, os anúncios continuam, mas não personalizados. <Link to="/cookies" onClick={() => setAberto(false)}>Política de cookies</Link></p>
        <div className="ck-botoes">
          <button className="btn" type="button" onClick={() => salvar(true, true)}>Aceitar todos</button>
          <button className="btn-ghost" type="button" onClick={() => salvar(false, false)}>Só os necessários</button>
          <button className="ck-link" type="button" onClick={() => setDetalhe(true)}>Personalizar</button>
        </div>
      </div>
      <div id="ck-detalhe" hidden={!detalhe}>
        <h2>Preferências de cookies</h2>
        <label className="ck-opcao"><span><b>Necessários</b><small>Guardam sua escolha, o tema e a sessão do painel. Sempre ativos.</small></span><input type="checkbox" checked disabled readOnly /></label>
        <label className="ck-opcao"><span><b>Estatísticas</b><small>Mostram, de forma agregada, quais matérias são lidas.</small></span><input type="checkbox" checked={estat} onChange={(e) => setEstat(e.target.checked)} /></label>
        <label className="ck-opcao"><span><b>Publicidade personalizada</b><small>Anúncios com base na sua navegação. Desligado: anúncios não personalizados.</small></span><input type="checkbox" checked={publi} onChange={(e) => setPubli(e.target.checked)} /></label>
        <div className="ck-botoes">
          <button className="btn" type="button" onClick={() => salvar(estat, publi)}>Salvar escolhas</button>
          <button className="btn-ghost" type="button" onClick={() => salvar(true, true)}>Aceitar todos</button>
        </div>
      </div>
    </section>
  );
}
