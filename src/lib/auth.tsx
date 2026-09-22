// Quem está logado. Login só com Google (para leitor, autor e admin).
// O papel vem SEMPRE da tabela user_roles; o perfil de leitor de `leitores`; o de autor de `autores`.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { db } from "./db";
import type { Autor, Leitor, Papel } from "./tipos";

/**
 * Entrar com Google. Se o Lovable Cloud pedir o seu próprio helper de login gerenciado
 * (por exemplo `lovable.auth.signInWithOAuth("google", ...)`), troque SÓ o corpo desta função.
 */
export async function entrarComGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/entrar` },
  });
  if (error) throw error;
}

const ORDEM: Papel[] = ["admin", "editor", "autor_medico", "autor", "parceiro", "parceiro_publicidade"];

interface Estado {
  carregando: boolean;
  user: User | null;
  leitor: Leitor | null;
  papel: Papel | null;
  autor: Autor | null;
  ehLogado: boolean;
  ehStaff: boolean;
  ehAdmin: boolean;
  /** Pode abrir o painel: tem perfil de autor ou é da equipe. */
  escreve: boolean;
  /** Pode escrever em Saúde (autor médico, editor ou admin). */
  podeSaude: boolean;
  /** Primeiro login de quem escreve: falta completar o cadastro do papel. */
  precisaCompletar: boolean;
  /** Nome e foto que aparecem em comentários e no cabeçalho. A Redação é coletiva: aparece a pessoa. */
  eu: { nome: string; foto: string | null; autorSlug: string | null; selo: string | null };
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<Estado | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [leitor, setLeitor] = useState<Leitor | null>(null);
  const [papel, setPapel] = useState<Papel | null>(null);
  const [autor, setAutor] = useState<Autor | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (u: User | null) => {
    if (!u) { setLeitor(null); setPapel(null); setAutor(null); setCarregando(false); return; }
    const [l, r, a] = await Promise.all([
      db.from("leitores").select("*").eq("user_id", u.id).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", u.id),
      db.from("autores").select("*").eq("user_id", u.id).maybeSingle(),
    ]);
    let meuLeitor = l.data as Leitor | null;
    if (!meuLeitor) {
      // perfil apagado pela própria pessoa: recria no login, com os dados da conta Google
      const novo = {
        user_id: u.id, email: (u.email ?? "").toLowerCase(),
        nome: (u.user_metadata?.full_name as string) || (u.email ?? "").split("@")[0],
        foto_url: (u.user_metadata?.avatar_url as string) || null,
      };
      const ins = await db.from("leitores").insert(novo).select("*").maybeSingle();
      meuLeitor = (ins.data as Leitor) ?? null;
    }
    const papeis = ((r.data ?? []) as { role: Papel }[]).map((x) => x.role);
    setLeitor(meuLeitor);
    setPapel(ORDEM.find((p) => papeis.includes(p)) ?? null);
    setAutor((a.data as Autor) ?? null);
    setCarregando(false);
  }, []);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); carregarPerfil(data.session?.user ?? null); });
    const { data } = db.auth.onAuthStateChange((_evento, sessao) => {
      const u = sessao?.user ?? null;
      setUser((antes) => {
        if (antes?.id !== u?.id) { setCarregando(true); setTimeout(() => carregarPerfil(u), 0); }
        return u;
      });
    });
    return () => data.subscription.unsubscribe();
  }, [carregarPerfil]);

  const valor = useMemo<Estado>(() => {
    const ehStaff = papel === "admin" || papel === "editor";
    const autorPessoal = autor && autor.tipo !== "redacao" ? autor : null;
    return {
      carregando, user, leitor, papel, autor,
      ehLogado: !!user,
      ehStaff,
      ehAdmin: papel === "admin",
      escreve: !!papel && (ehStaff || !!autor),
      podeSaude: ehStaff || papel === "autor_medico",
      precisaCompletar: !!papel && !!autor && autor.tipo !== "redacao" && !autor.cadastro_completo_em,
      eu: {
        nome: autorPessoal?.nome || leitor?.nome || (user?.user_metadata?.full_name as string) || "Leitor",
        foto: autorPessoal?.foto_url || leitor?.foto_url || null,
        autorSlug: autorPessoal?.slug || null,
        selo: ehStaff ? "Equipe" : papel ? "Autor" : null,
      },
      recarregar: () => carregarPerfil(user),
      sair: async () => { await db.auth.signOut(); },
    };
  }, [carregando, user, leitor, papel, autor, carregarPerfil]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do AuthProvider");
  return v;
}
