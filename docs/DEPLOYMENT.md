# Free Vercel deployment

Live URL: **pending the owner's first deployment in their personal Hobby account**. Vercel CLI 64.2.0 reported “Logged out”; no persistent cloud deployment or live smoke result is claimed.

## Architecture and feasibility

Chosen architecture **A**: Next.js and static circuit images on Vercel, plus one Python ASGI function exporting the existing FastAPI app. Simulations and actual Paulice reveals remain live. No external backend, database, large-function beta, paid add-on or credit-card feature is needed. Gameplay, payloads, targets, scoring protocol and layout are unchanged.

Official documentation checked on 16 October 2026:

| Constraint | Hobby support | Configuration |
|---|---|---|
| Python bundle | 500 MB uncompressed | Runtime-only pins and function-specific exclusions |
| Duration | 300 seconds with Fluid Compute | 60-second cap |
| Memory / CPU | 2 GB / 1 vCPU, managed by Vercel | No memory override |
| Python | 3.12 default; 3.13/3.14 available | .python-version selects 3.12 |
| Request / response | 4.5 MB platform cap | Existing 16 KiB input guard; largest measured response 769,396 bytes |
| Monthly included compute | 4 active CPU hours, 360 GB-hours memory | Monitor personal-demo usage; quotas are finite |

