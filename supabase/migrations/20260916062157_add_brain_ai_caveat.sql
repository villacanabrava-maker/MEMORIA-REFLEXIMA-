alter table public.brain_insights
  add column caveat text,
  add constraint brain_insights_caveat_valid check (caveat is null or char_length(caveat) <= 1000),
  add constraint brain_insights_caveat_origin check ((origin = 'manual' and caveat is null) or origin = 'ai');
