// Rotas do site. Português em todos os endereços. Não renomear: o sitemap, o agente e os links
// já publicados dependem deles.
import { Suspense, lazy, useEffect } from "react";
import { ErroTela } from "@/components/ErroTela";
import { BrowserRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { AvisoCookies } from "@/components/AvisoCookies";
import Home from "@/pages/Home";
import Categoria from "@/pages/Categoria";
import SegundoNivel from "@/pages/SegundoNivel";
import Autor from "@/pages/Autor";
import Pagina from "@/pages/Pagina";
import Parceiros from "@/pages/Parceiros";
import Parceria from "@/pages/Parceria";
import Entrar from "@/pages/Entrar";
import Conta from "@/pages/Conta";
import Completar from "@/pages/Completar";
import NaoEncontrada from "@/pages/NaoEncontrada";
import Busca from "@/pages/Busca";
import Tag from "@/pages/Tag";
import { useMedicao } from "@/lib/medicao";
import { Carregando } from "@/components/Cartoes";

// O painel vem num pacote separado: quem só lê matéria não baixa o editor
const PainelMaterias = lazy(() => import("@/pages/painel/Materias"));
const Editor = lazy(() => import("@/pages/painel/Editor"));
const Acessos = lazy(() => import("@/pages/painel/Acessos"));
const Categorias = lazy(() => import("@/pages/painel/Categorias"));
const Publicidade = lazy(() => import("@/pages/painel/Publicidade"));
const Moderacao = lazy(() => import("@/pages/painel/Comentarios"));
const Auditoria = lazy(() => import("@/pages/painel/Auditoria"));

const PAGINAS = ["sobre", "politica-editorial", "politica-de-privacidade", "termos-de-uso", "cookies"];

function CategoriaNivel1() { const { categoria = "" } = useParams(); return <Categoria key={categoria} slugs={[categoria]} />; }
function CategoriaNivel3() { const { categoria = "", segundo = "", micro = "" } = useParams(); return <Categoria key={micro} slugs={[categoria, segundo, micro]} />; }
function SegundoComChave() { const { categoria = "", segundo = "" } = useParams(); return <SegundoNivel key={`${categoria}/${segundo}`} />; }

/** Um erro numa página não derruba o cabeçalho; ao trocar de página o aviso some sozinho. */
function ProtegerPagina({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErroTela key={pathname}>{children}</ErroTela>;
}

function RolarParaCima() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useMedicao(pathname);
  return null;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RolarParaCima />
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo">
        <ProtegerPagina>
        <Suspense fallback={<section className="view on"><div className="wrap"><Carregando /></div></section>}>
        <Routes>
          <Route path="/" element={<Home />} />
          {PAGINAS.map((p) => <Route key={p} path={`/${p}`} element={<Pagina />} />)}
          <Route path="/parceiros" element={<Parceiros />} />
          <Route path="/parceria" element={<Parceria />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/completar" element={<Completar />} />
          <Route path="/autor/:slug" element={<Autor />} />
          <Route path="/busca" element={<Busca />} />
          <Route path="/tag/:tag" element={<Tag />} />
          <Route path="/painel" element={<PainelMaterias />} />
          <Route path="/painel/nova" element={<Editor />} />
          <Route path="/painel/materia/:id" element={<Editor />} />
          <Route path="/painel/acessos" element={<Acessos />} />
          <Route path="/painel/categorias" element={<Categorias />} />
          <Route path="/painel/publicidade" element={<Publicidade />} />
          <Route path="/painel/comentarios" element={<Moderacao />} />
          <Route path="/painel/auditoria" element={<Auditoria />} />
          <Route path="/painel/*" element={<NaoEncontrada />} />
          <Route path="/:categoria" element={<CategoriaNivel1 />} />
          <Route path="/:categoria/:segundo" element={<SegundoComChave />} />
          <Route path="/:categoria/:segundo/:micro" element={<CategoriaNivel3 />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
        </Suspense>
        </ProtegerPagina>
      </main>
      <Rodape />
      <AvisoCookies />
    </BrowserRouter>
  );
}
