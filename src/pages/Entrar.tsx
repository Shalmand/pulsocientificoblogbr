import { Link, Navigate } from "react-router-dom";
import { entrarComGoogle, useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { useToast } from "@/lib/toast";
import { Logo } from "@/components/Cabecalho";
import { Google } from "@/components/Icones";
import { Carregando } from "@/components/Cartoes";

export default function Entrar() {
  useSeo({ titulo: "Entrar", descricao: "Entre com a sua conta Google para curtir, salvar e comentar.", url: "/entrar", semIndice: true });
  const { carregando, ehLogado, precisaCompletar, escreve } = useAuth();
  const toast = useToast();

  // Depois do login com Google o site volta para cá e decide o destino:
  // quem escreve e ainda não completou o cadastro → /completar; quem escreve → painel; leitor → conta
  if (ehLogado && carregando) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (ehLogado) return <Navigate to={precisaCompletar ? "/completar" : escreve ? "/painel" : "/conta"} replace />;

  return (
    <section className="view on" id="v-login" aria-label="Entrar">
      <div className="wrap login-wrap">
        <div className="login">
          <div className="login-card">
            <Link to="/" className="logo"><Logo /></Link>
            <h1>Entrar no Pulso Científico</h1>
            <p>Use a sua conta Google para curtir, salvar e comentar as matérias. Leitores entram na hora, sem cadastro.</p>
            <button type="button" className="google-btn" id="entrar-google" onClick={() => entrarComGoogle().catch(() => toast("Não deu para abrir o login do Google. Tente de novo."))}>
              <Google />
              Entrar com Google
            </button>
            <p className="login-note">Quer escrever no Pulso? Conte quem você é em <Link to="/parceria" className="link-sm">Escreva com a gente</Link>. Se der certo, liberamos o seu Gmail e o painel abre no primeiro login.</p>
          </div>
          <p className="login-foot">Entrar com Google é a única forma de login do site, para leitor,<br />autor e admin.</p>
        </div>
      </div>
    </section>
  );
}
