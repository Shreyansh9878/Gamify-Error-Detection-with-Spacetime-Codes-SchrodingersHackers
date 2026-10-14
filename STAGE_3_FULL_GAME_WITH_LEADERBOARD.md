# STAGE_3_FULL_GAME_WITH_LEADERBOARD.md

## 1. Outcome and competitive model

Add asynchronous multiplayer competition to the deployed Stage 2 game: authenticated players, verified submissions, per-level rankings, fixed-season global rankings, efficiency filters, and shareable verified results. This does not require real-time matches, WebSockets, a matchmaking service, or a paid database.

Choose Supabase Free for PostgreSQL and Auth. Its published free plan includes a 500 MB database, 50,000 monthly active users, and 5 GB egress; inactive projects may pause after one week. Check current allowances before launch, use retention policies, and monitor usage. Both Vercel and Supabase must remain within free allowances; unlimited growth cannot be promised at zero cost. [Supabase pricing](https://supabase.com/pricing)

```text
Browser -> Supabase Auth -> access token
Browser -> Vercel /api/submit-score -> authenticate -> rate limit
        -> reconstruct official configuration -> rerun Qiskit
        -> validate metrics -> PostgreSQL transaction
Browser -> Vercel /api/leaderboard -> parameterized read -> public projection
Browser -> /score?run=UUID -> Vercel /api/scores/UUID -> shared verified result
```

Stage 2 local play continues without an account. A player explicitly chooses Publish Score to create or use an account. Linking an anonymous account to email/OAuth is offered for recovery; anonymous authentication alone cannot guarantee one account per human. [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)

## 2. Directory additions and setup

```text
backend/
  auth.py                  # token validation and authenticated user identity
  database.py              # short pooled database connections
  submissions.py           # canonicalization, rerun, transaction
  leaderboard.py           # filtering, ranking, pagination
  rate_limits.py           # shared fixed-window admission and active leases
  app.py                   # additional API routes
supabase/migrations/001_competition.sql
quantum_engine/registry.py  # frozen competition manifests
web/src/app/leaderboard/page.tsx
web/src/app/score/page.tsx
web/src/components/leaderboard/
web/src/lib/supabase.ts
tests/security/
tests/leaderboard/
docs/{operations.md,privacy.md}
```

Setup sequence:

1. Create one Supabase Free project near the Vercel function region; record its project URL and public publishable key.
2. Enable anonymous sign-in; configure OAuth or email linking for recoverable accounts. Set production site URL and narrowly scoped redirect URLs. Enable available CAPTCHA protection before public anonymous signup.
3. Obtain the transaction-pooler connection URL from the Connect panel. Store it only in Vercel server environment variables, with TLS required.
4. Apply the migration below in the Supabase SQL editor. Review row-level security before exposing the app.
5. Add `@supabase/supabase-js` to the frontend and `psycopg[binary]` plus `httpx` to Python; resolve and commit updated lockfiles.
6. Seed the competition and variant rows from the frozen Stage 1 registry. Record actual engine, noise, compiled payload, and check-catalog hashes. Do not invent provenance hashes.
7. Keep the leaderboard feature disabled until submission reruns and access-policy tests pass.

Use the Supabase transaction pooler for short serverless connections and disable prepared statements where required by that pooling mode. Avoid opening a large connection pool in each scaled function instance. [Database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)

## 3. Database migration

The application backend is the only database reader/writer. Browser clients use Supabase for authentication and call the game's API for profiles, runs, and rankings. Enable RLS with no browser policies on these tables; do not expose a public view that bypasses the intended projection. [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  created_at timestamptz not null default now()
);

create table public.competitions (
  id text primary key,
  engine_version text not null,
  noise_hash text not null check (noise_hash ~ '^[a-f0-9]{64}$'),
  score_version text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  accepting_scores boolean not null default false,
  check (ends_at > starts_at)
);

create table public.level_variants (
  competition_id text not null references public.competitions(id),
  variant_id text not null,
  level_id integer not null check (level_id between 1 and 6),
  payload_depth integer not null check (payload_depth > 0),
  metric_id text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  primary key (competition_id, variant_id)
);

