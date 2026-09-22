// Novidades de quem a pessoa segue (autor ou categoria). O número no menu da conta conta o que
// saiu depois da última vez que ela abriu a aba Novidades (leitores.novidades_vistas_em).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { db } from "./db";

export interface Novidade { id: string; publicada_em: string; motivo: "autor" | "categoria" }

export function useNovidades() {
  const { user, leitor } = useAuth();
  const vistas = leitor?.novidades_vistas_em ?? null;
  return useQuery({
    queryKey: ["novidades", user?.id, vistas],
    enabled: !!user,
    staleTime: 5 * 60e3,
    queryFn: async () => {
      const { data } = await db.rpc("minhas_novidades", { _limite: 60 });
      const itens = (data ?? []) as Novidade[];
      return { itens, novas: itens.filter((n) => !vistas || n.publicada_em > vistas).length };
    },
  });
}

/** Marca as novidades como vistas (zera o número do menu). */
export function useMarcarNovidadesVistas() {
  const { user, recarregar } = useAuth();
  const qc = useQueryClient();
  return async () => {
    if (!user) return;
    await db.from("leitores").update({ novidades_vistas_em: new Date().toISOString() }).eq("user_id", user.id);
    await recarregar();
    qc.invalidateQueries({ queryKey: ["novidades"] });
  };
}
