# API de admin: controle do banco pelo Claude Code

Depois que o site estiver no Lovable, esta API deixa o Claude Code ler e alterar o banco
daqui, sem abrir o Lovable e sem gastar crédito: matérias, autores, publicidade, imagens.

Pense numa porta dos fundos com fechadura. A função `admin-api` fica no próprio site; o
comando `ferramentas/pulso.mjs` é a chave que o Claude usa daqui. Só quem tem a chave
(que fica no seu `.env` e nos segredos do Lovable) entra.

## O que dá para fazer

| Área | Exemplos |
|---|---|
| **Matérias** | listar a fila de revisão, corrigir título, publicar, arquivar |
| **Acessos e autores** | ver quem pediu acesso, liberar como autor/editor, autorizar um Gmail antes do login, remover acesso, editar CRM/bio |
| **Publicidade** | trocar o modo de um espaço, colar o código do AdSense, criar campanha interna, subir banner por link, ver relatório de exibições e cliques |
| **Imagens** | listar e enviar capas de reserva e banners, importar imagem a partir de um link |
| **Comunidade** | ver a fila de comentários, aprovar, recusar, apagar, bloquear leitor, ligar/desligar comentários e mudar o modo de moderação |
| **Agente** | ver quais estudos (PMID) já foram usados ou descartados |
| **Histórico** | toda alteração feita pela API fica registrada em `admin_log` |

### Proteções
- Só funciona com a chave certa (comparação que não deixa descobrir a chave por tentativa e tempo).
- Só as tabelas e ações listadas. Não existe "rodar SQL livre".
- **Apagar** sem `--confirmar` só arquiva (matéria vira `arquivada`, autor e campanha viram inativos, espaço vira `off`).
- Mesmo com a API liberada, o Claude **pergunta antes** de apagar, publicar ou mudar anúncio no ar.

## Banco: tabela de histórico

```sql
create table admin_log (
  id         bigint generated always as identity primary key,
  origem     text not null,              -- admin-api, painel, agente
  acao       text not null,              -- criar, atualizar, arquivar, apagar, publicar, enviar_arquivo...
  tabela     text not null,
  registros  jsonb not null default '[]'::jsonb,
  dados      jsonb,                      -- resumo do que mudou (textos longos cortados)
  criado_em  timestamptz not null default now()
);
alter table admin_log enable row level security;
create policy "admin le historico" on admin_log for select using (has_role(auth.uid(),'admin'));
```

Buckets usados: `capas`, `capas-reserva`, `anuncios`, `autores` e `perfis` (fotos de leitor).

## Ligar (uma vez, na importação para o Lovable)

1. **Gerar a chave.** Na aba Terminal, rode e copie o resultado (uma sequência longa de letras e números):
   ```
   node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
   ```
2. **No Lovable:** Cloud → Secrets → criar `PULSO_ADMIN_KEY` com essa sequência.
3. **No `.env`** da pasta `pulso-cientifico`, preencher:
   ```
   PULSO_API_URL=https://<projeto>.supabase.co/functions/v1/admin-api
   PULSO_ADMIN_KEY=<a mesma sequência>
   ```
   O endereço do projeto aparece no Lovable em Cloud → Overview (ou me peça para achar no código).
4. **Testar:** `node ferramentas/pulso.mjs tabelas` deve listar as tabelas liberadas.

Se a chave vazar, gere outra, troque nos dois lugares e a antiga deixa de funcionar na hora.

## Comandos