create table public.season_levels (
  competition_id text not null references public.competitions(id),
  level_id integer not null check (level_id between 1 and 6),
  variant_id text not null,
  primary key (competition_id, level_id),
  foreign key (competition_id, variant_id)
    references public.level_variants(competition_id, variant_id)
);

create table public.verified_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  competition_id text not null,
  variant_id text not null,
  config_hash text not null check (config_hash ~ '^[a-f0-9]{64}$'),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  f_before double precision not null check (f_before between 0 and 1),
  f_post double precision not null check (f_post between 0 and 1),
  p_keep double precision not null check (p_keep between 0 and 1),
  shots integer not null check (shots > 0),
  kept_shots integer not null check (kept_shots between 0 and shots),
  checked_depth integer not null check (checked_depth > 0),
  ancillas integer not null check (ancillas between 0 and 3),
  added_two_qubit integer not null check (added_two_qubit >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  score integer generated always as
    (floor(1000 * f_post * p_keep + 0.5)::integer) stored,
  public_share boolean not null default false,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (competition_id, variant_id)
    references public.level_variants(competition_id, variant_id),
  unique (user_id, competition_id, variant_id, config_hash)
);

create index runs_board_idx on public.verified_runs
  (competition_id, variant_id, score desc, added_two_qubit, checked_depth, id);
create index runs_user_idx on public.verified_runs (user_id, created_at desc);

create table public.submission_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null,
  status text not null check (status in ('running', 'complete', 'failed')),
  lease_token uuid not null default gen_random_uuid(),
  lease_until timestamptz not null,
  run_id uuid references public.verified_runs(id),
  updated_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create table public.rate_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (bucket_key, window_start)
);

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.level_variants enable row level security;
alter table public.season_levels enable row level security;
alter table public.verified_runs enable row level security;
alter table public.submission_jobs enable row level security;
alter table public.rate_buckets enable row level security;

revoke all on public.profiles, public.competitions, public.level_variants,
  public.season_levels, public.verified_runs, public.submission_jobs,
  public.rate_buckets from anon, authenticated;
```

The privileged database credential stays exclusively on the server. Prefer a dedicated backend role with only the required table privileges; if using the initial project-owner connection during setup, document its broader privilege and never distribute it to clients. The generated score column enforces the published arithmetic but does not replace scientific validation.

Seed one canonical variant per mission into `season_levels`. Validate that each referenced variant's `level_id` matches that row and that all six missions exist before enabling global rankings. Variant IDs separate protocols, payloads, and depths. Store per-observable details and uncertainty in `evidence`, capped at 32 KiB. Store no raw state matrices or access tokens.

## 4. Authentication and server connections

New environment variables:

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Auth project origin |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Public Auth key; protected by access policies |
| `NEXT_PUBLIC_ENABLE_LEADERBOARD` | Browser | `true` only after release verification |
| `SUPABASE_URL` | Server | Auth validation origin |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Calls Auth's user endpoint |
| `DATABASE_URL` | Server secret | Transaction-pooler URL with TLS |
| `RATE_LIMIT_HMAC_SECRET` | Server secret | Hashes network identifiers for short-lived rate buckets |
| `SUBMISSIONS_ENABLED` | Server | Independent publication kill switch |

Validate the bearer token through Supabase Auth before any simulation or write. Never trust a user ID in a request body. One implementation is:

```python
import os
from uuid import UUID
import httpx
from fastapi import HTTPException

def authenticated_user(authorization: str | None) -> UUID:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in to publish a score")
    token = authorization[7:]
    try:
        response = httpx.get(
            os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/user",
            headers={"apikey": os.environ["SUPABASE_PUBLISHABLE_KEY"],
                     "Authorization": "Bearer " + token},
            timeout=5,
        )
    except httpx.RequestError:
        raise HTTPException(503, "Authentication is temporarily unavailable")
    if response.status_code in (401, 403):
        raise HTTPException(401, "Session expired or invalid")
    if response.status_code != 200:
        raise HTTPException(503, "Authentication is temporarily unavailable")
    return UUID(response.json()["id"])
