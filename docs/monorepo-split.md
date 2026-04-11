# Monorepo Split — Tracking Doc

**Status:** Phase 0 in progress
**Goal:** Split `jknack0/steady` monorepo into 5 repos under the `Steady-Mental-Health` GitHub organization, fronted by a workspace CLI.

**GitHub homes:**
- Old monorepo (becoming archive): `jknack0/steady`
- New code + tooling repos: `Steady-Mental-Health/steady-{api,web,mobile,shared,workspace}`

## The 5 target repos

| Repo | Content | Dependencies |
|---|---|---|
| `steady-api` | Express API + pg-boss + Prisma (db folded in) + Bedrock client | `@steady/shared` via git URL |
| `steady-web` | Next.js 15 clinician dashboard | `@steady/shared` via git URL |
| `steady-mobile` | Expo 54 participant app | **None** (4 shared imports inlined) |
| `steady-shared` | Zod schemas + TS types + constants + theme | None |
| `steady-workspace` | CLI that clones, installs, links, and runs all of the above | None — tool only |

## Locked decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Repo count | 5 total (4 code + 1 workspace CLI) | 4 code repos is the target separation; workspace CLI gives a monorepo-like dev loop |
| 2 | Registry | **None — git URL deps** | No publishing ceremony, no auth tokens, no monthly fee. `package.json` pins consumer dependencies directly at `git+ssh://git@github.com/Steady-Mental-Health/steady-shared.git#vX.Y.Z`, lockfile pins exact SHA |
| 3 | Mobile shared handling | **Inline the 4 imports** | Mobile only imports 4 things from shared (theme, emotion constants, session review types). Inlining eliminates mobile from every future schema-bump coordination |
| 4 | Git history | **Preserve via `git-filter-repo`** | Each new repo keeps its own subset of history, blame, and commit dates |
| 5 | Deploy cutover | **Dual-run ~1 week** | Old and new deploys live in parallel before cutover; verify parity before flipping traffic |
| 6 | Old monorepo | **Archive, don't delete** | Read-only reference post-split; source of truth for "what happened before" |
| 7 | Workspace CLI | **Yes, 5th repo** | `steady init` / `dev` / `link` / `shared bump` — gives back the monorepo dev-loop ergonomics |

## The workspace CLI surface

```bash
# One-time setup
git clone git@github.com:Steady-Mental-Health/steady-workspace.git
cd steady-workspace
npx steady init
# → clones 4 code repos as siblings, runs npm install, npm links shared

# Day-to-day
steady dev                    # starts api + web + mobile
steady dev api web            # subset
steady status                 # git status across all 4
steady update                 # git pull + reinstall + relink
steady doctor                 # preflight: node version, ports, aws creds, db
steady link / unlink          # manage npm link for @steady/shared local edits
steady shared bump patch      # bump shared, tag, push, auto-PR consumers
```

## Phase plan

| Phase | Name | Output | Status |
|---|---|---|---|
| **0** | Prep in current monorepo | Phantom deps removed, `.nvmrc` files, tracking doc, CI freeze | ✅ done (`aa5c0ef`) |
| **1** | Create `steady-shared` repo | `git filter-repo --path packages/shared/`, push, tag `v0.1.0` | ✅ done (`Steady-Mental-Health/steady-shared@v0.1.0`, 80+1 commits, 494 tests pass) |
| **1.5** | Create `steady-workspace` repo (MVP scope) | CLI with `init`/`status`/`link`/`unlink`/`dev`; `doctor`/`update`/`shared bump` deferred to 1.5b | ✅ done (`Steady-Mental-Health/steady-workspace@v0.1.0`, link fix at `968367a`) |
| **2** | Create `steady-api` repo | `git filter-repo --path packages/api/ --path packages/db/` with path-renames; db folded into `src/db/`; 135 `@steady/db` references rewritten; git-URL shared dep; `bootstrap-env.ts` + `field-encryption.test.ts` path fixes | ✅ done (`Steady-Mental-Health/steady-api@v0.1.0`, 191+1 commits, **1055/1055 tests pass**, CI deferred to post-cutover) |
| **3** | Create `steady-web` repo | `git filter-repo --subdirectory-filter apps/web`; remove phantom `@steady/db` dep; remove `@steady/db` from `next.config.js` `transpilePackages`; rewrite `amplify.yml` for single-repo build (no cross-workspace dance); git-URL shared dep | ✅ done (`Steady-Mental-Health/steady-web@v0.1.0`, 255+1 commits, **next build green**, 58/60 vitest — 2 pre-existing flaky tests unrelated to extraction) |
| **4** | Create `steady-mobile` repo | `git filter-repo --subdirectory-filter apps/mobile`; inline 4 `@steady/shared` symbols (theme, feelings-wheel data+helpers, review types) into `lib/shared-copy/`; type-only review mirror (no zod); rewrite 4 import sites; add `@expo/vector-icons` as explicit dep (was workspace-hoisted); rewrite `vercel.json` for standalone; add `.npmrc` with `legacy-peer-deps=true` for Expo ecosystem | ✅ done (`Steady-Mental-Health/steady-mobile@v0.1.0`, 78+1 commits, **typecheck 0 errors, Metro starts clean on `Waiting on http://localhost:8081`** — no EACCES, mobile has zero cross-repo deps) |
| **5** | Dual-run cutover | Old + new deploys parallel ~1 week, then flip DNS/Amplify, verify. **Also replay dev-only fixes** (see below) onto `steady-api/main` | pending |
| **6** | Archive + memory update | Mark `jknack0/steady` read-only (GitHub archive setting), update auto-memory files to point at `Steady-Mental-Health/*` | pending |

