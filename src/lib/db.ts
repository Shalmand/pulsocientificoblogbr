// Acesso ao banco. Todas as telas usam `db` daqui.
// É o mesmo cliente de src/integrations/supabase/client.ts, sem os tipos gerados, para que uma
// regeração automática dos tipos não quebre as consultas. As regras de acesso ficam no banco (RLS).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as unknown as SupabaseClient<any, "public", any>;

/** Endereço público de um arquivo num bucket. */
export const urlPublica = (bucket: string, caminho: string) => db.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;

/** Mensagem de erro legível: o banco devolve o texto das exceções em português. */
export function msgErro(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e ?? "");
  if (/row-level security|permission denied/i.test(m)) return "Você não tem permissão para isso.";
  if (/duplicate key/i.test(m)) return "Já existe um registro com esse endereço.";
  return m || "Algo deu errado. Tente de novo.";
}

/** Chama uma função do servidor (Edge Function) com o login de quem está no site. */
export async function chamarFuncao<T>(nome: string, corpo: unknown): Promise<T> {
  const { data, error } = await db.functions.invoke(nome, { body: corpo as Record<string, unknown> });
  if (error) {
    // a função devolve { erro } com o motivo; o supabase-js guarda a resposta em error.context
    let detalhe = "";
    try { detalhe = (await (error as { context?: Response }).context?.json())?.erro ?? ""; } catch { /* sem corpo */ }
    throw new Error(detalhe || error.message);
  }
  if ((data as { erro?: string })?.erro) throw new Error((data as { erro: string }).erro);
  return data as T;
}
