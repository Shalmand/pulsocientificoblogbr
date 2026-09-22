// Formato das linhas do banco (ver supabase/migrations/*_estrutura.sql)

export type Papel = "admin" | "editor" | "autor" | "autor_medico" | "parceiro" | "parceiro_publicidade";

export type TipoAutor = "redacao" | "medico" | "profissional_saude" | "jornalista" | "organizacao" | "publicidade";

export type CrmSituacao = "nao_aplica" | "pendente" | "verificado" | "divergente" | "nao_encontrado" | "conferido_a_mao";

export type Links = Partial<Record<"site" | "instagram" | "youtube" | "tiktok" | "doctoralia" | "email", string>>;

export interface Categoria {
  slug: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  pai: string | null;
  nivel: 1 | 2 | 3;
  ordem: number;
  ativa: boolean;
}

export interface Autor {
  id: string;
  user_id: string | null;
  slug: string;
  nome: string;
  tipo: TipoAutor;
  crm: string | null;
  crm_situacao: CrmSituacao;
  crm_uf: string | null;
  especialidade: string | null;
  rqe: string | null;
  bio: string | null;
  formacao: string | null;
  foto_url: string | null;
  links: Links;
  ativo: boolean;
  agente_padrao: boolean;
  declarou_em: string | null;
  cadastro_completo_em: string | null;
  criado_em: string;
}

export interface Credito {
  fonte?: "pexels" | "pixabay" | "unsplash" | "upload" | "reserva";
  autor?: string;
  link?: string;
  perfil?: string;
  id?: string | number;
}

export interface Fonte {
  tipo?: "estudo" | "preprint" | "comunicado";
  revista?: string;
  titulo_original?: string;
  autores?: string;
  citacao?: string;
  data?: string;
  url?: string;
  doi?: string | null;
  pmid?: string | null;
}

export type StatusMateria = "rascunho" | "em_revisao" | "publicada" | "arquivada";

export interface Materia {
  id: string;
  autor_id: string;
  tipo: "estudo" | "artigo";
  slug: string;
  editoria: string;
  subcategoria: string | null;
  microcategoria: string | null;
  titulo: string;
  linha_fina: string;
  corpo_html: string;
  seo: { palavra_chave?: string; tags?: string[] };
  imagem_url: string | null;
  imagem_alt: string | null;
  imagem_credito: Credito | null;
  fonte: Fonte | null;
  tempo_leitura: number;
  origem: "painel" | "agente";
  status: StatusMateria;
  publicada_em: string | null;
  corrigida_em: string | null;
  nota_correcao: string | null;
  atualizada_em: string;
  criada_em: string;
  curtidas_qtd: number;
  comentarios_qtd: number;
  leituras_qtd: number;
  autor?: Autor | null;
}

export interface Pagina {
  slug: string;
  titulo: string;
  linha_fina: string | null;
  corpo_html: string;
  atualizada_em: string;
}

export interface Leitor {
  user_id: string;
  email: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  bloqueado: boolean;
  criado_em: string;
  novidades_vistas_em?: string;
}

export interface Comentario {
  id: string;
  materia_id: string;
  user_id: string;
  responde_a: string | null;
  texto: string;
  status: "em_analise" | "publicado" | "recusado";
  denuncias: number;
  criado_em: string;
  editado_em: string | null;
}

export interface PerfilPublico {
  user_id: string;
  nome: string;
  foto_url: string | null;
  autor_slug: string | null;
  equipe: boolean;
}