```bash
# Geral
node ferramentas/pulso.mjs tabelas
node ferramentas/pulso.mjs log --limite 20

# Matérias
node ferramentas/pulso.mjs listar materias --filtro status=em_revisao --colunas id,titulo,origem --ordem criada_em.desc
node ferramentas/pulso.mjs listar materias --filtro "titulo~ilike~%dengue%"
node ferramentas/pulso.mjs contar materias --filtro status=publicada
node ferramentas/pulso.mjs atualizar materias <id> --dados '{"titulo":"Novo título"}'
node ferramentas/pulso.mjs publicar <id>
node ferramentas/pulso.mjs apagar materias <id>                # arquiva

# Acessos e autores (login só com Google)
node ferramentas/pulso.mjs pedidos
node ferramentas/pulso.mjs autorizar medica@gmail.com --papel autor
node ferramentas/pulso.mjs criar autores --dados '{"user_id":"<id>","slug":"nome-sobrenome","nome":"Dra. Nome","tipo":"medico","crm":"123456","crm_uf":"SP","especialidade":"Cardiologia","rqe":"12345"}'
node ferramentas/pulso.mjs atualizar autores <id> --dados '{"bio":"..."}'

# Publicidade
node ferramentas/pulso.mjs adsense --client ca-pub-1234567890123456 --situacao aprovada
node ferramentas/pulso.mjs listar espacos_anuncio
node ferramentas/pulso.mjs espaco topo --modo adsense --html-arquivo bloco-topo.html --fallback true
node ferramentas/pulso.mjs espaco lateral --modo interno
node ferramentas/pulso.mjs imagem-url anuncios clinica-x/300x250.jpg https://exemplo.com/banner-300x250.jpg
node ferramentas/pulso.mjs criar campanhas_internas --dados-arquivo campanha.json
node ferramentas/pulso.mjs atualizar campanhas_internas <id> --dados '{"fim":"2026-12-31"}'
node ferramentas/pulso.mjs relatorio --de 2026-10-01 --ate 2026-10-31

# Imagens
node ferramentas/pulso.mjs arquivos capas-reserva doencas/
node ferramentas/pulso.mjs enviar capas-reserva doencas/01.jpg ./foto.jpg
```

Filtros: `coluna=valor` para igual, ou `coluna~op~valor` com `op` = `neq`, `gt`, `gte`, `lt`,
`lte`, `like`, `ilike`, `in` (valores separados por vírgula) ou `is` (`null`, `true`, `false`).

### Exemplo de `campanha.json`
```json
{
  "nome": "Clínica X — novembro",
  "anunciante": "Clínica X",
  "link_url": "https://clinicax.com.br/?utm_source=pulso&utm_medium=banner",
  "imagens": {
    "300x250": "https://<projeto>.supabase.co/storage/v1/object/public/anuncios/clinica-x/300x250.jpg",
    "728x90": "https://<projeto>.supabase.co/storage/v1/object/public/anuncios/clinica-x/728x90.jpg"
  },
  "alt": "Clínica X: check-up cardiológico",
  "espacos": ["lateral", "topo"],
  "inicio": "2026-11-01",
  "fim": "2026-11-30",
  "peso": 3
}
```

## Comentários pelo terminal

```bash
node ferramentas/pulso.mjs moderar                    # fila: o que está em análise
node ferramentas/pulso.mjs moderar --denunciados      # publicados com denúncia
node ferramentas/pulso.mjs aprovar <id>
node ferramentas/pulso.mjs recusar <id>
node ferramentas/pulso.mjs bloquear <user_id>         # o leitor continua lendo, mas não comenta
node ferramentas/pulso.mjs comunidade --moderacao posterior
node ferramentas/pulso.mjs comunidade --comentarios off
```

Curtidas e salvos entram só como contagem (`contar curtidas`, `contar salvos`): são dados do
leitor, não material de edição. Regras completas em `COMUNIDADE.md`.

## Como a gente trabalha com isso

Você me manda por aqui, do seu jeito: *"sobe esse banner da Clínica X na lateral de 1 a 30
de novembro, link tal"*. Eu importo a imagem, crio a campanha, mostro o que vai mudar e só
aplico depois do seu ok. Depois confiro com `listar` e mostro o resultado.

## E mudanças no código do site?

A API mexe só no **conteúdo** (banco e imagens). Mudança de **layout ou funcionalidade**
ainda é código. Para isso também não gastar crédito: conectar o projeto do Lovable ao
**GitHub**. Eu altero o código aqui e envio para o GitHub; o Lovable puxa sozinho.
Atenção à armadilha das duas contas (Shalmand e showamarketing), a mesma do DocLytics.