```

Do not log the Authorization header. Return 503 on an Auth outage rather than pretending the token was invalid. Alternative local JWT validation must verify signature, algorithm, issuer, audience, and expiry against the project keys. [Supabase JWT guidance](https://supabase.com/docs/guides/auth/jwts)

For PostgreSQL, use short `psycopg.connect(DATABASE_URL, prepare_threshold=None, connect_timeout=5)` contexts. Set a short SQL statement timeout and close connections after each transaction. Do not keep a transaction open during quantum simulation.

## 5. Submission endpoint and mandatory rerun

`POST /api/submit-score` requires a bearer token and UUID `Idempotency-Key` header. Body:

```json
{
  "competitionId": "qff-2026-season-1",
  "levelId": 1,
  "variantId": "bell-depth1-paulice-v1",
  "targetOrder": [0],
  "checkCount": 1,
  "manualCheckIds": [],
  "publishShareLink": false
}
```

Reject unknown fields, including `score`, `fidelity`, `noise`, `seed`, `userId`, and unregistered gates. This endpoint accepts player choices, not evidence supplied by the browser.

Processing sequence:

1. Validate transport bounds and authenticate the token.
2. Verify the competition is open, the variant belongs to the level, and the running deployment matches the competition engine/noise/metric versions.
3. Canonicalize the choices and hash canonical UTF-8 JSON with SHA-256. Sort object keys, but preserve target order because it is meaningful. Include engine/noise/protocol/catalog versions in the hash.
4. Atomically claim an idempotency record and apply user/network/global admission limits. The same key with a different request hash returns 409.
5. Reconstruct the payload, checks, references, noise model, compilation policy, and seeds from the server registry.
6. Rerun the complete baseline and checked evaluation using the Stage 1 engine. Do not reuse a browser result or accept a signed practice score as sufficient verification.
7. Require valid fidelity/retention ranges, sufficient retained shots in every setting, correct resource budgets, finite values, and reproducibility metadata. Failed runs never enter `verified_runs`.
8. Recheck the competition and lease, then insert the result and complete the idempotency record in one transaction.
9. Return the verified result, public display name, score, and optional share path. Return 201 for a new run and 200 for an existing verified duplicate.

Use exact probabilities for Protocol A ranking. For Protocol B, use fixed server seeds and a frozen high-shot protocol; persist uncertainty and distinguish the leaderboard's reproducible benchmark score from a hardware-certainty claim. Unstable near-ties can share a displayed rank bucket, while the deterministic ordering remains documented. Do not let clients reroll random seeds.

A duplicate completed idempotency request returns its stored response without recomputing; its original result was already rerun. New submissions must be rerun before a new result is written. Lock immutable configuration results per competition to prevent later attempts replacing them with a more favorable sampling fluctuation.

### Transactions and retry safety

Reserve a 90-second job lease for a submission whose execution budget is 45 seconds. After expiry, a retry may atomically claim a new `lease_token`. Finalization requires the same current token, so an old timed-out worker cannot overwrite a newer result. Return 202 with a retry delay for an already running duplicate; use the same synchronous processing request for initial work, not an unmanaged background task.

Insert the verified run with parameterized values and `ON CONFLICT (user_id, competition_id, variant_id, config_hash) DO NOTHING`. Fetch the existing row if necessary. Mark the matching job complete and record its run ID in the same transaction. If simulation fails, mark the owned lease failed and preserve a safe error code for retry.

Bound admission with atomic buckets; for example:

```sql
insert into public.rate_buckets (bucket_key, window_start, hits)
values (%(bucket)s, %(window)s, 1)
on conflict (bucket_key, window_start)
do update set hits = public.rate_buckets.hits + 1
where public.rate_buckets.hits < %(limit)s
returning hits;
```

No returned row means reject with 429. Start at 3 submissions/minute and 30/day per account, plus a deployment-wide measured compute budget. Bucket each limit separately and set all limits from server configuration. Use short-lived HMAC-derived network buckets only from a trusted platform-provided client address; do not trust arbitrary forwarding headers. Count failed attempts against admission to discourage expensive invalid requests.

## 6. Leaderboard queries and filters

`GET /api/leaderboard` supports:

| Parameter | Rules |
|---|---|
| `competitionId` | Required registered competition |
| `scope` | `level` or `global` |
| `levelId` | Required for level scope |
| `metricId` | Required when a level offers more than one protocol |
| `payloadDepth` | Exact registered depth; excludes unrelated workloads |
| `maxCheckedDepth` | Optional positive bound |
| `minEfficiency` | Optional finite nonnegative value |
| `sort` | `score` or `efficiency` |
| `limit` / `offset` | Default 20/0, maximum 50/1000 |

Define circuit execution efficiency as `score / (1 + added_two_qubit_gates)`. This is a game resource metric, not runtime speed or a universal quantum efficiency measure. Show retention and ancillas beside it. Record server duration for diagnostics only; cold starts must not affect player rankings.

Apply filters before selecting each player's best eligible run. Otherwise, filtering a previously selected personal best can hide a valid lower-depth result. Example score-sorted level query:

```sql
with eligible as (
  select r.*, v.level_id, v.payload_depth, v.metric_id,
         r.score::double precision / (1 + r.added_two_qubit) as efficiency
  from public.verified_runs r
  join public.level_variants v using (competition_id, variant_id)
  where r.competition_id = %(competition)s
    and v.level_id = %(level)s
    and v.metric_id = %(metric)s
    and (%(depth)s::integer is null or v.payload_depth = %(depth)s)
    and (%(max_depth)s::integer is null or r.checked_depth <= %(max_depth)s)
    and (%(min_eff)s::double precision is null or
         r.score::double precision / (1 + r.added_two_qubit) >= %(min_eff)s)
), personal as (
  select *, row_number() over (
    partition by user_id
    order by score desc, added_two_qubit asc, checked_depth asc, id asc
  ) as personal_order from eligible
), ranked as (
  select *, row_number() over (
    order by score desc, added_two_qubit asc, checked_depth asc, id asc
  ) as position from personal where personal_order = 1
)
select x.position, p.display_name, x.score, x.efficiency,
       x.f_post, x.p_keep, x.payload_depth, x.checked_depth,
       x.ancillas, x.added_two_qubit,
       case when x.public_share then x.id else null end as shared_run_id
