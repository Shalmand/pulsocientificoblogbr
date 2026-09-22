import { Link } from "react-router-dom";
import { useCats } from "@/lib/dados";
import { abrirPreferenciasCookies } from "@/lib/consentimento";
import { urlFeed } from "@/lib/medicao";
import { Logo } from "./Cabecalho";

export function Rodape() {
  const cats = useCats();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-top">
          <div>
            <Link to="/" className="logo"><Logo soEscura /></Link>
            <p>Pesquisas recentes de saúde, inteligência artificial, tecnologia, espaço e meio ambiente, explicadas em português e sempre com link para o estudo original.</p>
          </div>
          <div><h4>Categorias</h4><ul id="rodape-categorias">{cats.principais().map((c) => <li key={c.slug}><Link to={cats.urlCat(c.slug)}>{c.nome}</Link></li>)}</ul></div>
          <div><h4>Institucional</h4><ul>
            <li><Link to="/sobre">Sobre nós</Link></li>
            <li><Link to="/parceiros">Parceiros</Link></li>
            <li><Link to="/parceria">Escreva com a gente</Link></li>
            <li><Link to="/politica-editorial">Política editorial</Link></li>
            <li><a href="mailto:blog.pulsocientifico@gmail.com">Contato</a></li>
            <li><Link to="/entrar">Área dos autores</Link></li>
            <li><a href={urlFeed()} target="_blank" rel="noopener">Feed RSS</a></li>
          </ul></div>
          <div><h4>Legal</h4><ul>
            <li><Link to="/politica-de-privacidade">Política de privacidade</Link></li>
            <li><Link to="/termos-de-uso">Termos de uso</Link></li>
            <li><Link to="/cookies">Política de cookies</Link></li>
            <li><button type="button" className="foot-link" onClick={abrirPreferenciasCookies}>Preferências de cookies</button></li>
          </ul></div>
        </div>
        <div className="foot-bot"><span>© {new Date().getFullYear()} Pulso Científico. Conteúdo informativo, não substitui orientação médica.</span></div>
      </div>
    </footer>
  );
}
