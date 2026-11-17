-- =====================================================================
-- Seed: ministérios da 2ª Igreja do Nazareno de Campinas (Naza2 Campinas)
-- Fonte: https://naza2-campinas.leo-ehrhardt82.workers.dev/
--
-- Idempotente: usa ON CONFLICT, pode rodar mais de uma vez.
-- Cargos são sugestões iniciais; o ADM ajusta pela tela /admin/ministerios.
-- =====================================================================

insert into public.ministries (name, description) values
  -- Servir (os que têm escala no dia a dia)
  ('Louvor',          'Responsável pela música dos cultos.'),
  ('Coral',           'Ensaios às segundas-feiras, às 19h30.'),
  ('Mídia',           'Transmissões, projeção, som e redes sociais.'),
  ('Intercessores',   'Oração pelas famílias da igreja.'),
  ('Cidadania',       'Ações sociais e comunitárias.'),
  -- Crianças
  ('Culto Infantil',  'Programação para crianças de 0 a 11 anos, aos domingos à noite.'),
  ('Preteen',         'Encontros para a faixa dos 9 aos 12 anos, aos sábados.'),
  -- Jovens e adolescentes
  ('JNI Tribo',       'Ministério de jovens adultos, aos sábados à noite.'),
  ('Adolescentes',    'Encontros para a faixa dos 12 aos 18 anos, aos sábados.'),
  ('El Shamah',       'Grupo de dança, a partir dos 12 anos.'),
  ('Teatro Atos',     'Grupo de teatro cristão.'),
  -- Família
  ('Casais',          'Fortalecimento do casamento e orientação familiar.'),
  ('Mulheres',        'Encontros mensais e retiros anuais.'),
  ('Valentes',        'Hombridade · discipulado masculino.'),
  ('Pais por Toda Vida', 'Apoio ao desenvolvimento da paternidade e maternidade.'),
  ('Melhor Idade',    'Encontro de comunhão uma vez por mês.')
on conflict (name) do update set description = excluded.description;

-- Cargos iniciais por ministério
with r(ministry, role) as (values
  ('Louvor', 'Ministro'), ('Louvor', 'Vocal'), ('Louvor', 'Violão'), ('Louvor', 'Guitarra'),
  ('Louvor', 'Teclado'), ('Louvor', 'Baixo'), ('Louvor', 'Bateria'),
  ('Coral', 'Regente'), ('Coral', 'Soprano'), ('Coral', 'Contralto'), ('Coral', 'Tenor'), ('Coral', 'Baixo'),
  ('Mídia', 'Projeção'), ('Mídia', 'Som'), ('Mídia', 'Transmissão'), ('Mídia', 'Fotografia'), ('Mídia', 'Redes sociais'),
  ('Intercessores', 'Intercessor'),
  ('Cidadania', 'Voluntário'), ('Cidadania', 'Coordenação'),
  ('Culto Infantil', 'Professor'), ('Culto Infantil', 'Auxiliar'), ('Culto Infantil', 'Recepção'), ('Culto Infantil', 'Berçário'),
  ('Preteen', 'Líder de turma'), ('Preteen', 'Auxiliar'),
  ('JNI Tribo', 'Coordenação'), ('JNI Tribo', 'Recepção'), ('JNI Tribo', 'Louvor'),
  ('Adolescentes', 'Líder de turma'), ('Adolescentes', 'Auxiliar'),
  ('El Shamah', 'Coreografia'), ('El Shamah', 'Dançarino'),
  ('Teatro Atos', 'Direção'), ('Teatro Atos', 'Ator'),
  ('Casais', 'Coordenação'), ('Casais', 'Apoio'),
  ('Mulheres', 'Coordenação'), ('Mulheres', 'Apoio'),
  ('Valentes', 'Coordenação'), ('Valentes', 'Apoio'),
  ('Pais por Toda Vida', 'Coordenação'), ('Pais por Toda Vida', 'Apoio'),
  ('Melhor Idade', 'Coordenação'), ('Melhor Idade', 'Apoio')
)
insert into public.ministry_roles (ministry_id, name)
select m.id, r.role from r join public.ministries m on m.name = r.ministry
on conflict (ministry_id, name) do nothing;