Sources: [Python runtime](https://vercel.com/docs/functions/runtimes/python), [limits](https://vercel.com/docs/functions/limitations), [duration](https://vercel.com/docs/functions/configuring-functions/duration), [memory](https://vercel.com/docs/functions/configuring-functions/memory), [Hobby](https://vercel.com/docs/plans/hobby). Hobby is for personal, non-commercial use. It is not unlimited free compute or an uptime guarantee.

Measured logical package sizes, in MiB (1,048,576 bytes):

| Package | Windows installed | Linux/Python 3.12 wheel contents |
|---|---:|---:|
| Qiskit 2.5.2 | 32.09 | 27.18 |
| Aer 0.17.2 | 39.49 | 43.54 |
| qiskit-paulice 0.2.1 | .97 | 1.42 |
| NumPy 2.2.6 | 48.95 | 55.11 |
| SciPy 1.15.3 | 130.60 | 114.37 |
| Matplotlib 3.10.9 | 25.45 | Excluded |
| pylatexenc 2.11 | 1.35 | Excluded |
| API runtime closure, with transitives | **275.69** | **260.18** |
| Entire development site-packages | **411.27** | Not deployed |

Compatible Linux wheels total 272.82 MB uncompressed. An additional allowance of twice their Python source size gives **337.87 MiB / 354.29 MB**, leaving approximately **145.71 MB (29%)** before the small application/runtime-adapter overhead. This is a planning estimate, not a measured Vercel artifact. Confirm the real function size in Deployment Resources after the first build. The Windows .venv is never uploaded.

Three fresh processes per case were pinned to one available CPU with one-thread numeric libraries. Each made an initial and two warm requests through the real ASGI app. Deployment-entrypoint maxima:

| Case | First request, s | Imports + first request, s | Peak sampled process-tree RSS, MiB |
|---|---:|---:|---:|
| Health | .030 | 1.444 | 101.5 |
| Main10 reasonable solution | .277 | 1.817 | 120.6 |
| Main10 all seven physical wires | .403 | 1.845 | 124.1 |
| Seven-wire T sandbox, 1024 shots | .310 | 1.791 | 121.8 |
| FS6 Paulice + fifteen-shell reveal | 1.509 | 2.972 | 120.8 |
| FS2 correction, seven wires, 1024 shots | .778 | 2.277 | 142.3 |

These are **local Windows/Python 3.10 measurements with warm disk caches**, not Vercel image boot, Linux runtime or network timings. Linux/Python 3.12 wheel availability and contents were checked, but no Linux interpreter/container was available locally. Real hosted cold starts remain a deployment acceptance check. Raw samples and package sizes are in DEPLOYMENT_FEASIBILITY.json. Reproduce timings with `python scripts/measure_deployment_feasibility.py --entrypoint api.index` using the development environment.

## Deployment-specific changes and safeguards

`requirements-deploy.txt` pins the API/server dependency closure; requirements.txt includes it for Vercel's automatic Python install. Drawing, Jupyter and test tools are absent. Loading the deployment API was also tested with optional drawing/notebook/test imports blocked. Offline PNG assets remain under public/tutorial-circuits. `.vercelignore` excludes development material; per-function excludeFiles keeps node_modules, src, public and .next out of the Python function while preserving frontend/CDN assets in the Next deployment.

**Keep backend/missions/references.json**: it supplies authoritative targets at runtime. The excluded backend/reference_solutions directory is test request data. Existing compatibility APIs retain their read-only bundled benchmark. Runtime code reads packaged constants relative to its module; no request runs offline image/experiment scripts or writes to the deployed filesystem.

`api/index.py` sets one-thread numeric libraries before importing Qiskit. Mixed QSphere components travel losslessly in the original response as little-endian float64/base64 data. The unchanged “Load next spectral components” UI decodes four locally, without requiring a callback to the same serverless instance. Local legacy token pagination remains compatible. This transport changes no quantum state, score or layout.

Existing limits remain: at most seven physical wires and 4096 sampled shots where counts are supported. Main scores are exact expectations and do not depend on shots. No limit was lowered and no live reveal/score was replaced with an approximation. Cached scores and reveal searches improve repeats but are not required for correctness.

The existing 16 KiB request guard and single-computation admission remain. The deployment wrapper adds **300 POST requests/minute/IP/warm instance**, bounded bookkeeping, 429 and Retry-After. This is best-effort admission, not a distributed global quota or a guarantee against coordinated abuse. Free quotas may pause service. `SIMULATION_ENABLED=false` is the existing emergency pause switch; redeploy after changing it. Client timeouts, failed connections and gateway errors show retry messages while retaining the circuit; no automatic retries silently multiply compute usage.

All production browser/API traffic is same-origin HTTPS, so no external-backend CORS policy is required. Never set the production browser API to HTTP or localhost. Future secrets belong only in Vercel environment settings, never source or NEXT_PUBLIC variables.

## Numbered deployment steps

1. **Publish the validated branch.** The origin is `Shreyansh9878/Gamify-Error-Detection-with-Spacetime-Codes-SchrodingersHackers`; this checkout uses `shreyansh-features`. Push the deployment commit there, or merge it into your intended production branch. Never force-push. Hobby must use a personal repository/account rather than a paid team or organization-owned Git repository.
2. **Sign in to Vercel with GitHub.** Select a personal **Hobby** account, not a Pro trial. Do not attach billing, storage, paid compute or add-ons. At [New Project](https://vercel.com/new), connect GitHub and import this repository.
3. **Select the validated branch and repository root.** If the import starts from an older default branch, set Project Settings → Git → Production Branch to `shreyansh-features` (or the branch containing the merged deployment commit), then deploy that branch. An older-branch initial build is not the validated app.
4. **Confirm configuration.** Framework Next.js; root repository root; install `pnpm install --frozen-lockfile`; build `pnpm build`; output `.next`. Node 24.x comes from package.json; Python 3.12 from .python-version. api/index.py is auto-detected as the Python function. No custom runtime-package string or memory override is needed. Enable Fluid Compute if reusing an old project.
5. **Set Production and Preview variables:** `ENABLE_EXPERIMENTAL_COREPACK=1`, `NEXT_PUBLIC_API_BASE_URL=/api`, `SIMULATION_ENABLED=true`. The Corepack flag makes Vercel honor `packageManager: pnpm@11.25.0`; an overridden `pnpm install` otherwise selects an older bundled pnpm that cannot reliably read this workspace. This is a build-tool flag, not a paid service. See [Vercel package-manager documentation](https://vercel.com/docs/package-managers). Leave `QUANTUM_API_URL` **unset on Vercel**; vercel.json selects the colocated function. The entrypoint supplies thread bounds and portable state frames. No IBM token or other application secret is needed.
6. **Deploy and inspect.** Check logs for Python 3.12 and pinned requirements. Confirm the actual Python bundle is below 500 MB, maxDuration is 60 seconds and memory is standard Hobby. No large-function beta is enabled. Copy the real `https://...vercel.app` origin after deployment is Ready.
7. **Run both live checks below.** Inspect real cold starts, score agreement, images, console and progress persistence. Only after success replace the pending URL in README and this document. If Deployment Protection blocks the public demo, adjust access intentionally in project settings; never commit bypass tokens.
8. **Redeploy on push.** The Git integration deploys pushes to the selected production branch and previews other branches. Variable changes require a fresh deployment. Keep the production domain stable so browser progress remains on the same origin.

Optional CLI after **your** login: `npx vercel@64.2.0 login`, `npx vercel@64.2.0 link`, then `npx vercel@64.2.0 --prod`. Select the personal Hobby project. This task's CLI is logged out, so no cloud deployment/vercel-dev session was fabricated. npm-exec ran the CLI successfully; the pnpm-dlx wrapper had a dependency-resolution error. The local equivalent below uses the actual production entrypoint and Next build.

## Local and live verification

```powershell
.venv/Scripts/python.exe -m pip install -r requirements.lock.txt
pnpm install --frozen-lockfile
pnpm build
# Terminal 1:
.venv/Scripts/python.exe -m uvicorn api.index:app --host 127.0.0.1 --port 8000
# Terminal 2:
pnpm start
# Terminal 3:
.venv/Scripts/python.exe scripts/smoke_deployment.py http://127.0.0.1:3000
pnpm exec playwright test --config playwright.deployment.config.ts
```

After deploying, use the actual origin:

```powershell
.venv/Scripts/python.exe scripts/smoke_deployment.py https://YOUR-PROJECT.vercel.app --output artifacts/live-smoke.json
$env:DEPLOYMENT_URL='https://YOUR-PROJECT.vercel.app'
pnpm exec playwright test --config playwright.deployment.config.ts
```

The Python smoke performs 78 checks: health, registry, all sixteen HTML URLs, all circuit PNGs, tutorial experiments/methods/reveal, and four strategies per main mission. It asserts local-score agreement within 1e-9 and the correct passing/failing controls. FS1–5 use learning evidence rather than numeric thresholds; the browser journey proves their completion and ordered unlocks. Browser deployment tests also check all direct links/refreshes on desktop and mobile, console/request errors, storage persistence and mixed-state pagination with server callbacks blocked.

Direct links are `/?school=1` through `/?school=6` and `/?mission=1` through `/?mission=10`. They honor existing progression locks. The navigation-only smoke seeds the existing expert skip; the independent full journey completes all lessons without skipping.

Progress remains under `quantum-shield-qed-v2`, scoped to the browser origin. Redeploying the same domain preserves it; localhost, preview domains, devices and other origins do not automatically share it. This remains local progress, not a trusted leaderboard.

Pending live acceptance: actual Linux/Vercel bundle size and imports; actual hosted cold-start latency; stable-domain localStorage; public HTTPS, routing and images; all reference scores against the cloud API. Local results must not be relabeled as cloud results.

## Verification status for this checkout

Local production verification passed: 214 Python tests, 39 frontend tests, TypeScript, the production build and 60 desktop/mobile browser tests. The 78-request API smoke passed with a maximum observed request of 1.096 seconds and 1e-9 score agreement. Portable-state tests succeeded with cache callbacks blocked. These results apply to the local production equivalent, not an unpublished cloud URL.

Live checklist after account linking:

- [ ] Dashboard reports the actual Python bundle below 500 MB and the expected runtime/duration.
- [ ] First request after an idle period completes acceptably; retry messages preserve the circuit if it does not.
- [ ] The 78-request smoke passes against the actual HTTPS origin.
- [ ] The deployment Playwright suite passes on desktop/mobile, including all level refreshes, console checks and progression.
- [ ] Existing browser progress survives another deployment to the same production domain.
- [ ] README contains the verified production URL; no localhost or preview URL is presented as the public demo.
