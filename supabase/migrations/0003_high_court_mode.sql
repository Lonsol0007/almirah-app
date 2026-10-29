-- High Court mode: a court complex is either a district court complex or a High Court bench
-- (its establishments are the bench's sides), and each advocate picks which level pickers open on.

alter table court_complexes
  add column kind text not null default 'district' check (kind in ('district', 'high_court'));
create index on court_complexes (kind);

alter table profiles
  add column court_level text not null default 'district' check (court_level in ('district', 'high'));