### Known follow-ups

**steady-web pre-existing test flakiness** (not blocking)
- `src/__tests__/use-autosave.test.ts > sets status to saving immediately on save call` — timing assertion fails: expected `"saving"`, received `"pending"`. React 19 state scheduling issue.
- `src/__tests__/appointments/ClientSearchSelect.test.tsx > debounces and searches after 2+ chars` — crashes deep in react-dom 19 `updateFunctionComponent` during debounce timer fire. Likely React 19 + testing-library 16 interaction.
- Both fail consistently in the extracted repo AND in the monorepo state (verified with a fresh clean install). These are **pre-existing bugs** that need investigation, not a regression from the split.

**steady-web `tsconfig.tsbuildinfo` committed by accident** (cosmetic)
- TypeScript incremental build cache leaked into the v0.1.0 commit because `.gitignore` didn't cover `*.tsbuildinfo`. Harmless (~KB cache file) but should be cleaned up in a follow-up commit on `steady-web/main` plus an `.gitignore` update.

### Dev-only fixes not yet in steady-api

Phase 2 extracted from the monorepo's `main` branch. The following fixes live on `jknack0/steady/dev` but **not** on `main`, so they're **not in `steady-api@v0.1.0`** and must be replayed before Phase 5 cutover:

- `1581284` — fix(api): register `send-portal-invite-email` queue in pg-boss
- `6cb6406` — fix(portal-invitations+config): clinician-as-client invite guard + config route loosening for invited-but-not-enrolled clients
- `c177ac9` — fix(session-summary): atomic claim to dedupe `summarize-transcript` jobs (prevents duplicate Sonnet calls)

Two options:

**Option A — merge `dev` → `main` in the monorepo, re-run Phase 2, force-push `steady-api/main`.** Preserves the original commits' history/SHA provenance but requires a force-push to a live remote. Cleaner audit trail.

**Option B — cherry-pick the 3 commits onto `steady-api/main` as fresh commits.** Non-destructive, simpler, but the commits get new SHAs (original commit refs from PRs/issues/memory files become stale).

**Recommendation:** Option A, as part of Phase 5 when we're already going to re-extract for the final cutover snapshot.

## Phase 0 — what's being done (this PR)

1. ✅ Delete phantom `@steady/db` dep from `apps/web/package.json` (0 real imports, was dead weight)
2. ✅ Add `.nvmrc` at root and in each workspace (`22` everywhere — API hard-requires Node 22 per `expo-server-sdk` ESM constraint; consistency > fragmentation)
3. ✅ Create this tracking doc
4. ⏳ Freeze CI on `dev` branch for new features during split (communication, not code)

Phase 0 is **fully reversible** and introduces zero risk. It lands on `dev` as a normal commit.

## Auth seams to set up in later phases

### GitHub Actions CI (Phase 2+)
Consumer repos (`steady-api`, `steady-web`) will have GitHub Actions that run `npm ci`, which clones `steady-shared` via git URL. The default `GITHUB_TOKEN` can't access sibling private repos, so each consumer needs **one** of:

- **SSH deploy key** on `steady-shared` (read-only) added to the consumer's Actions secrets as `SSH_PRIVATE_KEY`. Simplest, per-repo. One-time setup.
- **PAT (fine-grained)** with read access to `steady-shared`, stored as `NPM_GITHUB_TOKEN` in consumer secrets.
- **GitHub App** installed on the org with read access to private repos — cleanest long-term.

Recommendation: **SSH deploy key** for initial setup, revisit GitHub App if we add more consumers.

