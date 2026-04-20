-- Kirha/Apollo CEO contact enrichment
-- Adds three columns to funding_rounds so the pipeline can store the CEO's
-- verified email and LinkedIn URL alongside the existing ceo_name field.
--
-- See enrich_ceo_email.py for the enrichment logic.

alter table public.funding_rounds
    add column if not exists ceo_email text,
    add column if not exists ceo_linkedin_url text,
    add column if not exists ceo_email_source text;

comment on column public.funding_rounds.ceo_email is
    'Verified CEO email from Kirha/Apollo. NULL when Apollo has no data or the email is gated behind a paid tier.';

comment on column public.funding_rounds.ceo_linkedin_url is
    'CEO LinkedIn profile URL from Kirha/Apollo. NULL when not available.';

comment on column public.funding_rounds.ceo_email_source is
    'Provenance of the CEO email. Currently only value is "kirha_apollo".';
