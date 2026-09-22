// verificar-crm — guarda o CRM que o autor médico informou e confere no conselho.
//
// POST /functions/v1/verificar-crm
//   Cabeçalho: Authorization: Bearer <JWT do usuário logado>
//   Corpo:     { "crm": "123456", "uf": "SP" }
//   Resposta:  { ok, situacao, nome_conselho?, mensagem }
//
// Provedor por segredo (CRM_PROVEDOR):
//   nenhum      → só guarda o CRM; o admin confere no portal do CFM e libera na tela de Acessos
//   infosimples → API paga por consulta (https://infosimples.com/consultas/cfm-cadastro/)
//   cfm         → webservice oficial do CFM (Resolução 2.129/15, assinatura anual)
//
// Nenhuma consulta prova que quem digitou é o dono do registro: ela diz que o registro existe,
// está ativo e pertence a fulano. Por isso comparamos o nome e o admin libera cada e-mail antes.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

type Situacao = "pendente" | "verificado" | "divergente" | "nao_encontrado";
type Resultado = { situacao: Situacao; nome?: string; mensagem: string };

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ erro: "Entre na sua conta antes." }, 401);

  let corpo: { crm?: string; uf?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Corpo precisa ser JSON." }, 400);
  }
  const crm = String(corpo.crm ?? "").replace(/\D/g, "");
  const uf = String(corpo.uf ?? "").toUpperCase();
  if (!/^\d{4,7}$/.test(crm)) return json({ erro: "CRM deve ter de 4 a 7 números." }, 400);
  if (!UFS.includes(uf)) return json({ erro: "UF inválida." }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: sessao } = await anon.auth.getUser();
  const usuario = sessao?.user;
  if (!usuario) return json({ erro: "Sessão inválida." }, 401);

  // service role: só esta função escreve em crm_situacao
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: papel } = await db.from("user_roles").select("role").eq("user_id", usuario.id).eq("role", "autor_medico").maybeSingle();
  if (!papel) return json({ erro: "Só autor médico confirma CRM." }, 403);

  const { data: perfil, error: erroPerfil } = await db
    .from("autores").select("id, nome, crm, crm_uf, crm_situacao").eq("user_id", usuario.id).maybeSingle();
  if (erroPerfil || !perfil) return json({ erro: "Perfil de autor não encontrado." }, 404);
  if (perfil.crm_situacao === "verificado" || perfil.crm_situacao === "conferido_a_mao") {
    return json({ erro: "Este CRM já foi confirmado. Para trocar, fale com o administrador." }, 409);
  }

  const r = await consultar(crm, uf, perfil.nome);
  const { error } = await db.from("autores").update({
    crm,
    crm_uf: uf,
    crm_situacao: r.situacao,
    crm_nome_conselho: r.nome ?? null,
    crm_verificado_em: r.situacao === "verificado" ? new Date().toISOString() : null,
    ativo: r.situacao === "verificado",
  }).eq("id", perfil.id);
  if (error) return json({ erro: error.message }, 400);

  await db.from("admin_log").insert({
    origem: "verificar-crm",
    acao: r.situacao,
    tabela: "autores",
    registros: [perfil.id],
    dados: { crm, uf, provedor: Deno.env.get("CRM_PROVEDOR") ?? "nenhum", nome_conselho: r.nome ?? null },
  });

  return json({ ok: true, situacao: r.situacao, nome_conselho: r.nome, mensagem: r.mensagem });
});

async function consultar(crm: string, uf: string, nomeAutor: string): Promise<Resultado> {
  const provedor = (Deno.env.get("CRM_PROVEDOR") ?? "nenhum").toLowerCase();
  const chave = Deno.env.get("CRM_API_CHAVE") ?? "";

  if (provedor === "nenhum" || !chave) {
    return { situacao: "pendente", mensagem: "CRM guardado. A equipe confere no portal do CFM e libera o seu acesso." };
  }

  try {
    const achado = provedor === "infosimples"
      ? await viaInfosimples(crm, uf, chave)
      : await viaCfm(crm, uf, chave);

    if (!achado) return { situacao: "nao_encontrado", mensagem: "O conselho não encontrou esse registro nessa UF. Confira o número." };
    if (achado.situacao && !/ativo|regular/i.test(achado.situacao)) {
      return { situacao: "divergente", nome: achado.nome, mensagem: `O registro consta como "${achado.situacao}". A equipe vai conferir.` };
    }
    if (!mesmaPessoa(achado.nome, nomeAutor)) {
      return { situacao: "divergente", nome: achado.nome, mensagem: "O nome do registro não bate com o da sua conta. A equipe vai conferir." };
    }
    return { situacao: "verificado", nome: achado.nome, mensagem: "CRM confirmado. Você já pode escrever em Saúde." };
  } catch (e) {
    console.error("consulta de CRM falhou:", (e as Error).message);
    return { situacao: "pendente", mensagem: "Não deu para consultar o conselho agora. A equipe confere na mão." };
  }
}

type Achado = { nome: string; situacao?: string } | null;

async function viaInfosimples(crm: string, uf: string, token: string): Promise<Achado> {
  const r = await fetch("https://api.infosimples.com/api/v2/consultas/cfm/cadastro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, inscricao: crm, uf, timeout: 20 }),
  });
  const j = await r.json();
  const linha = j?.data?.[0];
  if (!linha) return null;
  return { nome: String(linha.nome ?? ""), situacao: linha.situacao ? String(linha.situacao) : undefined };
}

// Webservice oficial do CFM (assinatura anual). O endereço e o formato saem no manual que
// o CFM entrega junto com a chave: sistemas.cfm.org.br/listamedicos/informacoes
async function viaCfm(crm: string, uf: string, chave: string): Promise<Achado> {
  const endereco = Deno.env.get("CRM_API_URL");
  if (!endereco) throw new Error("CRM_API_URL não configurada para o provedor cfm.");
  const r = await fetch(`${endereco}?crm=${crm}&uf=${uf}`, { headers: { Authorization: chave } });
  if (!r.ok) throw new Error(`CFM respondeu ${r.status}`);
  const j = await r.json();
  const linha = Array.isArray(j) ? j[0] : j?.medico ?? j;
  if (!linha?.nome) return null;
  return { nome: String(linha.nome), situacao: linha.situacao ? String(linha.situacao) : undefined };
}

// "Dra. Helena Souza Lima" e "HELENA SOUZA LIMA" são a mesma pessoa; sobrenome trocado não é.
function mesmaPessoa(a: string, b: string) {
  const limpar = (t: string) =>
    t.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/\b(dr|dra|prof|profa)\.?\b/g, "")
      .replace(/[^a-z\s]/g, " ").split(/\s+/).filter((p) => p.length > 2);
  const x = limpar(a), y = limpar(b);
  if (!x.length || !y.length) return false;
  const iguais = x.filter((p) => y.includes(p)).length;
  return iguais >= Math.min(2, Math.min(x.length, y.length)) && iguais / Math.max(x.length, y.length) >= 0.5;
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}