from ranked x join public.profiles p using (user_id)
order by x.position
limit %(limit)s offset %(offset)s;
```

For efficiency sort, use a second fixed SQL statement ordering both ranking windows by `efficiency desc, score desc, added_two_qubit asc, checked_depth asc, id asc`. Select the statement from a server enum; never interpolate an arbitrary client ORDER BY expression. Pagination is bounded and explicitly a live view that can shift as new scores arrive.

Global ranking sums each player's best score for the six canonical season variants. Missing missions contribute zero, so the maximum is 6000. This is an aggregate game score, not an average physical fidelity across different protocols.

```sql
with best as (
  select r.user_id, s.level_id, max(r.score) as score
  from public.season_levels s
  join public.verified_runs r
    on r.competition_id = s.competition_id and r.variant_id = s.variant_id
  where s.competition_id = %(competition)s
  group by r.user_id, s.level_id
), totals as (
  select user_id, sum(score) as total_score, count(*) as completed_missions
  from best group by user_id
)
select p.display_name, t.total_score, t.completed_missions,
       dense_rank() over (order by t.total_score desc) as rank
from totals t join public.profiles p using (user_id)
order by t.total_score desc, t.user_id
limit %(limit)s offset %(offset)s;
```

Global scope rejects depth/efficiency filters with 422 because its canonical suite is fixed. Level scope supplies those filters. Cache public leaderboard projections for 30 seconds, keyed by the complete query. Authenticated “my rank” responses are separate and `no-store`; never let a public cache include session-specific data.

## 7. UI, sharing, badges, and local-to-cloud transition

```text
[Global | This level] [Season] [Depth] [Score | Efficiency] [Refresh]
Rank | Player | Score | Fidelity | Kept | Added 2Q | Depth | Verified
Each row binds to the corresponding public leaderboard response fields.
[Your best verified run] [Publish current strategy] [Privacy]
```

Table cells use live API values, never hardcoded demo scores in production. Provide a card layout on mobile and a horizontally scrollable table with accessible headers on desktop. Modals trap focus, close with Escape, restore focus, and explain filtering and tie-breaking.

Publishing flow: local result -> Publish Score -> sign in if needed -> choose public name and optional sharing -> server rerun -> verified result -> updated ranking. If the rerun differs from practice, show both with protocol/shot explanations; never overwrite a local score silently.

LocalStorage progress remains local. Offer optional account synchronization later through an authenticated endpoint, but never upload local best scores as verified records. Existing local strategies can be resubmitted for fresh evaluation.

Badges are derived on the server from verified records: First Verified Run, All Six Missions, and Budget Explorer for valid submissions at multiple check counts on the same benchmark. These badges do not alter scientific scores. Tutorial completion may receive a local learning badge but must not be described as server-verified.

Share pages use `/score?run=UUID`, keeping Next static export viable. `GET /api/scores/{id}` returns a public projection only if `public_share=true`; otherwise return 404 to unauthenticated visitors. An authenticated owner may inspect their own private result through a separate no-store response. Expose only display name, configuration, metrics, benchmark versions, and creation time. Never expose email, auth IDs, network hashes, or tokens.

Implement `PATCH /api/scores/{id}/visibility` with ownership validation. Turning sharing off revokes future public reads; initially use `no-store` for share responses to avoid stale visibility caches. Sharing copies a URL only after the user requests it. A UUID is not itself an access-control mechanism.

Profile updates use an authenticated `PATCH /api/profile`. Normalize whitespace, enforce 2–24 characters, render as text, and reject control characters. Duplicate display names are allowed; identity is the authenticated UUID. Do not use display names as authorization keys.

## 8. Operations, cost controls, and security verification

Log structured events containing request ID, route, elapsed time, status, engine/benchmark version, and coarse failure category. Do not log access tokens, database URLs, entire request headers, or raw network identifiers. Monitor p50/p95 API latency, cold starts, rerun failures, submission counts, database size, connections, and Vercel/Supabase usage.

Retain successful compact verified runs for the season. Delete expired rate buckets after 48 hours and completed/failed job records after seven days, retaining immutable verified runs. Run bounded cleanup from an operator command or a protected scheduled action within free allowances; do not add a paid worker. Set an initial operational database alert at 350 MB, leaving headroom below the current 500 MB allowance. Document account deletion, record retention, and export procedures in `docs/privacy.md`.

If Supabase pauses or is unavailable, leave Stage 2 practice mode available and disable publication with a clear status. Do not create fake successful submissions or use localStorage as a global leaderboard fallback. Reopen an inactive project before a scheduled demo; do not use artificial keep-alive traffic as a substitute for understanding free-tier behavior.

Verification suite:

1. Missing, expired, malformed, and foreign-project tokens are rejected before simulation.
2. Browser public/authenticated credentials cannot directly insert, update, or read protected database rows.
3. Forged score/noise/seed/user fields are rejected; an edited localStorage score has no effect.
4. Server reruns use the frozen registry and agree with reproducibility fixtures.
5. Same key/same request is idempotent; same key/different request returns 409.
6. Concurrent submissions cannot create duplicate configurations or allow an expired lease to finalize.
7. Insufficient shots, invalid checks, nonfinite metrics, budget violations, and engine-version mismatch produce no verified row.
8. Depth and efficiency filters run before personal-best selection; SQL injection attempts fail validation.
9. Global ranking uses exactly the canonical six variants and handles missing missions correctly.
10. Private share links return 404 publicly; sharing revocation and ownership checks work.
11. Auth/database outages preserve local play and show retryable publication errors.
12. Usage limits, cleanup, backup/export, and submission kill switch are exercised on preview.

Run pytest security/leaderboard suites against a disposable test database, then Playwright's sign-in, publish, filter, share, and revoke flows. Never run destructive test cleanup against the live competition database. Enable production publication only after these checks pass and the free-tier resource measurements are recorded.
