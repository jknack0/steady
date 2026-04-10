// ⚠️  IMPORTANT: This file must be the VERY FIRST import in src/index.ts.
//
// The file exists solely to load the monorepo root `.env` before any
// other module is imported. `src/lib/env.ts` snapshots `process.env.*`
// at module-load time via `export const X = process.env.Y || ""`, so
// if those env vars aren't set before `env.ts` loads, they become
// permanently empty — no amount of later `dotenv.config()` helps.
//
// TypeScript hoists all `import` statements to the top of the emitted
// CJS file, but it preserves their source order. Importing this file
// first guarantees dotenv runs before any other import evaluates.

import { config as loadDotenv } from "dotenv";
import { resolve } from "path";

// Resolve the monorepo root .env relative to this source file.
// From packages/api/src/lib/bootstrap-env.ts:
//   ../../..     → packages/api
//   ../../../..  → packages
//   ../../../../ → monorepo root
loadDotenv({ path: resolve(__dirname, "../../../../.env") });

// Secondary: also pick up a package-local override if one exists.
// `override: false` means the root .env wins if both define the same key.
loadDotenv({ path: resolve(__dirname, "../../.env"), override: false });
