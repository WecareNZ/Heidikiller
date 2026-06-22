-- Referral protocols (HealthPathways / WeCare) used to ground referral writing.
-- Content is read server-side only (via the service role key in the Netlify
-- function), so RLS denies anon/public access by default — no policies added.

create table if not exists public.referral_protocols (
  id text primary key,
  title text not null,
  source text not null,                 -- 'HealthPathways' | 'WeCare' | ...
  region text,                          -- region for HealthPathways criteria
  triggers text[] not null default '{}',-- lower-case keywords for matching
  when_to_refer text not null,
  required_workup text not null,        -- drives the pre-referral Plan
  red_flags text,                       -- acute/ED criteria
  referral_must_include text not null,  -- what the letter must contain
  destination text not null,            -- service/specialty addressed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_referral_protocols_updated_at on public.referral_protocols;
create trigger trg_referral_protocols_updated_at
  before update on public.referral_protocols
  for each row execute function public.set_updated_at();

-- Lock down: RLS on, no policies => only the service role (server) can read.
alter table public.referral_protocols enable row level security;
