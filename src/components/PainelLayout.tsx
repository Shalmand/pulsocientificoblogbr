// Moldura do painel: menu lateral, quem está logado e as permissões de cada tela.
// Cabeçalho e rodapé do site somem aqui (classe "app" no body, como no protótipo).
import { useEffect, type ReactNode } from "react";
import { Link, NavLink, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PAPEL_NOME } from "@/lib/formato";
import { Avatar } from "./Avatar";
import { Logo } from "./Cabecalho";
import { Carregando } from "./Cartoes";
import { IcAcessos, IcAuditoria, IcCategorias, IcComentarios, IcFila, IcMaterias, IcNova, IcPessoa, IcPublicidade } from "./Icones";

export type NivelPainel = "escreve" | "staff" | "admin";

function useContagens(ativo: boolean) {
  return useQuery({
    queryKey: ["painel-contagens"],
    enabled: ativo,
    refetchInterval: 60e3,
    queryFn: async () => {
      const [rev, crm, cand, anal, den] = await Promise.all([
        db.from("materias").select("*", { count: "exact", head: true }).eq("status", "em_revisao"),
        db.from("autores").select("*", { count: "exact", head: true }).eq("tipo", "medico").in("crm_situacao", ["pendente", "divergente"]).not("crm", "is", null),
        db.from("candidaturas").select("*", { count: "exact", head: true }).eq("status", "nova"),
        db.from("comentarios").select("*", { count: "exact", head: true }).eq("status", "em_analise"),
        db.from("comentarios").select("*", { count: "exact", head: true }).eq("status", "publicado").gt("denuncias", 0),
      ]);
      return { revisao: rev.count ?? 0, acessos: (crm.count ?? 0) + (cand.count ?? 0), comentarios: (anal.count ?? 0) + (den.count ?? 0) };
    },
  });
}

const Conta = ({ n }: { n?: number }) => (n ? <span className="count">{n}</span> : null);

export function PainelLayout({ nivel = "escreve", children }: { nivel?: NivelPainel; children: ReactNode }) {
  const { carregando, user, papel, autor, eu, escreve, ehStaff, ehAdmin, precisaCompletar } = useAuth();
  const { data: n } = useContagens(ehStaff);
  useEffect(() => {
    document.body.classList.add("app");
    return () => document.body.classList.remove("app");
  }, []);

  if (carregando) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!escreve) return <Navigate to="/conta" replace />;
  // primeiro login de quem escreve: completar o cadastro vem antes do painel
  if (precisaCompletar) return <Navigate to="/completar" replace />;
  if ((nivel === "staff" && !ehStaff) || (nivel === "admin" && !ehAdmin)) return <Navigate to="/painel" replace />;

  const paginaPropria = autor?.slug || "redacao-pulso";
  const on = ({ isActive }: { isActive: boolean }) => (isActive ? "on" : "");
  return (
    <section className="view app-view on" aria-label="Painel">
      <div className="app-shell">
        <aside className="app-side">
          <Link to="/" className="logo"><Logo /></Link>
          <nav className="app-nav" aria-label="Painel">
            <NavLink to="/painel" end className={on}><IcMaterias />Matérias</NavLink>
            <NavLink to="/painel/nova" className={on}><IcNova />Nova matéria</NavLink>
            <NavLink to="/conta" className={on}><IcPessoa />Meu perfil</NavLink>
            <Link to={`/autor/${paginaPropria}`}><IcPessoa />{paginaPropria === "redacao-pulso" && !autor ? "Página da Redação" : "Meu perfil público"}</Link>
            {ehStaff && (
              <>
                <p>Administração</p>
                <NavLink to="/painel?status=em_revisao" className={() => ""}><IcFila />Fila de revisão <Conta n={n?.revisao} /></NavLink>
                {ehAdmin && <NavLink to="/painel/acessos" className={on}><IcAcessos />Acessos <Conta n={n?.acessos} /></NavLink>}
                {ehAdmin && <NavLink to="/painel/categorias" className={on}><IcCategorias />Categorias</NavLink>}
                {ehAdmin && <NavLink to="/painel/publicidade" className={on}><IcPublicidade />Publicidade</NavLink>}
                <NavLink to="/painel/comentarios" className={on}><IcComentarios />Comentários <Conta n={n?.comentarios} /></NavLink>
                {ehAdmin && <NavLink to="/painel/auditoria" className={on}><IcAuditoria />Auditoria</NavLink>}
              </>
            )}
          </nav>
          <div className="me"><Avatar nome={eu.nome} foto={eu.foto} /><div><b>{eu.nome}</b><span>{PAPEL_NOME[papel ?? "leitor"]}</span></div></div>
        </aside>
        <div className="app-main">{children}</div>
      </div>
    </section>
  );
}