### Production EC2 (Phase 2+)
`prod-api` and `dev-api` run `npm ci` on deploy, which clones `steady-shared`. Need a deploy key on each EC2 box's `~/.ssh/id_ed25519` with the corresponding pub key registered on `steady-shared`. One-time per EC2.

### OIDC role trust policy (Phase 2+)
The existing `SteadyGitHubOIDCRole` currently allows only `repo:jknack0/steady:*` via the `sub` claim. Needs to be widened to allow the new repo names under the `Steady-Mental-Health` org:

```json
"token.actions.githubusercontent.com:sub": [
  "repo:Steady-Mental-Health/steady-api:ref:refs/heads/main",
  "repo:Steady-Mental-Health/steady-web:ref:refs/heads/main",
  "repo:Steady-Mental-Health/steady-mobile:ref:refs/heads/main"
]
```

Or use `StringLike` with `repo:Steady-Mental-Health/steady-*:*` to cover all variants at once.

**Note:** moving the deploy identity from `jknack0/steady` to `Steady-Mental-Health/steady-*` changes the `sub` claim entirely — the old `jknack0/steady` entry can be removed from the trust policy once dual-run cutover completes in Phase 5.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Schema drift between web and api after a shared bump | `steady shared bump` CLI command automates the 3-step flow; CI check in consumers fails if they reference a removed schema field |
| CI breaks on day 1 because OIDC trust policy doesn't include new repo names | Phase 0 task: update trust policy proactively before Phase 2 |
| Developer edits `@steady/shared` locally but forgets to `npm link`, sees no effect | `steady doctor` checks for linked deps and warns; `npm run dev` can preflight-warn if shared is unlinked |
| Metro EACCES still happens post-split (not a monorepo issue after all) | Phase 4 validates this explicitly. If it reproduces, root cause was Windows/WSL install mixing, solved by always running `npm install` from the same shell per-repo |
| Missed `@steady/db` imports during internalization | Codemod + CI typecheck gate; 123 imports is finite and greppable |
| Hotfix to shared during an incident now requires 3 merges | `steady shared bump` collapses it; emergency path is direct git push to shared + consumer bumps in parallel |

## What we keep from the current monorepo

- Prisma schema and migrations (move into `steady-api/src/db/`)
- Test fixtures and the `railway_test_db/` local test DB setup (move into `steady-api/`)
- All HIPAA compliance setup (audit middleware, encryption middleware, logger — move into `steady-api/`)
- AWS infra: EC2 boxes, RDS, Amplify, Bedrock, ALB, WAF — unchanged, just point at new repos for deploys
- GitHub OIDC federation for CI deploys — reused, trust policy widened
- Memory files in `~/.claude/projects/c--Dev-steady/memory/` — updated in Phase 6 to point at new repo paths

## What we explicitly do NOT do

- Publish `@steady/shared` to any registry (npm.js, GitHub Packages, Verdaccio)
- Use Changesets or semver version bumping as the source of truth — git tags are the version
- Split `@steady/db` into its own repo — it folds into `steady-api` as an internal folder
- Force mobile to depend on `@steady/shared` — the 4 imports are inlined into mobile
- Migrate to pnpm or any other package manager — stays npm to minimize change surface

## Local directory layout

After the split, everything Steady lives in two top-level folders:

```
c:/Dev/
├── steady/                       ← monorepo, archived after Phase 5
└── steady-workspace/
    ├── .git/                     ← workspace repo's own git
    ├── bin/steady                ← CLI entrypoint
    ├── src/                      ← CLI source
    ├── manifest.json             ← declares repos/, services, links
    ├── package.json              ← workspace CLI package
    ├── .gitignore                ← contains "repos/"
    ├── .code-workspace           ← VS Code multi-root config
    ├── README.md
    └── repos/                    ← populated by `steady init`
        ├── steady-shared/
        ├── steady-api/
        ├── steady-web/
        └── steady-mobile/
```

Workspace tooling lives at the workspace root. Cloned consumer repos live under `repos/` and are git-ignored from the workspace's own history. `steady init` runs `git clone` for each manifest entry into `repos/<name>/`, then `npm install` in each, then wires `npm link` for `@steady/shared` consumers.

During the split itself, Phase 1 runs `git filter-repo` in a scratch temp directory and pushes directly to the new remote — `steady-workspace/` doesn't exist yet, so nothing lands in `repos/` until Phase 1.5 creates the workspace and its `steady init` command runs.

## Freeze during split

While Phases 1–5 are in progress, avoid:
- Adding new `@steady/shared` imports from mobile (would break the inline strategy)
- Restructuring `packages/db/` (it's about to move into `steady-api/src/db/`)
- Large schema changes (harder to coordinate mid-split)

Existing feature work on isolated files is fine.
