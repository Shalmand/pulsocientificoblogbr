# Comunidade — contas de leitor, perfil, curtidas, salvos, seguidores e comentários

Duas coisas diferentes convivem no mesmo login do Google:

| | **Leitor** | **Autor / autor médico / editor / admin** |
|---|---|---|
| Como entra | clica em "Entrar com Google" e já está dentro | mesmo login, mas o Gmail precisa estar liberado antes |
| O que pode | curtir, salvar, seguir autor e categoria, comentar, editar o próprio perfil | tudo isso + painel, editor e moderação |
| Onde fica | tabela `leitores` | `leitores` + `autores` + `user_roles` |

**Login só com Google, para todo mundo** — leitor, autor e admin. Não existe senha, link mágico
nem outro provedor. Também **não existe pedido de acesso**: quem entra sem estar liberado é
leitor e pronto. Para escrever, o admin cadastra o Gmail em Painel → Acessos com o papel
(`autor`, `autor_medico` ou `editor`), e no primeiro login a pessoa já entra com o papel e com o
perfil público criado pelo banco.

## Meu perfil (`/conta`)

Uma tela só, para leitor e para quem escreve, com quatro abas:

- **Perfil** — foto, nome, e-mail e resumo/biografia.
- **Salvos** — as matérias guardadas.
- **Seguindo** — autores e categorias.
- **Meus comentários** — com o status de cada um.

Regras dos campos:

| Campo | Edita? | Observação |
|---|---|---|
| Foto | sim | upload (recortado em 256×256 no navegador, bucket `perfis`), a foto do Google ou as iniciais |
| Nome | sim | para quem escreve, **é a assinatura das matérias** — trocar aqui muda o nome em tudo que já publicou |
| E-mail | **não** | vem da conta Google; para trocar, entra com outra conta |
| Resumo / biografia | sim | até 320 caracteres; de autor aparece na página pública, de leitor fica interno |
| Formação / área de atuação | sim | "Jornalista de ciência", "Médica de família"; na empresa, o ramo |
| Redes sociais | sim | site, Instagram, YouTube, TikTok, Doctoralia e e-mail, todas opcionais; viram ícones na página |
| CRM e UF | só autor médico, no primeiro login | confirmados uma vez; depois, só o admin troca |
| Especialidade e RQE | só autor médico | especialidade preenchida exige RQE (Resolução CFM 2.336/2023) |

A "Redação Pulso" é um perfil coletivo: quem usa a conta de admin aparece nos comentários com
o próprio nome, não como a Redação. Autores comentam com o nome de assinatura e o comentário
leva link para a página de autor.

## Perfis de redação

A "Redação Pulso" não é uma pessoa: é um perfil coletivo, sem login, que o agente assina. Quem
edita é o admin (**blog.pulsocientifico@gmail.com**), em Painel → Acessos → *Perfis da redação*:
foto, nome que assina, texto de quem é e redes.

Dá para ter **mais de um perfil de redação** — por exemplo, um por área, quando o agente crescer —
mas só um é a **principal**: é com ela que o agente assina quando não pede outra
(`autores.agente_padrao`, com índice único no banco). Para assinar com outra, o agente manda
`"assinatura": "<slug>"` em `publicar-materia`.

Um perfil de redação não pode ser apagado se for o principal ou se já assina matéria publicada.

## Perfis de empresa: dois tipos

Empresas usam o mesmo perfil do autor — logo no lugar da foto, nome, ramo, descrição e as mesmas
redes — mas em dois sabores, e a diferença aparece na matéria:

| | **Organização parceira** | **Empresa de publicidade** |
|---|---|---|
| Papel | `parceiro` | `parceiro_publicidade` |
| Quem é | blog, grupo de pesquisa, instituto, veículo | agência, anunciante, marca |
| O que publica | conteúdo editorial próprio, sem contrapartida comercial | conteúdo comercial |
| Etiqueta na matéria | **Parceria editorial** | **Publicidade** |
| Aviso no fim | "produzido por X, organização parceira, sem contrapartida comercial" | "conteúdo comercial; a redação não participou da apuração nem da escrita" |
| Escreve em Saúde | não | não |

As duas ganham página pública e entram na lista `/parceiros`, em grupos separados, com link no
rodapé. A marcação vem do tipo do perfil: é automática, não depende de alguém lembrar.

## Primeiro login de quem escreve

Quem recebe papel de autor cai em **Complete o seu cadastro** antes do painel, com os campos do
próprio papel:

| | `autor` | `autor_medico` |
|---|---|---|
| Foto, nome de assinatura, minibiografia (≥ 80 caracteres), formação | obrigatório | obrigatório |
| CRM + UF | — | obrigatório, vai para conferência |
| Especialidade | — | opcional; se preenchida, exige RQE |
| Aceite das regras | obrigatório | obrigatório, citando a Resolução CFM 2.336/2023 |

