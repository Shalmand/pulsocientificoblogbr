import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCats } from "@/lib/dados";
import { useAuth } from "@/lib/auth";
import { useNovidades } from "@/lib/novidades";
import { useToast } from "@/lib/toast";
import { Avatar } from "./Avatar";
import { IcMaterias, IcNovidades, IcPessoa, IcSair, IcSalvos, Lua, Lupa, Menu } from "./Icones";

export function Logo({ soEscura = false }: { soEscura?: boolean }) {
  if (soEscura) return <img className="marca-escura" src="/marca/pulso-horizontal-claro.svg" alt="Pulso Científico" width={762} height={132} />;
  return (
    <>
      <img className="marca-clara" src="/marca/pulso-horizontal.svg" alt="Pulso Científico" width={762} height={132} />
      <img className="marca-escura" src="/marca/pulso-horizontal-claro.svg" alt="" aria-hidden="true" width={762} height={132} />
    </>
  );
}

export function alternarTema() {
  const escuro = document.documentElement.classList.toggle("dark");
  try { localStorage.setItem("pulso-tema", escuro ? "escuro" : "claro"); } catch { /* sem armazenamento */ }
}

function ContaBotao() {
  const { ehLogado, eu, user, escreve, sair } = useAuth();
  const [aberto, setAberto] = useState(false);
  const { data: novidades } = useNovidades();
  const novas = novidades?.novas ?? 0;
  const toast = useToast();
  const nav = useNavigate();
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("click", fora);
    return () => document.removeEventListener("click", fora);
  }, []);
  if (!ehLogado) return <div className="conta-wrap" id="conta-header"><Link className="entrar-btn" to="/entrar">Entrar</Link></div>;
  return (
    <div className="conta-wrap" id="conta-header" ref={raiz}>
      <button type="button" className="conta-btn" aria-expanded={aberto} aria-controls="conta-menu" onClick={() => setAberto(!aberto)}>
        <Avatar nome={eu.nome} foto={eu.foto} /><span>{eu.nome.split(" ")[0]}</span>
        {novas > 0 && <i className="conta-aviso" aria-label={`${novas} novidades de quem você segue`}>{novas > 9 ? "9+" : novas}</i>}
      </button>
      <div className="conta-menu" id="conta-menu" hidden={!aberto}>
        <div className="conta-menu-topo"><Avatar nome={eu.nome} foto={eu.foto} /><div style={{ minWidth: 0 }}><b>{eu.nome}</b><small>{user?.email}</small></div></div>
        <Link to="/conta" onClick={() => setAberto(false)}><IcPessoa />Minha conta</Link>
        <Link to="/conta?aba=novidades" onClick={() => setAberto(false)}><IcNovidades />Novidades{novas > 0 && <span className="conta-menu-n">{novas}</span>}</Link>
        <Link to="/conta?aba=salvos" onClick={() => setAberto(false)}><IcSalvos />Salvos</Link>
        {escreve && <Link to="/painel" onClick={() => setAberto(false)}><IcMaterias />Painel</Link>}
        <hr />
        <button type="button" onClick={async () => { setAberto(false); await sair(); toast("Você saiu da sua conta."); nav("/"); }}><IcSair />Sair</button>
      </div>
    </div>
  );
}

export function Cabecalho() {
  const cats = useCats();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [menuMovel, setMenuMovel] = useState(false);
  useEffect(() => setMenuMovel(false), [pathname]);
  const primeiro = pathname.split("/")[1] || "home";
  const tops = cats.principais();

  return (
    <>
      <header className="head">
        <div className="wrap">
          <Link to="/" className="logo" aria-label="Pulso Científico — início"><Logo /></Link>
          <nav className="nav" id="nav-categorias" aria-label="Categorias">
            <Link to="/" className={primeiro === "home" ? "on" : ""}>Início</Link>
            {tops.map((c, i) => {
              const subs = cats.filhos(c.slug);
              const temMicro = subs.some((sc) => cats.filhos(sc.slug).length);
              return (
                <div className="nav-item" key={c.slug}>
                  <Link to={cats.urlCat(c.slug)} className={primeiro === c.slug ? "on" : ""} aria-haspopup={subs.length ? "true" : undefined}>
                    {c.nome}{subs.length ? <> <small>▾</small></> : null}
                  </Link>
                  {subs.length > 0 && (temMicro ? (
                    <div className={`nav-sub mega${i >= tops.length / 2 ? " direita" : ""}`}>
                      <div className="mega-grade">
                        {subs.map((sc) => (
                          <div className="mega-col" key={sc.slug}>
                            <Link className="mega-titulo" to={cats.urlCat(sc.slug)}>{sc.nome}</Link>
                            {cats.filhos(sc.slug).map((mc) => <Link key={mc.slug} to={cats.urlCat(mc.slug)}>{mc.nome}</Link>)}
                          </div>
                        ))}
                      </div>
                      <Link className="nav-todas" to={cats.urlCat(c.slug)}>Tudo em {c.nome} →</Link>
                    </div>
                  ) : (
                    <div className="nav-sub">
                      {subs.map((sc) => <Link key={sc.slug} to={cats.urlCat(sc.slug)}>{sc.nome}</Link>)}
                      <Link className="nav-todas" to={cats.urlCat(c.slug)}>Tudo em {c.nome} →</Link>
                    </div>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="head-r">
            <ContaBotao />
            <button className="icon-btn" id="theme" aria-label="Alternar tema claro/escuro" onClick={alternarTema}><Lua /></button>
            <button className="icon-btn" aria-label="Buscar" onClick={() => nav("/busca")}><Lupa /></button>
            <button className="icon-btn burger" aria-label="Abrir menu" aria-controls="menu-movel" onClick={() => setMenuMovel(!menuMovel)}><Menu /></button>
          </div>
        </div>
      </header>
      <nav className="menu-movel" id="menu-movel" aria-label="Categorias" hidden={!menuMovel}>
        <div className="wrap">
          <Link to="/">Início</Link>
          {tops.map((c) => (
            <details key={c.slug}>
              <summary>{c.nome}</summary>
              <Link to={cats.urlCat(c.slug)}>Tudo em {c.nome}</Link>
              {cats.filhos(c.slug).map((sc) => (
                <span key={sc.slug} style={{ display: "contents" }}>
                  <Link to={cats.urlCat(sc.slug)}>{sc.nome}</Link>
                  {cats.filhos(sc.slug).map((mc) => <Link key={mc.slug} className="micro" to={cats.urlCat(mc.slug)}>{mc.nome}</Link>)}
                </span>
              ))}
            </details>
          ))}
        </div>
      </nav>
    </>
  );
}
