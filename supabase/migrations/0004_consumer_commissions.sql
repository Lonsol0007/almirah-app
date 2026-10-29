-- Consumer commissions: District, State and National Consumer Disputes Redressal Commissions are a third kind
-- of court complex (their benches are the establishments), and a third court level an advocate can default to.
-- Their cases are filed on e-Jagriti and carry no CNR; the app stores a stable "EJ…" stand-in (src/lib/consumer.ts).

alter table court_complexes drop constraint court_complexes_kind_check;
alter table court_complexes
  add constraint court_complexes_kind_check check (kind in ('district', 'high_court', 'consumer'));

alter table profiles drop constraint profiles_court_level_check;
alter table profiles
  add constraint profiles_court_level_check check (court_level in ('district', 'high', 'consumer'));