Não dá para pular: o gatilho da matéria recusa criar texto com `cadastro_completo_em` vazio, e a
função `completar_cadastro` valida campo por campo no banco, não só na tela. Depois, tudo continua
editável em Minha conta — menos CRM e UF, que voltam para conferência a cada troca.

## Curtir, salvar, seguir

- **Curtir** e **salvar** ficam na barra abaixo do texto da matéria. Sem login, o clique leva
  para a tela de entrada.
- **Seguir autor** fica na página do autor, ao lado do número de seguidores.
- **Seguir categoria** fica no cabeçalho de qualquer nível (categoria, subcategoria ou
  microcategoria).
- Contadores: `materias.curtidas_qtd` e `materias.comentarios_qtd`, atualizados por gatilho —
  dá para ordenar "mais curtidas" sem varrer as tabelas.

Seguir ainda não dispara e-mail. Quando houver newsletter ou notificação, a base já está pronta
(`seguindo_autor`, `seguindo_categoria`).

## Comentários

- Um nível de resposta (comentário → resposta), até 1500 caracteres, texto puro (nada de HTML).
- Cada pessoa edita o próprio comentário por 15 minutos e pode apagar quando quiser.
- Denúncia: um clique por pessoa; a contagem aparece na moderação.
- Limite de 5 comentários por conta a cada 10 minutos, no banco.

### Moderação (Painel → Comentários)

Três ajustes, em `comunidade_config`:

| Ajuste | Padrão | O que faz |
|---|---|---|
| Comentários no site | ligados | desligado, some a seção; curtir e salvar continuam |
| Quando o comentário aparece | **depois que você aprovar** | a outra opção publica na hora e você revisa depois |
| Palavras que seguram o comentário | — | qualquer uma delas manda para análise, mesmo no modo "na hora" |

Comentário de quem é da equipe vai ao ar direto. As ações da tela são **Aprovar**, **Recusar**
e **Bloquear leitor** (a conta continua lendo, mas não comenta mais).

Pelo terminal, o mesmo: `pulso.mjs moderar`, `aprovar`, `recusar`, `bloquear`, `comunidade`.

### Por que a moderação prévia é o padrão

Metade do site é saúde. Comentário é o lugar clássico de "tomei tal remédio e curou" e de
propaganda de clínica — os dois criam problema com o Google e com o CFM, e a responsabilidade é
de quem hospeda. Começar aprovando antes custa pouco enquanto o volume é baixo; se crescer,
troque para publicação na hora com a lista de palavras ligada.

## O que o leitor precisa saber (LGPD)

A Política de privacidade descreve: nome, e-mail e foto vindos do Google, o que a pessoa curte,
salva, segue e comenta, por quanto tempo fica e como apagar a conta. Apagar a conta remove
perfil, curtidas, salvos e comentários; matérias assinadas continuam no ar, porque são acervo
jornalístico.

## Quem pode virar autor

Entrar com o Google dá **só** o papel de leitor. Autor, autor médico, editor e admin vivem em
`user_roles`, e a única regra de escrita dessa tabela exige que quem está gravando já seja admin —
a função `autorizar_email`, usada pelo painel, ainda recusa o papel de admin. Leitor também não
consegue criar linha em `autores`. O caminho para escrever é sempre o mesmo: o admin libera o
Gmail antes.

**Saúde é área de autor médico.** O papel `autor` escreve em Tecnologia, IA, Espaço, Clima e
Natureza sem precisar de registro nenhum; `autor_medico` escreve nessas e também em Saúde, depois
de confirmar o CRM. O banco recusa `editoria = 'saude'` para perfil que não seja médico ou a
Redação — e recusa enviar para revisão enquanto o CRM não estiver confirmado.

Três detalhes que sustentam isso e não podem ser afrouxados:

- o gatilho `novo_usuario` só aplica autorização prévia para conta **Google com e-mail confirmado**
  (senão bastaria se cadastrar por e-mail/senha com o endereço de alguém já autorizado);
- o gatilho `autores_protegido` impede que quem escreve mude `slug`, `tipo`, `ativo` ou o dono do
  perfil — sem ele, um autor se declararia médico e publicaria com CRM inventado;
- `storage.objects` precisa das políticas por bucket: sem elas, qualquer conta logada troca a capa
  de uma matéria ou a foto de outro leitor.

O checklist completo está em `docs/BANCO.md`, seção "Checklist de segurança".

## Estrutura no banco

Tabelas, gatilhos e regras de acesso estão em `docs/BANCO.md`, seção
"Comunidade: leitores, curtidas, salvos, seguidores e comentários".
