-- Pulso Científico — conteúdo inicial: 99 categorias em 3 níveis, o perfil Redação Pulso,
-- as 5 matérias de estreia e as 5 páginas institucionais.
-- As capas das 5 matérias estão no próprio site, em public/capas/ (endereço /capas/<slug>.jpg).
-- Pode rodar de novo sem duplicar nada (on conflict ... do update).



insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('saude', 'Saúde', 'Pesquisas sobre doenças, tratamentos, alimentação e saúde mental, explicadas com os resultados e as limitações de cada estudo.', '#0E9F6E', null, 1, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('doencas', 'Doenças', 'O que a ciência descobre sobre as doenças que mais afetam a vida das pessoas.', null, 'saude', 2, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('coracao-e-circulacao', 'Coração e circulação', 'Pressão alta, colesterol, infarto, AVC e outras doenças cardiovasculares.', null, 'doencas', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('figado', 'Fígado', 'Gordura no fígado, hepatites, cirrose e outras doenças do fígado.', null, 'doencas', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('rins', 'Rins', 'Doença renal crônica, pedras nos rins e outras condições dos rins.', null, 'doencas', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('diabetes-e-metabolismo', 'Diabetes e metabolismo', 'Diabetes, pré-diabetes, tireoide e outras alterações do metabolismo.', null, 'doencas', 3, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('cancer', 'Câncer', 'Prevenção, diagnóstico e tratamento dos diferentes tipos de câncer.', null, 'doencas', 3, 5, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('infecciosas', 'Infecciosas', 'Dengue, gripe, covid e outras doenças causadas por vírus, bactérias e parasitas.', null, 'doencas', 3, 6, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('respiratorias', 'Respiratórias', 'Asma, DPOC, pneumonia e outras doenças dos pulmões e das vias aéreas.', null, 'doencas', 3, 7, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('cerebro-e-sistema-nervoso', 'Cérebro e sistema nervoso', 'Alzheimer, Parkinson, enxaqueca, epilepsia e outras condições neurológicas.', null, 'doencas', 3, 8, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('ossos-musculos-e-coluna', 'Ossos, músculos e coluna', 'Dor nas costas, artrose, osteoporose e lesões.', null, 'doencas', 3, 9, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('pele', 'Pele', 'Dermatite, psoríase, câncer de pele e outras condições da pele.', null, 'doencas', 3, 10, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('nutricao', 'Nutrição', 'O que a ciência diz sobre alimentação, peso e os hábitos que fazem diferença na saúde.', null, 'saude', 2, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('alimentacao', 'Alimentação', 'Dietas, grupos de alimentos e o que se come no dia a dia.', null, 'nutricao', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('peso-e-obesidade', 'Peso e obesidade', 'Controle de peso, obesidade e seus tratamentos.', null, 'nutricao', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('vitaminas-e-suplementos', 'Vitaminas e suplementos', 'O que os estudos mostram sobre vitaminas, minerais e suplementos.', null, 'nutricao', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('habitos-e-estilo-de-vida', 'Hábitos e estilo de vida', 'Atividade física, rotina e mudanças de hábito que influenciam a saúde.', null, 'nutricao', 3, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('saude-mental', 'Saúde mental', 'Pesquisas sobre emoções, comportamento, sono e os tratamentos que cuidam da mente.', null, 'saude', 2, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('ansiedade-e-depressao', 'Ansiedade e depressão', 'Sintomas, fatores de risco e tratamentos para ansiedade e depressão.', null, 'saude-mental', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('sono', 'Sono', 'Insônia, qualidade do sono e como ele afeta a saúde.', null, 'saude-mental', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('dependencias', 'Dependências', 'Álcool, tabaco, outras drogas e dependências comportamentais, como jogos.', null, 'saude-mental', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('terapias-psicologicas', 'Terapias psicológicas', 'Terapia cognitivo-comportamental e outras abordagens estudadas pela ciência.', null, 'saude-mental', 3, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('medicamentos-e-vacinas', 'Medicamentos e vacinas', 'Remédios, vacinas e novos tratamentos testados em pesquisas.', null, 'saude', 2, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('novos-tratamentos', 'Novos tratamentos', 'Medicamentos e terapias em teste ou recém-aprovados.', null, 'medicamentos-e-vacinas', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('vacinas', 'Vacinas', 'Pesquisas sobre eficácia, segurança e novas vacinas.', null, 'medicamentos-e-vacinas', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('cannabis', 'Cannabis', 'Estudos sobre cannabis, canabinoides e seus efeitos.', null, 'medicamentos-e-vacinas', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('uso-seguro-de-remedios', 'Uso seguro de remédios', 'Efeitos colaterais, interações e automedicação.', null, 'medicamentos-e-vacinas', 3, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('saude-da-mulher', 'Saúde da mulher', 'Pesquisas sobre gravidez, menopausa e condições que afetam principalmente as mulheres.', null, 'saude', 2, 5, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('gravidez-e-parto', 'Gravidez e parto', 'Gestação, parto e pós-parto.', null, 'saude-da-mulher', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('menopausa', 'Menopausa', 'Sintomas, tratamentos e saúde depois da menopausa.', null, 'saude-da-mulher', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('contracepcao', 'Contracepção', 'Métodos contraceptivos e o que as pesquisas mostram sobre eles.', null, 'saude-da-mulher', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('saude-infantil', 'Saúde infantil', 'Estudos sobre o desenvolvimento e a saúde de bebês, crianças e adolescentes.', null, 'saude', 2, 6, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('bebes', 'Bebês', 'Primeiro ano de vida, amamentação e desenvolvimento.', null, 'saude-infantil', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('criancas', 'Crianças', 'Crescimento, doenças comuns e hábitos na infância.', null, 'saude-infantil', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('adolescentes', 'Adolescentes', 'Saúde física e mental na adolescência.', null, 'saude-infantil', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('inteligencia-artificial', 'Inteligência Artificial', 'Pesquisas e avanços em inteligência artificial, das novas técnicas ao impacto na saúde, no trabalho e na sociedade.', '#4338CA', null, 1, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('modelos-e-pesquisa', 'Modelos e pesquisa', 'Como os sistemas de inteligência artificial funcionam e o que as pesquisas mais recentes mostram.', null, 'inteligencia-artificial', 2, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('modelos-de-linguagem', 'Modelos de linguagem', 'Assistentes de texto e os modelos que os fazem funcionar.', null, 'modelos-e-pesquisa', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('visao-computacional', 'Visão computacional', 'Sistemas que reconhecem e interpretam imagens e vídeos.', null, 'modelos-e-pesquisa', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('robotica', 'Robótica', 'Robôs que aprendem, se movem e interagem com o ambiente.', null, 'modelos-e-pesquisa', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('ia-na-saude', 'IA na saúde', 'Como a inteligência artificial está sendo testada em diagnósticos, tratamentos e pesquisa médica.', null, 'inteligencia-artificial', 2, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('diagnostico-com-ia', 'Diagnóstico', 'Uso de IA para ler exames e identificar doenças.', null, 'ia-na-saude', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('descoberta-de-medicamentos', 'Descoberta de medicamentos', 'IA na criação e no teste de novos remédios.', null, 'ia-na-saude', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('ia-no-dia-a-dia', 'IA no dia a dia', 'Ferramentas de inteligência artificial e seus efeitos na rotina, no trabalho e na educação.', null, 'inteligencia-artificial', 2, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('ferramentas-e-aplicativos', 'Ferramentas e aplicativos', 'Aplicativos e serviços com IA que chegam ao público.', null, 'ia-no-dia-a-dia', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('trabalho-e-educacao', 'Trabalho e educação', 'Pesquisas sobre o efeito da IA no emprego, no estudo e no ensino.', null, 'ia-no-dia-a-dia', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('etica-e-regulacao', 'Ética e regulação', 'Leis, riscos e debates sobre o uso responsável da inteligência artificial.', null, 'inteligencia-artificial', 2, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('leis-e-regulacao', 'Leis e regulação', 'Regras para o uso de IA no Brasil e no mundo.', null, 'etica-e-regulacao', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('privacidade-e-dados', 'Privacidade e dados', 'Como os sistemas de IA usam e protegem dados pessoais.', null, 'etica-e-regulacao', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('vieses-e-seguranca', 'Vieses e segurança', 'Erros, preconceitos e riscos estudados em sistemas de IA.', null, 'etica-e-regulacao', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('tecnologia', 'Tecnologia', 'Descobertas e inovações em computação, energia, biotecnologia e transporte.', '#1D64D8', null, 1, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('computacao', 'Computação', 'Pesquisas sobre computadores, chips e segurança digital.', null, 'tecnologia', 2, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('computacao-quantica', 'Computação quântica', 'Computadores que usam as leis da física quântica.', null, 'computacao', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('chips-e-semicondutores', 'Chips e semicondutores', 'Novos processadores, materiais e formas de fabricar chips.', null, 'computacao', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('seguranca-digital', 'Segurança digital', 'Ataques, falhas e proteção de sistemas e dados.', null, 'computacao', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('energia', 'Energia', 'Novas formas de gerar, guardar e economizar energia.', null, 'tecnologia', 2, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('baterias', 'Baterias', 'Baterias mais duráveis, seguras e baratas.', null, 'energia', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('energia-solar-e-eolica', 'Energia solar e eólica', 'Pesquisas sobre fontes renováveis.', null, 'energia', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('fusao-nuclear', 'Fusão nuclear', 'A busca por energia a partir da fusão de átomos.', null, 'energia', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('biotecnologia', 'Biotecnologia', 'Tecnologias que usam a biologia para criar tratamentos, materiais e alimentos.', null, 'tecnologia', 2, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('edicao-genetica', 'Edição genética', 'CRISPR e outras técnicas para alterar o DNA.', null, 'biotecnologia', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('terapias-celulares', 'Terapias celulares', 'Tratamentos feitos com células vivas.', null, 'biotecnologia', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('transporte', 'Transporte', 'Pesquisas sobre veículos, aviação e mobilidade.', null, 'tecnologia', 2, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('carros-eletricos', 'Carros elétricos', 'Veículos elétricos, autonomia e recarga.', null, 'transporte', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('aviacao', 'Aviação', 'Aviões mais eficientes e novos combustíveis.', null, 'transporte', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('espaco', 'Espaço', 'Descobertas sobre planetas, estrelas e o universo, e as missões que exploram o espaço.', '#1E3A8A', null, 1, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('astronomia', 'Astronomia', 'O que os telescópios e as pesquisas revelam sobre o universo.', null, 'espaco', 2, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('planetas-e-exoplanetas', 'Planetas e exoplanetas', 'Planetas do Sistema Solar e de outras estrelas.', null, 'astronomia', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('estrelas-e-galaxias', 'Estrelas e galáxias', 'Como estrelas e galáxias nascem, vivem e morrem.', null, 'astronomia', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('buracos-negros', 'Buracos negros', 'Observações e teorias sobre buracos negros.', null, 'astronomia', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('exploracao-espacial', 'Exploração espacial', 'Missões, foguetes e satélites que levam a ciência para fora da Terra.', null, 'espaco', 2, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('missoes', 'Missões', 'Sondas, telescópios espaciais e viagens tripuladas.', null, 'exploracao-espacial', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('lua-e-marte', 'Lua e Marte', 'Pesquisa e exploração da Lua e de Marte.', null, 'exploracao-espacial', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('satelites', 'Satélites', 'Satélites de observação, comunicação e o lixo espacial.', null, 'exploracao-espacial', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('fisica-e-cosmologia', 'Física e cosmologia', 'As leis que explicam o universo, das partículas à origem de tudo.', null, 'espaco', 2, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('origem-do-universo', 'Origem do universo', 'Big Bang, matéria escura e energia escura.', null, 'fisica-e-cosmologia', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('particulas', 'Partículas', 'Os menores componentes da matéria e os experimentos que os estudam.', null, 'fisica-e-cosmologia', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('clima-e-meio-ambiente', 'Clima e Meio Ambiente', 'Pesquisas sobre mudanças climáticas, oceanos, poluição e a conservação da natureza.', '#12806A', null, 1, 5, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('mudancas-climaticas', 'Mudanças climáticas', 'Aquecimento global, seus efeitos e as formas de enfrentá-lo.', null, 'clima-e-meio-ambiente', 2, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('aquecimento-global', 'Aquecimento global', 'Temperatura, gases de efeito estufa e projeções.', null, 'mudancas-climaticas', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('eventos-extremos', 'Eventos extremos', 'Secas, enchentes, ondas de calor e tempestades.', null, 'mudancas-climaticas', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('oceanos', 'Oceanos', 'A vida marinha, as correntes e as mudanças nos oceanos.', null, 'clima-e-meio-ambiente', 2, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('poluicao', 'Poluição', 'Os efeitos da poluição no ambiente e na saúde.', null, 'clima-e-meio-ambiente', 2, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('plasticos', 'Plásticos', 'Microplásticos e o lixo plástico no ambiente e no corpo.', null, 'poluicao', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('qualidade-do-ar', 'Qualidade do ar', 'Poluição do ar nas cidades e seus efeitos.', null, 'poluicao', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('florestas-e-biodiversidade', 'Florestas e biodiversidade', 'Desmatamento, conservação e a diversidade da vida.', null, 'clima-e-meio-ambiente', 2, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('amazonia', 'Amazônia', 'Pesquisas sobre a floresta amazônica.', null, 'florestas-e-biodiversidade', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('especies-ameacadas', 'Espécies ameaçadas', 'Animais e plantas em risco de extinção.', null, 'florestas-e-biodiversidade', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('natureza', 'Natureza', 'Descobertas sobre animais, plantas, genética e a evolução da vida na Terra.', '#0B83A8', null, 1, 6, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('animais', 'Animais', 'Comportamento, espécies novas e curiosidades do mundo animal.', null, 'natureza', 2, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('mamiferos', 'Mamíferos', 'Pesquisas sobre mamíferos, dos morcegos às baleias.', null, 'animais', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('aves', 'Aves', 'Comportamento, migração e evolução das aves.', null, 'animais', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('insetos', 'Insetos', 'Abelhas, mosquitos e o papel dos insetos no ambiente.', null, 'animais', 3, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('vida-marinha', 'Vida marinha', 'Peixes, corais e outros seres do mar.', null, 'animais', 3, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('evolucao-e-fosseis', 'Evolução e fósseis', 'Como a vida mudou ao longo do tempo.', null, 'natureza', 2, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('dinossauros', 'Dinossauros', 'Fósseis e descobertas sobre os dinossauros.', null, 'evolucao-e-fosseis', 3, 1, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('origem-humana', 'Origem humana', 'A evolução dos seres humanos e de seus ancestrais.', null, 'evolucao-e-fosseis', 3, 2, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('plantas', 'Plantas', 'Pesquisas sobre plantas, fungos e a vida vegetal.', null, 'natureza', 2, 3, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;
insert into categorias (slug, nome, descricao, cor, pai, nivel, ordem, ativa)
values ('genetica', 'Genética', 'DNA, hereditariedade e o que os genes explicam sobre a vida.', null, 'natureza', 2, 4, true)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor,
  pai = excluded.pai, nivel = excluded.nivel, ordem = excluded.ordem, ativa = excluded.ativa;

insert into autores (slug, nome, tipo, bio, links, ativo, agente_padrao)
values ('redacao-pulso', 'Redação Pulso', 'redacao', 'Equipe editorial automatizada do Pulso Científico. As matérias são escritas com inteligência artificial a partir de pesquisas publicadas em revistas científicas e de comunicados oficiais de instituições de pesquisa, com os números conferidos no material original e link para a fonte.', '{}'::jsonb, true, true)
on conflict (slug) do update set nome = excluded.nome, tipo = excluded.tipo, bio = excluded.bio, links = excluded.links;

-- Anticorpo contra a dengue reduz vírus e febre em estudo inicial
insert into materias (autor_id, tipo, slug, editoria, subcategoria, microcategoria, titulo, linha_fina, corpo_html, seo,
  imagem_url, imagem_alt, imagem_credito, fonte, tempo_leitura, origem, status, publicada_em)
values (
  (select id from autores where slug = 'redacao-pulso'),
  'estudo', 'anticorpo-contra-a-dengue-reduz-virus-e-febre-em-estudo-inicial', 'saude', 'doencas', 'infecciosas', 'Anticorpo contra a dengue reduz vírus e febre em estudo inicial', 'Dose única de um anticorpo reduziu a quantidade de vírus no sangue em poucas horas, num teste com 250 adultos na Índia. O resultado ainda é de fase 2.',
  '<p>Quem já pegou dengue sabe como funciona: não existe remédio que ataque o vírus. O tratamento é beber muito líquido, descansar e controlar a febre enquanto o corpo resolve sozinho. Um estudo publicado em agosto na revista científica <em>JAMA Network Open</em> testou uma alternativa que pode mudar isso no futuro, e os primeiros números chamaram atenção.</p><h2>O que os pesquisadores testaram</h2><p>O medicamento se chama Dengue-mAb e é um anticorpo monoclonal. Na prática, funciona como um reforço pronto para o sistema de defesa: em vez de esperar o corpo fabricar os próprios anticorpos, a pessoa recebe na veia uma versão feita em laboratório, desenhada para reconhecer os quatro tipos do vírus da dengue.</p><p>Participaram 250 adultos atendidos em 12 hospitais da Índia entre 2021 e 2023. Todos tinham dengue e febre havia no máximo dois dias. Eles foram sorteados em cinco grupos de 50 pessoas: quatro receberam doses diferentes do anticorpo (3, 5, 7 ou 9 mg por quilo de peso) e um recebeu placebo.</p><h2>O que os resultados mostraram</h2><p>A primeira pergunta era sobre segurança, e nenhum participante teve efeito colateral grave causado pelo medicamento.</p><p>Em 24 horas, a quantidade de vírus no sangue caiu mais em todos os grupos que receberam o anticorpo do que no grupo placebo. A diferença ficou mais clara entre os 32 participantes que tinham vírus detectável logo no início:</p><div class="numero-destaque"><strong>8 h <span>/</span> 72 h</strong><p>Tempo até o vírus deixar de ser detectado no sangue: doses de 5 a 9 mg/kg do anticorpo contra placebo, entre os 32 participantes com vírus detectável no início.</p></div><p>A febre também foi embora antes. Com as doses de 5 e 7 mg/kg, o tempo mediano até a febre passar ficou entre 2 e 3,5 horas; no grupo placebo, passou de 26 horas. Depois de um dia, todos os 14 participantes avaliados em cada uma dessas doses estavam sem febre, contra 7 de 12 no placebo.</p><h2>Por que isso interessa ao Brasil</h2><p>O país convive com surtos de dengue quase todo ano. A prevenção conta com vacina e com o combate ao mosquito, mas quem adoece depende só de cuidados de suporte. Segundo os autores, este é o primeiro tratamento contra o vírus da dengue a mostrar sinal de eficácia em humanos. Se isso vai se traduzir em menos casos graves é uma pergunta que o estudo ainda não responde.</p><h2>O que o estudo ainda não diz</h2><p>Este é um estudo de fase 2, etapa que confere a segurança e dá as primeiras pistas de eficácia. Os grupos eram pequenos: na análise da febre, por exemplo, entraram de 12 a 17 pessoas por grupo. Pacientes com dengue grave ficaram de fora, justamente os que mais precisariam de um tratamento.</p><p>Também vale saber quem fez a pesquisa. O estudo foi conduzido pelo Serum Institute of India, e parte dos autores tem vínculo com a empresa ou com a Visterra, que desenvolveu o anticorpo. Isso não invalida os resultados, mas reforça a necessidade de estudos maiores e independentes antes de qualquer conclusão.</p><p>O anticorpo continua em fase de pesquisa. Com sintomas de dengue, o caminho segue o mesmo: procurar uma unidade de saúde e manter a hidratação.</p>',
  '{"palavra_chave":"dengue","tags":["dengue","anticorpo monoclonal","arboviroses","JAMA Network Open"]}'::jsonb,
  '/capas/anticorpo-contra-a-dengue-reduz-virus-e-febre-em-estudo-inicial.jpg',
  'Mosquito Aedes aegypti pousado sobre superfície clara', '{"fonte":"pexels","autor":"Ignacio Vazquez"}'::jsonb, '{"revista":"JAMA Network Open","titulo_original":"Safety and Preliminary Efficacy of Dengue Monoclonal Antibody in Adult Patients: A Randomized Clinical Trial","autores":"Kulkarni PS, Potey AV, Gupta SK, et al.","citacao":"JAMA Network Open, 3 de agosto de 2026; 9(8): e2629979","data":"2026-08-03","doi":"10.1001/jamanetworkopen.2026.29979","pmid":"42640641"}'::jsonb,
  3, 'painel', 'publicada', '2026-09-18T11:00:00Z'
)
on conflict (slug) do update set
  tipo = excluded.tipo, editoria = excluded.editoria, subcategoria = excluded.subcategoria, microcategoria = excluded.microcategoria, titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html,
  seo = excluded.seo, imagem_url = excluded.imagem_url, imagem_alt = excluded.imagem_alt, imagem_credito = excluded.imagem_credito,
  fonte = excluded.fonte, tempo_leitura = excluded.tempo_leitura, status = excluded.status,
  publicada_em = excluded.publicada_em, atualizada_em = now();

insert into pautas_processadas (id_externo, fonte, tipo, editoria, titulo, decisao, materia_id)
values ('pmid:42640641', 'pubmed-jama', 'estudo', 'saude', 'Safety and Preliminary Efficacy of Dengue Monoclonal Antibody in Adult Patients: A Randomized Clinical Trial', 'publicado',
        (select id from materias where slug = 'anticorpo-contra-a-dengue-reduz-virus-e-febre-em-estudo-inicial'))
on conflict (id_externo) do nothing;

-- Cinta lombar aliviou dor nas costas em teste com 168 pacientes
insert into materias (autor_id, tipo, slug, editoria, subcategoria, microcategoria, titulo, linha_fina, corpo_html, seo,
  imagem_url, imagem_alt, imagem_credito, fonte, tempo_leitura, origem, status, publicada_em)
values (
  (select id from autores where slug = 'redacao-pulso'),
  'estudo', 'cinta-lombar-aliviou-dor-nas-costas-em-teste-com-168-pacientes', 'saude', 'doencas', 'ossos-musculos-e-coluna', 'Cinta lombar aliviou dor nas costas em teste com 168 pacientes', 'Estudo francês com 168 pacientes: quem usou uma cinta elástica por 12 semanas teve menos dor e precisou de menos remédio do que quem não usou.',
  '<p>Dor nas costas é uma das queixas mais comuns nos consultórios e uma das principais causas de afastamento do trabalho no mundo. Na farmácia, a cinta lombar parece uma solução óbvia, mas as diretrizes médicas diziam até agora que faltava prova de que ela ajuda. Um estudo publicado em agosto na revista <em>JAMA Network Open</em> trouxe um dado novo para essa conversa.</p><h2>O que os pesquisadores testaram</h2><p>A equipe acompanhou 168 adultos com a chamada dor lombar inespecífica, aquela que não tem uma causa clara, como fratura ou infecção, e que já durava de 1 a 6 meses. A pesquisa aconteceu em 17 centros médicos da França, entre 2021 e 2024.</p><p>Os participantes foram sorteados em dois grupos. Um usou uma cinta lombar macia e elástica, sem partes rígidas, por 12 semanas, além do tratamento que já faria normalmente. O outro seguiu só o tratamento habitual.</p><h2>O que os resultados mostraram</h2><p>Para medir a melhora, os pesquisadores usaram um questionário que avalia o quanto a dor atrapalha tarefas como se vestir, carregar peso, andar, ficar sentado e dormir. A pontuação vai de 0 a 100, e quanto menor, melhor.</p><p>Depois de 12 semanas, o grupo da cinta melhorou 10 pontos, em média. O grupo sem cinta melhorou 5,3 pontos. A diferença entre os dois foi de 4,7 pontos a favor da cinta.</p><p>A dor também caiu mais entre quem usou a cinta, tanto em repouso quanto durante as atividades. E menos gente precisou de remédio:</p><div class="numero-destaque"><strong>50,6% <span>/</span> 67,6%</strong><p>Participantes que usaram remédio para dor ao longo das 12 semanas: grupo da cinta contra grupo sem cinta.</p></div><p>Nenhum participante teve efeito adverso grave ligado à cinta.</p><h2>Por que isso interessa a quem tem dor nas costas</h2><p>A cinta é barata, fácil de encontrar e não exige receita. Os autores concluem que ela pode ser considerada uma opção sem remédio para controlar os sintomas, somada ao tratamento habitual, e não no lugar dele.</p><h2>O que o estudo ainda não diz</h2><p>Os participantes sabiam em qual grupo estavam, porque não existe uma cinta de mentira para servir de placebo. Isso pode influenciar a forma como cada um avalia a própria dor. Também não dá para saber se o efeito continua depois que a pessoa para de usar a cinta, já que o acompanhamento terminou em 12 semanas.</p><p>A diferença entre os grupos existiu, mas foi moderada: 4,7 pontos numa escala de 100. Das 168 pessoas sorteadas, 155 entraram na análise principal. E o estudo valeu só para dor de 1 a 6 meses, sem causa identificada. Quem tem dor há mais tempo ou dor causada por outra doença não participou.</p><p>Sobre quem fez a pesquisa: três autores relataram ter recebido honorários da Thuasne, empresa francesa de produtos ortopédicos, por participar do comitê científico durante o estudo.</p><p>Dor nas costas que não melhora, que desce para a perna ou vem acompanhada de febre, perda de peso ou fraqueza precisa de avaliação médica. Antes de usar qualquer cinta, vale conversar com um médico ou fisioterapeuta.</p>',
  '{"palavra_chave":"dor nas costas","tags":["dor lombar","cinta lombar","dor nas costas","JAMA Network Open"]}'::jsonb,
  '/capas/cinta-lombar-aliviou-dor-nas-costas-em-teste-com-168-pacientes.jpg',
  'Pessoa com a mão apoiada na parte de baixo das costas', '{"fonte":"pexels","autor":"Kindel Media"}'::jsonb, '{"revista":"JAMA Network Open","titulo_original":"Lumbar Belt for Nonspecific Low Back Pain: A Randomized Clinical Trial","autores":"Grange L, Calmels P, Pers YM, et al.","citacao":"JAMA Network Open, 3 de agosto de 2026; 9(8): e2629793","data":"2026-08-03","doi":"10.1001/jamanetworkopen.2026.29793","pmid":"42616499"}'::jsonb,
  3, 'painel', 'publicada', '2026-09-17T13:30:00Z'
)
on conflict (slug) do update set
  tipo = excluded.tipo, editoria = excluded.editoria, subcategoria = excluded.subcategoria, microcategoria = excluded.microcategoria, titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html,
  seo = excluded.seo, imagem_url = excluded.imagem_url, imagem_alt = excluded.imagem_alt, imagem_credito = excluded.imagem_credito,
  fonte = excluded.fonte, tempo_leitura = excluded.tempo_leitura, status = excluded.status,
  publicada_em = excluded.publicada_em, atualizada_em = now();

insert into pautas_processadas (id_externo, fonte, tipo, editoria, titulo, decisao, materia_id)
values ('pmid:42616499', 'pubmed-jama', 'estudo', 'saude', 'Lumbar Belt for Nonspecific Low Back Pain: A Randomized Clinical Trial', 'publicado',
        (select id from materias where slug = 'cinta-lombar-aliviou-dor-nas-costas-em-teste-com-168-pacientes'))
on conflict (id_externo) do nothing;

-- Goma de cannabis piorou direção em simulador, mostra estudo
insert into materias (autor_id, tipo, slug, editoria, subcategoria, microcategoria, titulo, linha_fina, corpo_html, seo,
  imagem_url, imagem_alt, imagem_credito, fonte, tempo_leitura, origem, status, publicada_em)
values (
  (select id from autores where slug = 'redacao-pulso'),
  'estudo', 'goma-de-cannabis-piorou-direcao-em-simulador-mostra-estudo', 'saude', 'medicamentos-e-vacinas', 'cannabis', 'Goma de cannabis piorou direção em simulador, mostra estudo', 'No Canadá, 40 adultos dirigiram num simulador depois de comer gomas com THC. A direção piorou nas doses maiores, mesmo com pouco THC no sangue.',
  '<p>Gomas, chocolates e biscoitos com cannabis ficaram populares nos países onde o uso é permitido. Quando a cannabis é ingerida, o efeito costuma demorar mais para aparecer do que quando é fumada, o que pode confundir quem pretende dirigir. Um estudo canadense publicado em agosto na revista <em>JAMA Network Open</em> mediu o que acontece ao volante depois de comer essas gomas.</p><h2>O que os pesquisadores testaram</h2><p>Participaram 40 adultos de 19 a 45 anos, metade mulheres e metade homens. Todos já usavam cannabis pelo menos uma vez por semana e comiam produtos com cannabis pelo menos uma vez por mês.</p><p>Cada participante passou por quatro sessões. Em cada uma, comeu gomas com uma dose diferente de THC, a substância da cannabis que altera a percepção: 0 (placebo), 2, 10 ou 20 mg. Nem os participantes nem os pesquisadores sabiam qual dose tinha sido dada. Duas e cinco horas depois, cada um dirigiu num simulador.</p><h2>O que os resultados mostraram</h2><p>A principal medida foi o quanto o carro balança dentro da faixa, algo que costuma aumentar quando o motorista perde a atenção. Comparado ao placebo, o balanço aumentou 3,3 cm com a dose de 20 mg e 2 cm com a de 10 mg. Com 2 mg, a diferença foi pequena e pode ter sido obra do acaso.</p><p>Com 20 mg, o tempo de reação também ficou maior e a velocidade, mais irregular. Os próprios participantes perceberam: com a dose maior, disseram estar menos dispostos a dirigir e se avaliaram piores ao volante.</p><p>O dado que mais chamou a atenção dos autores veio do exame de sangue:</p><div class="numero-destaque"><strong>3,4 ng/mL</strong><p>Pico de THC no sangue com a dose de 20 mg. Mesmo assim, a direção piorou. Limites legais comuns em outros países são de 2 ou 5 ng/mL.</p></div><p>Vários países fiscalizam motoristas pela quantidade de THC no sangue, com limites comuns de 2 ou 5 ng/mL. No estudo, a direção piorou mesmo com o THC perto ou abaixo desses valores.</p><h2>Por que isso interessa ao Brasil</h2><p>No Brasil, dirigir sob influência de substância psicoativa é infração gravíssima e, com a capacidade alterada, pode ser crime. Além disso, produtos de cannabis para uso medicinal podem ser vendidos em farmácias com prescrição, e alguns contêm THC. O estudo reforça que a quantidade de THC no sangue, sozinha, não mostra se alguém está em condições de dirigir.</p><h2>O que o estudo ainda não diz</h2><p>O teste foi feito em simulador, não no trânsito real. Os 40 participantes eram jovens, saudáveis e acostumados à cannabis, então o efeito pode ser diferente em quem usa pouco, em pessoas mais velhas ou em quem toma outros remédios. O estudo também avaliou só gomas vendidas comercialmente, em doses de até 20 mg.</p><p>A pesquisa teve financiamento do governo do Canadá. Entre as declarações de conflito de interesse, há verbas recebidas de empresas do setor, incluindo uma produtora de cannabis, em outros trabalhos.</p><p>Quem usa qualquer produto com THC, inclusive por indicação médica, deve conversar com o médico sobre quando é seguro voltar a dirigir.</p>',
  '{"palavra_chave":"cannabis","tags":["cannabis","THC","trânsito","JAMA Network Open"]}'::jsonb,
  '/capas/goma-de-cannabis-piorou-direcao-em-simulador-mostra-estudo.jpg',
  'Vista de dentro de um carro à noite, com luzes da cidade desfocadas no para-brisa', '{"fonte":"pexels","autor":"Burak The Weekender"}'::jsonb, '{"revista":"JAMA Network Open","titulo_original":"Dose-Dependent Effects of Cannabis Edibles on Simulated Driving Performance: A Randomized Clinical Trial","autores":"Le Foll B, Matheson J, Antwi P, et al.","citacao":"JAMA Network Open, 3 de agosto de 2026; 9(8): e2631306","data":"2026-08-03","doi":"10.1001/jamanetworkopen.2026.31306","pmid":"42671837"}'::jsonb,
  3, 'painel', 'publicada', '2026-09-16T10:00:00Z'
)
on conflict (slug) do update set
  tipo = excluded.tipo, editoria = excluded.editoria, subcategoria = excluded.subcategoria, microcategoria = excluded.microcategoria, titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html,
  seo = excluded.seo, imagem_url = excluded.imagem_url, imagem_alt = excluded.imagem_alt, imagem_credito = excluded.imagem_credito,
  fonte = excluded.fonte, tempo_leitura = excluded.tempo_leitura, status = excluded.status,
  publicada_em = excluded.publicada_em, atualizada_em = now();

insert into pautas_processadas (id_externo, fonte, tipo, editoria, titulo, decisao, materia_id)
values ('pmid:42671837', 'pubmed-jama', 'estudo', 'saude', 'Dose-Dependent Effects of Cannabis Edibles on Simulated Driving Performance: A Randomized Clinical Trial', 'publicado',
        (select id from materias where slug = 'goma-de-cannabis-piorou-direcao-em-simulador-mostra-estudo'))
on conflict (id_externo) do nothing;

-- Pré-diabetes: mudança de hábitos ligada a menos doenças crônicas
insert into materias (autor_id, tipo, slug, editoria, subcategoria, microcategoria, titulo, linha_fina, corpo_html, seo,
  imagem_url, imagem_alt, imagem_credito, fonte, tempo_leitura, origem, status, publicada_em)
values (
  (select id from autores where slug = 'redacao-pulso'),
  'estudo', 'pre-diabetes-mudanca-de-habitos-ligada-a-menos-doencas-cronicas', 'saude', 'nutricao', 'habitos-e-estilo-de-vida', 'Pré-diabetes: mudança de hábitos ligada a menos doenças crônicas', 'Acompanhamento de 25 anos nos EUA: um programa de estilo de vida, e não a metformina, foi ligado a menor risco de acumular doenças crônicas.',
  '<p>Pré-diabetes é quando a glicose no sangue já está acima do normal, mas ainda não chegou ao nível do diabetes. É um alerta comum em exames de rotina. Um estudo publicado em agosto na revista <em>JAMA</em> olhou para o longo prazo: o que acontece, décadas depois, com quem recebeu ajuda para mudar hábitos nessa fase.</p><h2>O que os pesquisadores analisaram</h2><p>A pesquisa usou dados do Diabetes Prevention Program, um estudo americano sobre prevenção de diabetes. Entre 1996 e 1999, 3.234 adultos com alto risco de desenvolver a doença foram sorteados em três grupos: um programa intensivo de mudança de estilo de vida, com metas de alimentação, atividade física e peso; o remédio metformina; ou placebo.</p><p>Depois dessa fase, os participantes continuaram sendo acompanhados. O grupo da metformina seguiu com o remédio, o placebo foi suspenso e todos passaram a ter acesso a aulas sobre estilo de vida. Para este novo estudo, os pesquisadores cruzaram as informações de 1.173 participantes que autorizaram o uso dos dados do Medicare, o programa público de saúde dos Estados Unidos para pessoas mais velhas, até 2021.</p><p>O objetivo era contar doenças crônicas. A lista incluiu 15 condições comuns, e a pesquisa considerou multimorbidade quando a pessoa tinha duas ou mais delas.</p><h2>O que os resultados mostraram</h2><p>No fim do acompanhamento, a idade mediana dos participantes era de 74 anos, e a maioria convivia com várias doenças: 85% tinham duas ou mais, com mediana de 5 condições por pessoa. A diferença apareceu entre os grupos:</p><div class="numero-destaque"><strong>82% <span>/</span> 87%</strong><p>Participantes que chegaram a ter duas ou mais doenças crônicas até 2021: grupo do programa de estilo de vida contra grupo placebo. No grupo da metformina, foram 85%.</p></div><p>Levando em conta outras características dos participantes, quem fez o programa de estilo de vida teve risco menor de desenvolver multimorbidade do que o grupo placebo. Com a metformina, a diferença não foi significativa.</p><p>O resultado se manteve mesmo quando os pesquisadores tiraram o diabetes da conta. E ficou mais forte quando olharam só para os pares de doenças mais caros de tratar.</p><h2>Por que isso interessa ao Brasil</h2><p>O diabetes é comum no Brasil, e muita gente descobre a pré-diabetes num exame de rotina. O estudo sugere que mudar hábitos nessa fase pode trazer benefícios que vão além de evitar o diabetes e que aparecem décadas depois. Para quem recebe esse diagnóstico, o acompanhamento com um profissional de saúde é o caminho para definir o que muda na rotina.</p><h2>O que o estudo ainda não diz</h2><p>Esta análise é um acompanhamento observacional. O sorteio dos grupos aconteceu lá atrás, mas, com o passar dos anos, as pessoas mudaram de hábitos, de remédios e de vida de formas que o estudo não controla. Por isso, os resultados mostram uma associação, não uma prova de causa.</p><p>Só entraram 1.173 dos 3.234 participantes originais, os que autorizaram o uso dos dados. E todos eram americanos, com um perfil de saúde e de acesso a cuidados diferente do brasileiro.</p><p>Na declaração de conflitos de interesse, consta verba da empresa Amgen e honorários de consultoria da Universidade George Washington para um dos pesquisadores durante o estudo.</p>',
  '{"palavra_chave":"pré-diabetes","tags":["pré-diabetes","estilo de vida","metformina","JAMA"]}'::jsonb,
  '/capas/pre-diabetes-mudanca-de-habitos-ligada-a-menos-doencas-cronicas.jpg',
  'Mãos lavando legumes frescos na pia de uma cozinha', '{"fonte":"pexels","autor":"Gustavo Fring"}'::jsonb, '{"revista":"JAMA","titulo_original":"Lifestyle and Metformin Interventions and Risk of Multimorbidity in Adults With Prediabetes","autores":"Salive ME, Tjaden AH, Ames JR, et al.","citacao":"JAMA, 18 de agosto de 2026; 336(7): 577-586","data":"2026-08-18","doi":"10.1001/jama.2026.8492","pmid":"42295772"}'::jsonb,
  3, 'painel', 'publicada', '2026-09-15T10:00:00Z'
)
on conflict (slug) do update set
  tipo = excluded.tipo, editoria = excluded.editoria, subcategoria = excluded.subcategoria, microcategoria = excluded.microcategoria, titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html,
  seo = excluded.seo, imagem_url = excluded.imagem_url, imagem_alt = excluded.imagem_alt, imagem_credito = excluded.imagem_credito,
  fonte = excluded.fonte, tempo_leitura = excluded.tempo_leitura, status = excluded.status,
  publicada_em = excluded.publicada_em, atualizada_em = now();

insert into pautas_processadas (id_externo, fonte, tipo, editoria, titulo, decisao, materia_id)
values ('pmid:42295772', 'pubmed-jama', 'estudo', 'saude', 'Lifestyle and Metformin Interventions and Risk of Multimorbidity in Adults With Prediabetes', 'publicado',
        (select id from materias where slug = 'pre-diabetes-mudanca-de-habitos-ligada-a-menos-doencas-cronicas'))
on conflict (id_externo) do nothing;

-- Dor crônica: terapia guiada em casa foi melhor que com terapeuta
insert into materias (autor_id, tipo, slug, editoria, subcategoria, microcategoria, titulo, linha_fina, corpo_html, seo,
  imagem_url, imagem_alt, imagem_credito, fonte, tempo_leitura, origem, status, publicada_em)
values (
  (select id from autores where slug = 'redacao-pulso'),
  'estudo', 'dor-cronica-terapia-guiada-em-casa-foi-melhor-que-com-terapeuta', 'saude', 'saude-mental', 'terapias-psicologicas', 'Dor crônica: terapia guiada em casa foi melhor que com terapeuta', 'Estudo com 764 pacientes nos EUA: terapia cognitivo-comportamental feita em casa, com orientador, reduziu mais o impacto da dor do que a terapia comum.',
  '<p>Dor que dura meses ou anos muda a rotina: atrapalha o sono, o trabalho e o humor. A terapia cognitivo-comportamental, conhecida como TCC, é um dos tratamentos sem remédio recomendados como primeira opção nesses casos. Ela ensina a lidar com a dor no dia a dia, com técnicas para organizar atividades, relaxar e mudar pensamentos que aumentam o sofrimento. O problema é que pouca gente consegue fazer, por falta de profissionais, de horário ou pela distância.</p><p>Um estudo publicado em agosto na revista <em>JAMA</em> comparou uma versão feita por conta própria, em casa, com a terapia conduzida por um profissional.</p><h2>O que os pesquisadores testaram</h2><p>Participaram 764 pessoas com dor crônica em músculos, ossos ou articulações, atendidas em 9 redes do sistema de saúde para veteranos dos Estados Unidos. A idade média era de 52,8 anos, e 39% eram mulheres. Elas foram sorteadas em dois grupos.</p><p>No grupo da terapia por conta própria, cada pessoa seguiu um programa de 11 semanas. Todo dia, respondia por telefone a um sistema automático sobre a prática das técnicas, a atividade física e a dor. Com base nessas respostas, um orientador gravava toda semana um áudio com retorno personalizado.</p><p>No outro grupo, as pessoas fizeram a terapia com um profissional, de 4 a 11 sessões semanais, do jeito que já era oferecido na rotina dos serviços.</p><h2>O que os resultados mostraram</h2><p>A principal medida foi o quanto a dor atrapalha a vida em atividades como trabalhar, andar, dormir e se relacionar, numa escala de 0 a 10. Depois de 4 meses:</p><div class="numero-destaque"><strong>5,26 <span>/</span> 6,23</strong><p>Quanto a dor atrapalha a rotina, numa escala de 0 a 10, após 4 meses: terapia por conta própria contra terapia com profissional. Quanto menor, melhor.</p></div><p>A diferença foi de quase 1 ponto a favor da terapia por conta própria e continuou aparecendo aos 6 e aos 12 meses. Os autores consideram 1 ponto a menor diferença que faz sentido para o paciente, então a vantagem ficou perto desse limite.</p><p>O grupo que fez a terapia em casa também se saiu melhor em todas as outras medidas após 4 meses, como intensidade da dor, sono, sintomas de depressão e confiança para lidar com a dor. E completou mais sessões do programa do que o grupo com profissional.</p><h2>Por que isso interessa ao Brasil</h2><p>Nem sempre é fácil encontrar um psicólogo com experiência em dor crônica perto de casa ou em horário compatível com o trabalho. Um formato que depende menos de consultas pode ajudar a levar esse tipo de tratamento a mais gente. Os autores descrevem a versão por conta própria como uma alternativa que pode ampliar o uso da TCC.</p><h2>O que o estudo ainda não diz</h2><p>A vantagem foi modesta, nas palavras dos próprios autores. Os participantes sabiam qual terapia estavam fazendo, o que pode influenciar as respostas. E nem todos fizeram as avaliações: 76% responderam aos 4 meses e 68% aos 12 meses.</p><p>O estudo foi feito com veteranos americanos, dentro de um sistema de saúde específico. O programa também não é um aplicativo que se baixa na loja: ele dependia do sistema de acompanhamento por telefone e dos orientadores. As verbas declaradas pelos autores vêm de universidade, de órgãos públicos e de fundações.</p><p>Quem convive com dor crônica pode conversar com o médico ou psicólogo sobre a TCC e sobre os formatos disponíveis.</p>',
  '{"palavra_chave":"dor crônica","tags":["dor crônica","terapia cognitivo-comportamental","saúde mental","JAMA"]}'::jsonb,
  '/capas/dor-cronica-terapia-guiada-em-casa-foi-melhor-que-com-terapeuta.jpg',
  'Sala de atendimento com sofá e prancheta com anotações sobre a mesa', '{"fonte":"pexels","autor":"Alex Green"}'::jsonb, '{"revista":"JAMA","titulo_original":"Self-Directed vs Clinician-Delivered Cognitive Behavioral Therapy for Chronic Pain: A Randomized Clinical Trial","autores":"Heapy AA, Driscoll MA, Edmond S, et al.","citacao":"JAMA, 4 de agosto de 2026; 336(5): 400-412","data":"2026-08-04","doi":"10.1001/jama.2026.7861","pmid":"42340733"}'::jsonb,
  3, 'painel', 'publicada', '2026-09-14T10:00:00Z'
)
on conflict (slug) do update set
  tipo = excluded.tipo, editoria = excluded.editoria, subcategoria = excluded.subcategoria, microcategoria = excluded.microcategoria, titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html,
  seo = excluded.seo, imagem_url = excluded.imagem_url, imagem_alt = excluded.imagem_alt, imagem_credito = excluded.imagem_credito,
  fonte = excluded.fonte, tempo_leitura = excluded.tempo_leitura, status = excluded.status,
  publicada_em = excluded.publicada_em, atualizada_em = now();

insert into pautas_processadas (id_externo, fonte, tipo, editoria, titulo, decisao, materia_id)
values ('pmid:42340733', 'pubmed-jama', 'estudo', 'saude', 'Self-Directed vs Clinician-Delivered Cognitive Behavioral Therapy for Chronic Pain: A Randomized Clinical Trial', 'publicado',
        (select id from materias where slug = 'dor-cronica-terapia-guiada-em-casa-foi-melhor-que-com-terapeuta'))
on conflict (id_externo) do nothing;

-- Página: Política editorial
insert into paginas (slug, titulo, linha_fina, corpo_html, atualizada_em)
values ('politica-editorial', 'Política editorial', 'Como o Pulso Científico escolhe, escreve, confere e corrige o que publica, e onde a inteligência artificial entra nesse processo.', '<h2>O que é o Pulso Científico</h2><p>O Pulso Científico traduz para a linguagem do dia a dia pesquisas científicas recém-publicadas: saúde, inteligência artificial, tecnologia, espaço, clima e meio ambiente e natureza. Boa parte desses trabalhos nunca chega ao público brasileiro, ou chega em inglês e com termos técnicos que dificultam a leitura. Nosso trabalho é tornar esse conteúdo acessível sem mudar o que os pesquisadores encontraram.</p><p>O site é jornalístico e informativo. Nenhuma matéria substitui consulta, diagnóstico ou tratamento com profissional de saúde, nem serve como recomendação técnica, financeira ou de compra.</p><h2>Usamos inteligência artificial, e dizemos isso abertamente</h2><p>As matérias assinadas pela <strong>Redação Pulso</strong> são produzidas por um sistema automatizado que usa inteligência artificial. Não escondemos isso do leitor. Esse sistema trabalha dentro de regras editoriais fixas, descritas nesta página, e cada matéria passa por conferências antes de ser publicada.</p><p class="texto-grande">A inteligência artificial não cria a informação: ela parte sempre de uma fonte primária — o artigo científico, o preprint ou o comunicado oficial da instituição de pesquisa — e reescreve em português o que está nesse material.</p><p>Toda matéria mostra a fonte com link. Quando o trabalho tem DOI, o código permanente do artigo, ele aparece no fim do texto; em estudos indexados no PubMed, o número de registro também.</p><h2>De onde vêm as pesquisas</h2><p>Uma fonte só é aceita se for primária e verificável. Por área, as principais são:</p><ul><li><strong>Saúde:</strong> <em>JAMA</em>, <em>JAMA Network Open</em> e outras revistas com revisão por pares, localizadas pelo <strong>PubMed</strong>, a base de dados da Biblioteca Nacional de Medicina dos Estados Unidos.</li><li><strong>Inteligência artificial e tecnologia:</strong> artigos de conferências e revistas da área, preprints do <strong>arXiv</strong> e documentação técnica publicada pelos próprios laboratórios de pesquisa.</li><li><strong>Espaço:</strong> comunicados e dados de agências como <strong>NASA</strong> e <strong>ESA</strong>, além de revistas de astronomia.</li><li><strong>Clima, meio ambiente e natureza:</strong> revistas científicas como <em>Nature</em> e <em>Science</em>, relatórios de instituições de pesquisa e dados de órgãos oficiais, brasileiros e estrangeiros.</li></ul><p>Damos preferência a:</p><ul><li>trabalhos com revisão por pares, e, na saúde, a ensaios clínicos randomizados e meta-análises, os tipos de estudo que costumam oferecer as evidências mais confiáveis;</li><li>pesquisas publicadas nos últimos dias;</li><li>temas que interessam a quem vive no Brasil.</li></ul><p><strong>Preprints</strong> são estudos divulgados antes da revisão por pares. Eles podem ser noticiados quando o assunto justifica, mas a matéria diz isso com todas as letras e explica que os resultados ainda podem mudar. Na saúde, preprint não vira matéria.</p><p>O Pulso Científico não tem vínculo com nenhuma dessas revistas, agências ou instituições.</p><h2>Como uma matéria é feita</h2><ol><li><strong>Coleta.</strong> Todos os dias, o sistema busca as publicações novas dessas fontes.</li><li><strong>Escolha.</strong> Cada trabalho recebe uma avaliação de interesse para o leitor brasileiro, e um é escolhido por dia.</li><li><strong>Redação.</strong> A inteligência artificial escreve uma matéria nova, em português simples, a partir do material original. Não é tradução literal: explicamos termos técnicos, damos contexto e organizamos a informação para quem nunca leu um artigo científico.</li><li><strong>Conferência.</strong> Uma segunda etapa automática compara cada número citado na matéria com a fonte e procura promessas de resultado ou exageros. Se algo não confere, a matéria não é publicada.</li><li><strong>Publicação.</strong> A matéria sai com link para o material original.</li></ol><h2>O que toda matéria precisa ter</h2><ul><li>O tipo de trabalho e o seu tamanho: quantas pessoas participaram, quanto tempo durou, que dados foram usados.</li><li>Os resultados com a comparação correta, dizendo sempre em relação a quê.</li><li>Uma seção sobre o que a pesquisa <strong>ainda não diz</strong>: limitações, o que ficou de fora e se o resultado mostra causa ou apenas associação.</li><li>Quem financiou o trabalho e os conflitos de interesse declarados pelos autores, quando existirem.</li><li>O link para a fonte original.</li></ul><h2>Regras extras para saúde</h2><p>Informação de saúde pode mudar a decisão de alguém sobre o próprio tratamento, então a régua é mais alta:</p><ul><li>só entram trabalhos já publicados com revisão por pares;</li><li>a matéria sempre diz o tipo e o tamanho do estudo e em que fase a pesquisa está;</li><li>nunca sugerimos começar, parar ou trocar um tratamento;</li><li>resultados em animais ou em laboratório são apresentados como tais, sem sugerir efeito em pessoas.</li></ul><h2>O que não fazemos</h2><ul><li>Prometer cura ou garantir resultado.</li><li>Usar termos sensacionalistas, como “milagre”, “revolucionário” ou “o melhor tratamento”.</li><li>Recomendar que alguém comece, pare ou troque um tratamento.</li><li>Informar preço ou onde comprar medicamentos.</li><li>Dar recomendação de investimento, de compra de produtos ou de adoção de tecnologia.</li><li>Reproduzir figuras, tabelas ou trechos dos artigos científicos. Os fatos de uma pesquisa podem ser noticiados; o texto e as imagens dos artigos pertencem às revistas.</li><li>Inventar dados, estatísticas brasileiras ou falas de pesquisadores.</li></ul><h2>Revisão</h2><p>As matérias da Redação Pulso <strong>não passam por revisão de especialista</strong>. Elas relatam o que os autores de cada trabalho publicaram, com as conferências automáticas descritas acima, e podem passar pela leitura da equipe do projeto antes de ir ao ar. Sempre que o assunto envolve uma decisão de saúde, a orientação é procurar um profissional.</p><h2>Autores convidados</h2><p>Além da Redação Pulso, o site publica artigos de especialistas convidados: médicos, pesquisadores e profissionais das áreas que cobrimos. O acesso de cada autor é liberado individualmente pela administração, e toda matéria fica ligada ao perfil de quem a escreveu. Não é possível publicar em nome de outra pessoa.</p><p>Todo autor aparece identificado com nome, formação e área de atuação, e responde pelo que assina. Artigos assinados passam pela revisão editorial do Pulso Científico antes da publicação. As opiniões expressas neles são de responsabilidade de seus autores.</p><h3>Autores médicos e a Resolução CFM nº 2.336/2023</h3><p>A Resolução nº 2.336/2023 do Conselho Federal de Medicina regula a publicidade e a comunicação dos médicos, inclusive em sites e redes sociais. Seguindo essa norma:</p><ul><li>todo médico aparece identificado com nome, número do CRM e estado;</li><li>quando a especialidade é informada, aparece também o número do RQE, o Registro de Qualificação de Especialista;</li><li>os textos não prometem resultados e não usam sensacionalismo;</li><li>o conteúdo tem caráter educativo e informativo.</li></ul><h2>Imagens</h2><p>As capas vêm de bancos de imagens gratuitos, como Pexels, Pixabay e Unsplash, sempre com crédito ao fotógrafo, ou são enviadas pelos próprios autores com direito de uso. São imagens ilustrativas: não mostram os participantes dos estudos, pacientes identificáveis nem os equipamentos e resultados reais das pesquisas.</p><h2>Publicidade</h2><p>O site é mantido por anúncios, incluindo o Google AdSense. Todo anúncio é identificado com a palavra “Publicidade” e fica separado do conteúdo editorial. Anunciantes não escolhem, não revisam e não influenciam as matérias. Anúncios de profissionais e serviços de saúde também precisam seguir as normas de seus conselhos profissionais.</p><h2>Comentários</h2><p>O site tem comentários abertos a quem entra com a conta Google. Eles são espaço do leitor, não extensão da matéria: não valem como orientação de saúde e não passam a fazer parte do que apuramos.</p><p>Por padrão, todo comentário é lido pela equipe antes de aparecer. Recusamos os que dão indicação de tratamento, prometem cura, fazem propaganda, expõem dados de paciente ou ofendem alguém. Quem insiste perde o direito de comentar. As regras completas estão nos <a href="/termos-de-uso">termos de uso</a>.</p><h2>Correções</h2><p>Erros acontecem, e preferimos corrigi-los de forma visível. Se você encontrar uma informação errada, escreva para <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a> indicando a matéria e o trecho. Quando o erro é confirmado, a matéria é corrigida e ganha uma nota no fim informando o que mudou e quando.</p>', '2026-09-17T18:00:00Z')
on conflict (slug) do update set titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html, atualizada_em = excluded.atualizada_em;

-- Página: Sobre o Pulso Científico
insert into paginas (slug, titulo, linha_fina, corpo_html, atualizada_em)
values ('sobre', 'Sobre o Pulso Científico', 'Pesquisas de saúde, inteligência artificial, tecnologia, espaço e meio ambiente explicadas em português simples, com link para a fonte original.', '<h2>Por que existimos</h2><p>Todos os dias, revistas científicas, laboratórios, agências espaciais e centros de pesquisa publicam resultados que mudam o que se sabe sobre saúde, computação, clima, espaço e natureza. A maior parte desse conhecimento fica restrita a quem lê artigos em inglês e está acostumado com linguagem técnica.</p><p>No Brasil, muitos desses trabalhos nunca viram notícia. Quando viram, às vezes chegam com termos difíceis, números fora de contexto ou títulos exagerados. O Pulso Científico nasceu para mudar isso.</p><p class="texto-grande">Nosso objetivo é levar ciência confiável ao leitor brasileiro, numa linguagem que qualquer pessoa entende, sempre mostrando de onde a informação veio.</p><h2>O que cobrimos</h2><p>O site começou pela saúde e hoje acompanha ciência em geral, organizada em áreas, assuntos e temas:</p><ul><li><strong>Saúde</strong> — doenças, tratamentos, nutrição, saúde mental, medicamentos e vacinas.</li><li><strong>Inteligência artificial</strong> — modelos de linguagem, IA aplicada à medicina e à ciência, impacto no trabalho, segurança e regulação.</li><li><strong>Tecnologia</strong> — computação, chips, energia, transporte, segurança digital.</li><li><strong>Espaço</strong> — missões, astronomia, exploração do sistema solar.</li><li><strong>Clima e meio ambiente</strong> — clima extremo, energia limpa, poluição, oceanos.</li><li><strong>Natureza</strong> — biologia, animais, plantas, biodiversidade brasileira.</li></ul><p>Áreas novas entram quando há material bom o suficiente para sustentar a cobertura.</p><h2>O que você encontra em cada matéria</h2><ul><li><strong>Uma matéria nova por dia</strong>, a partir de pesquisas recentes.</li><li><strong>O que o estudo mostrou e o que ele ainda não diz</strong>, porque uma pesquisa isolada raramente é a palavra final.</li><li><strong>O link para a fonte original</strong> — o artigo na revista, o preprint ou o comunicado da instituição de pesquisa.</li><li><strong>Artigos de especialistas convidados</strong>, identificados com formação e área de atuação. No caso de médicos, com CRM e RQE.</li></ul><h2>Como fazemos</h2><p>O Pulso Científico usa automação e inteligência artificial para acompanhar as publicações, escolher as pesquisas de maior interesse e escrever as matérias da Redação Pulso. Esse processo segue regras fixas: partir sempre de uma fonte primária, conferir os números com o material original, explicar as limitações e nunca prometer resultados.</p><p>Os detalhes estão na nossa <a href="/politica-editorial">Política editorial</a>.</p><h2>Saúde tem cuidado extra</h2><p>Conteúdo de saúde pode influenciar decisões sobre a vida das pessoas, então recebe regras mais rígidas: preferimos ensaios clínicos e revisões, deixamos claro o tamanho e o tipo do estudo e nunca sugerimos começar, parar ou trocar tratamento. Nenhuma matéria substitui consulta com um profissional de saúde.</p><h2>Quem está por trás</h2><p>O Pulso Científico foi idealizado e desenvolvido por <strong>Victor Lucas de Andrade</strong>. O projeto é independente e não tem vínculo com as revistas, universidades, agências ou empresas cujas pesquisas noticia.</p><p>Especialistas interessados em escrever para o site podem solicitar acesso de autor. Cada acesso é analisado e liberado individualmente.</p><h2>O que não somos</h2><p>Não somos um serviço médico e não fazemos atendimento. Também não damos recomendação de investimento, de compra de produtos ou de tecnologia. As matérias informam sobre pesquisas; decisões sobre a sua saúde, o seu dinheiro ou o seu trabalho devem ser tomadas com quem conhece o seu caso.</p><h2>Fale com a gente</h2><p>Sugestões, correções e parcerias: <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a>.</p>', '2026-09-17T18:00:00Z')
on conflict (slug) do update set titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html, atualizada_em = excluded.atualizada_em;

-- Página: Política de privacidade
insert into paginas (slug, titulo, linha_fina, corpo_html, atualizada_em)
values ('politica-de-privacidade', 'Política de privacidade', 'Quais dados pessoais o Pulso Científico trata, por que, com quem compartilha e como você exerce seus direitos pela LGPD.', '<p>Esta política explica quais dados pessoais o Pulso Científico trata, por que, com quem compartilha e como você pode exercer seus direitos, de acordo com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018, a LGPD).</p><h2>Quem é o responsável</h2><p>O controlador dos dados é <strong>Victor Lucas de Andrade</strong>, responsável pelo Pulso Científico [CNPJ, se houver]. Para qualquer assunto sobre seus dados, o canal de atendimento é o e-mail <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a>.</p><h2>Quais dados tratamos</h2><h3>Se você lê o site</h3><ul><li><strong>Dados de navegação:</strong> endereço IP, tipo de navegador e dispositivo, páginas acessadas, data e hora. Parte desses dados é registrada automaticamente pela hospedagem do site.</li><li><strong>Cookies e tecnologias parecidas:</strong> usados para lembrar suas preferências, medir a audiência e exibir anúncios. Os detalhes estão na <a href="/cookies">Política de cookies</a>, e você escolhe quais aceitar.</li><li><strong>Interações com anúncios próprios:</strong> contamos quantas vezes cada anúncio próprio foi exibido e clicado. Essa contagem não guarda seu IP nem identifica você.</li></ul><h3>Se você entra com a sua conta Google (leitores)</h3><ul><li><strong>Dados da conta Google:</strong> nome, e-mail e foto de perfil. É o que o Google envia quando você autoriza a entrada; não recebemos a sua senha.</li><li><strong>Perfil:</strong> o nome, a foto e o resumo que você escolher em Minha conta. Nome e foto aparecem nos seus comentários; o e-mail não aparece para outros leitores.</li><li><strong>O que você faz no site:</strong> matérias curtidas e salvas, autores e categorias que segue, comentários e denúncias, com data e hora.</li></ul><h3>Se você escreve para o site (autores e editores)</h3><ul><li><strong>Dados da conta Google</strong> usada para entrar no painel: nome, e-mail e foto de perfil.</li><li><strong>Dados profissionais</strong> informados por você: nome de assinatura, formação, área de atuação, minibiografia e links de redes profissionais e, no caso de médicos, CRM, estado, especialidade e RQE. Parte desses dados é publicada junto com os artigos; para médicos, a identificação com CRM é exigida pela Resolução CFM nº 2.336/2023.</li><li><strong>Registros de uso do painel:</strong> quem criou, editou, enviou para revisão ou publicou cada matéria, e quando.</li></ul><h3>Se você entra em contato</h3><p>Nome, e-mail e o conteúdo da mensagem que você enviar.</p><p>Não pedimos dados de saúde de ninguém. Os comentários são públicos: o que você escrever ali fica visível para qualquer pessoa e pode aparecer em buscadores, por isso não conte no comentário o seu caso clínico nem o de outra pessoa.</p><h2>Para que usamos e com qual base legal</h2><table><thead><tr><th>Finalidade</th><th>Base legal (LGPD)</th></tr></thead><tbody><tr><td>Manter o site funcionando, seguro e protegido contra abusos</td><td>Legítimo interesse (art. 7º, IX)</td></tr><tr><td>Guardar registros de acesso, quando exigido pelo Marco Civil da Internet</td><td>Cumprimento de obrigação legal (art. 7º, II)</td></tr><tr><td>Lembrar suas preferências, como tema claro ou escuro e sua escolha de cookies</td><td>Legítimo interesse (art. 7º, IX)</td></tr><tr><td>Medir a audiência com ferramentas de estatística</td><td>Consentimento (art. 7º, I)</td></tr><tr><td>Exibir anúncios personalizados</td><td>Consentimento (art. 7º, I)</td></tr><tr><td>Exibir anúncios não personalizados e contar exibições de anúncios internos</td><td>Legítimo interesse (art. 7º, IX)</td></tr><tr><td>Dar acesso ao painel, identificar autores e publicar seus artigos</td><td>Execução de contrato ou procedimentos preliminares (art. 7º, V)</td></tr><tr><td>Identificar autores nos artigos e, no caso de médicos, com CRM e RQE</td><td>Cumprimento de obrigação regulatória do autor (art. 7º, II)</td></tr><tr><td>Manter a sua conta de leitor, com curtidas, salvos e quem você segue</td><td>Execução de contrato ou procedimentos preliminares (art. 7º, V)</td></tr><tr><td>Publicar os seus comentários com o seu nome e a sua foto</td><td>Execução de contrato ou procedimentos preliminares (art. 7º, V)</td></tr><tr><td>Moderar comentários, apurar denúncias e impedir abuso</td><td>Legítimo interesse (art. 7º, IX)</td></tr><tr><td>Responder mensagens e pedidos de correção</td><td>Legítimo interesse (art. 7º, IX)</td></tr></tbody></table><h2>Com quem compartilhamos</h2><p>Não vendemos dados pessoais. Compartilhamos apenas o necessário com serviços que fazem o site funcionar:</p><ul><li><strong>Google:</strong> login do painel, anúncios (Google AdSense), estatísticas de audiência, quando você consente, e fontes tipográficas.</li><li><strong>Hospedagem e banco de dados:</strong> a infraestrutura em nuvem onde o site e o painel estão hospedados.</li><li><strong>Bancos de imagens:</strong> algumas capas são exibidas direto dos servidores do Unsplash. Nesses casos, seu navegador se conecta ao Unsplash para carregar a foto, e o Unsplash recebe dados técnicos como o endereço IP.</li><li><strong>Autoridades:</strong> quando houver ordem judicial ou obrigação legal.</li></ul><p>Cada um desses serviços tem sua própria política de privacidade. As políticas do Google estão em <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>.</p><h2>Transferência internacional</h2><p>Alguns desses serviços guardam dados em servidores fora do Brasil, principalmente nos Estados Unidos. Essas transferências seguem o artigo 33 da LGPD e as garantias oferecidas por cada fornecedor.</p><h2>Por quanto tempo guardamos</h2><ul><li><strong>Registros de acesso ao site:</strong> 6 meses, quando exigido pelo Marco Civil da Internet.</li><li><strong>Escolha de cookies:</strong> 12 meses. Depois disso, perguntamos de novo.</li><li><strong>Dados de autores:</strong> enquanto a conta estiver ativa. Depois do encerramento, guardamos só o necessário para manter a autoria das matérias já publicadas e cumprir obrigações legais.</li><li><strong>Conta de leitor:</strong> enquanto existir. Você pode apagar a conta a qualquer momento em Minha conta: perfil, curtidas, salvos, quem você segue e comentários saem do ar em até 15 dias.</li><li><strong>Comentários recusados pela moderação:</strong> 6 meses, para apurar reincidência.</li><li><strong>Mensagens de contato:</strong> até 2 anos.</li></ul><p>Matérias publicadas continuam no ar com o nome de quem as assinou, porque fazem parte do acervo jornalístico do site.</p><h2>Seus direitos</h2><p>Pela LGPD, você pode, a qualquer momento:</p><ul><li>confirmar se tratamos seus dados e acessá-los;</li><li>corrigir dados incompletos, inexatos ou desatualizados;</li><li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desacordo com a lei;</li><li>pedir a portabilidade dos dados;</li><li>saber com quem compartilhamos seus dados;</li><li>revogar o consentimento e se opor a tratamentos baseados em legítimo interesse;</li><li>apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li></ul><p>Boa parte disso você resolve sozinho em <strong>Minha conta</strong>: trocar nome, foto e resumo, apagar comentários ou apagar a conta inteira. Para o resto, escreva para <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a>. Respondemos em até 15 dias. Suas escolhas de cookies podem ser mudadas a qualquer momento em <a href="/cookies">Preferências de cookies</a>.</p><h2>Segurança</h2><p>O painel só aceita login pela conta Google, e cada pessoa acessa apenas o que o seu papel permite. As chaves de serviços externos ficam guardadas no servidor, fora do alcance do navegador. Nenhum sistema é totalmente imune a falhas: se houver um incidente que possa trazer risco a você, avisaremos os afetados e a ANPD, conforme a lei.</p><h2>Crianças e adolescentes</h2><p>O Pulso Científico é voltado ao público adulto e não coleta dados de crianças e adolescentes de forma intencional. Contas de autor são liberadas apenas para profissionais maiores de idade.</p><h2>Mudanças nesta política</h2><p>Podemos atualizar esta política quando o site mudar ou a lei exigir. A data da última atualização aparece no topo da página. Mudanças importantes serão avisadas no site.</p>', '2026-09-17T18:00:00Z')
on conflict (slug) do update set titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html, atualizada_em = excluded.atualizada_em;

-- Página: Termos de uso
insert into paginas (slug, titulo, linha_fina, corpo_html, atualizada_em)
values ('termos-de-uso', 'Termos de uso', 'As regras para ler, compartilhar e publicar no Pulso Científico.', '<p>Ao usar o Pulso Científico, você concorda com estes termos. Se não concordar, não use o site.</p><h2>O que é o Pulso Científico</h2><p>O Pulso Científico é um site jornalístico e informativo que explica, em português, pesquisas científicas de várias áreas — saúde, inteligência artificial, tecnologia, espaço, clima e meio ambiente e natureza. As matérias da Redação Pulso são produzidas com inteligência artificial, conforme a <a href="/politica-editorial">Política editorial</a>. O site também publica artigos assinados por especialistas convidados.</p><h2>Não é orientação profissional</h2><p class="texto-grande">Nenhum conteúdo do site substitui consulta, diagnóstico ou tratamento com profissional de saúde.</p><p>As matérias relatam resultados de pesquisas, que podem ser preliminares, ter limitações ou não se aplicar ao seu caso. Não comece, pare ou mude um tratamento com base no que leu aqui. Em uma emergência, ligue para o SAMU (192) ou procure o serviço de saúde mais próximo.</p><p>O mesmo vale para as outras áreas: o conteúdo é informativo e não constitui orientação técnica, financeira, jurídica ou de investimento.</p><h2>Precisão e correções</h2><p>Trabalhamos para que as informações sejam fiéis às fontes e conferimos os números antes de publicar. Mesmo assim, erros podem acontecer, inclusive em textos produzidos com inteligência artificial. Se encontrar um erro, avise pelo e-mail <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a>. O procedimento de correção está na Política editorial.</p><h2>Direitos autorais</h2><ul><li><strong>Textos do Pulso Científico:</strong> pertencem ao Pulso Científico ou aos autores que os assinam. Você pode compartilhar o link de qualquer matéria e citar trechos curtos com crédito e link para a página original. Reproduzir a matéria inteira depende de autorização.</li><li><strong>Pesquisas citadas:</strong> os artigos científicos, suas figuras e tabelas pertencem às revistas e aos autores. O Pulso Científico noticia os resultados e aponta a fonte, sem reproduzir esse material.</li><li><strong>Imagens:</strong> as fotos vêm de bancos gratuitos (Pexels, Pixabay e Unsplash), sob as licenças desses serviços e com crédito ao fotógrafo, ou foram enviadas pelos autores com direito de uso.</li><li><strong>Marcas:</strong> nomes de revistas, instituições e produtos citados pertencem a seus titulares. A citação não indica vínculo nem endosso.</li></ul><h2>Autores convidados</h2><p>O acesso ao painel é pessoal, feito com a conta Google do autor e liberado pela administração. Quem publica no Pulso Científico se compromete a:</p><ul><li>escrever apenas em nome próprio, sem assinar por outra pessoa;</li><li>manter atualizados nome, formação e área de atuação e, no caso de médicos, CRM, estado e, quando citar especialidade, RQE;</li><li>quando médico, seguir a Resolução CFM nº 2.336/2023 e o Código de Ética Médica: sem promessa de resultado e sem sensacionalismo;</li><li>declarar conflitos de interesse ligados ao tema do artigo;</li><li>usar apenas imagens com direito de uso e sem pacientes identificáveis;</li><li>não publicar dados de pacientes.</li></ul><p>Todo artigo passa por revisão editorial antes de ir ao ar. O Pulso Científico pode recusar, editar para adequação às regras ou retirar conteúdos, e pode suspender acessos que descumpram estes termos. As opiniões dos artigos assinados são de responsabilidade de seus autores.</p><h2>Conta de leitor e comentários</h2><p>Qualquer pessoa pode entrar com a conta Google para curtir, salvar matérias, seguir autores e comentar. A conta é pessoal e você responde pelo que publica nela.</p><p>Ao comentar, você concorda em não publicar:</p><ul><li>dados de saúde, exames ou identificação de terceiros, nem o seu caso clínico em detalhe;</li><li>indicação de tratamento, dose, receita ou promessa de cura;</li><li>propaganda, venda de produtos, links de contato comercial ou divulgação de serviços;</li><li>ofensa, ameaça, discurso de ódio, conteúdo ilegal ou informação que você sabe ser falsa;</li><li>texto de outra pessoa sem crédito, nem trechos longos de artigos científicos.</li></ul><p>Os comentários passam por moderação: podem ser aprovados, recusados ou retirados, e contas que descumprem estas regras podem ser impedidas de comentar, sem aviso prévio. Comentário é opinião de quem escreveu — o Pulso Científico não responde pelo conteúdo, mas retira o que viola estes termos assim que identifica.</p><p>Você pode apagar os seus comentários e a sua conta quando quiser, em Minha conta.</p><h2>Publicidade</h2><p>O site exibe anúncios, identificados com a palavra “Publicidade”. Os produtos e serviços anunciados são de responsabilidade dos anunciantes, e a presença de um anúncio não significa recomendação do Pulso Científico.</p><h2>Links para outros sites</h2><p>As matérias trazem links para revistas científicas, bases de dados, agências de pesquisa e outros sites. Não controlamos esses sites e não respondemos pelo conteúdo ou pelas práticas de privacidade deles.</p><h2>Uso adequado</h2><p>Não é permitido usar o site para tentar acessar áreas restritas sem autorização, sobrecarregar os servidores, copiar o conteúdo em massa por meios automatizados ou praticar qualquer ato ilegal.</p><h2>Responsabilidade</h2><p>O site é oferecido como está. Não garantimos que ficará disponível o tempo todo nem livre de falhas técnicas. Na medida permitida pela lei, o Pulso Científico não responde por decisões tomadas com base no conteúdo publicado.</p><h2>Privacidade</h2><p>O tratamento de dados pessoais está descrito na <a href="/politica-de-privacidade">Política de privacidade</a> e na <a href="/cookies">Política de cookies</a>.</p><h2>Mudanças e lei aplicável</h2><p>Estes termos podem ser atualizados, e a data da última versão aparece no topo da página. Eles seguem as leis brasileiras. Eventuais conflitos serão resolvidos no foro previsto em lei, garantido ao consumidor o foro do seu domicílio.</p>', '2026-09-17T18:00:00Z')
on conflict (slug) do update set titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html, atualizada_em = excluded.atualizada_em;

-- Página: Política de cookies
insert into paginas (slug, titulo, linha_fina, corpo_html, atualizada_em)
values ('cookies', 'Política de cookies', 'Quais cookies o site usa, para que servem, quanto tempo duram e como você escolhe quais aceitar.', '<p>Cookies são pequenos arquivos que um site guarda no seu navegador para lembrar informações entre uma visita e outra. Tecnologias parecidas, como o armazenamento local do navegador, cumprem a mesma função. Esta página explica quais usamos e como você controla cada um.</p><h2>Sua escolha</h2><p>Na primeira visita, perguntamos quais cookies você aceita. Os necessários ficam sempre ligados, porque sem eles o site não funciona direito. Os de estatísticas e de publicidade personalizada só são usados com o seu consentimento.</p><p class="texto-grande">Você pode mudar a sua escolha a qualquer momento pelo link “Preferências de cookies”, no rodapé do site.</p><p>Se você recusar a publicidade personalizada, o site continua exibindo anúncios, mas não personalizados: eles levam em conta apenas o conteúdo da página e uma localização aproximada, sem usar seu histórico de navegação.</p><h2>Cookies necessários</h2><p>Sempre ativos. Não identificam você para fins de publicidade.</p><table><thead><tr><th>Nome</th><th>De quem</th><th>Para quê</th><th>Duração</th></tr></thead><tbody><tr><td>pulso-consentimento</td><td>Pulso Científico</td><td>Guarda sua escolha de cookies</td><td>12 meses</td></tr><tr><td>pulso-tema</td><td>Pulso Científico</td><td>Lembra se você prefere o tema claro ou escuro</td><td>Até você limpar o navegador</td></tr><tr><td>Sessão da conta</td><td>Pulso Científico</td><td>Mantém você conectado depois de entrar com o Google, como leitor ou como autor</td><td>Enquanto a sessão estiver ativa</td></tr></tbody></table><h2>Estatísticas</h2><p>Só com consentimento. Ajudam a entender quais matérias são lidas e como o site é usado, sempre de forma agregada.</p><table><thead><tr><th>Nome</th><th>De quem</th><th>Para quê</th><th>Duração</th></tr></thead><tbody><tr><td>_ga, _ga_*</td><td>Google Analytics</td><td>Distinguir visitantes e medir visitas e páginas vistas</td><td>Até 2 anos</td></tr></tbody></table><h2>Publicidade</h2><p>Os cookies de publicidade personalizada só são usados com consentimento.</p><table><thead><tr><th>Nome</th><th>De quem</th><th>Para quê</th><th>Duração</th></tr></thead><tbody><tr><td>__gads, __gpi</td><td>Google AdSense</td><td>Exibir anúncios, limitar repetições e medir o desempenho</td><td>13 meses</td></tr><tr><td>IDE</td><td>Google (DoubleClick)</td><td>Personalizar anúncios com base na navegação</td><td>Até 24 meses</td></tr><tr><td>NID</td><td>Google</td><td>Lembrar preferências e personalizar anúncios em serviços do Google</td><td>6 meses</td></tr></tbody></table><p>A contagem de exibições e cliques dos anúncios próprios do Pulso Científico não usa cookies e não identifica você.</p><h2>Conteúdo de terceiros</h2><p>Algumas capas são carregadas direto do Unsplash, e as fontes tipográficas vêm do Google Fonts. Esses serviços não precisam gravar cookies para funcionar, mas recebem dados técnicos do seu navegador, como o endereço IP, ao entregar a imagem ou a fonte.</p><h2>Outras formas de controlar</h2><ul><li>Nas configurações do seu navegador, você pode ver, apagar e bloquear cookies. Bloquear os necessários pode fazer o site funcionar de forma incompleta.</li><li>Em <a href="https://adssettings.google.com">adssettings.google.com</a>, você controla a personalização de anúncios do Google em todos os sites.</li><li>Mais informações sobre como o Google usa cookies estão em <a href="https://policies.google.com/technologies/cookies">policies.google.com/technologies/cookies</a>.</li></ul><p>Para dúvidas sobre cookies e dados pessoais, veja a <a href="/politica-de-privacidade">Política de privacidade</a> ou escreva para <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a>.</p>', '2026-09-17T18:00:00Z')
on conflict (slug) do update set titulo = excluded.titulo, linha_fina = excluded.linha_fina,
  corpo_html = excluded.corpo_html, atualizada_em = excluded.atualizada_em;

