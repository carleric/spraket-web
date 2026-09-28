#!/usr/bin/env node
/**
 * One-command free static deploy to Cloudflare Pages or Vercel.
 *
 * Prerequisites (once):
 *   - Node 20+, pnpm 9
 *   - GitHub remote optional for dashboard flow; CLI needs login:
 *       npx wrangler login          # Cloudflare
 *       npx vercel login            # Vercel
 *
 * Usage:
 *   node scripts/deploy.mjs cloudflare
 *   node scripts/deploy.mjs vercel
 *   pnpm run deploy:cloudflare
 *   pnpm run deploy:vercel
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const POINTER = path.join(REPO_ROOT, ".work-root");
const PROJECT = process.env.SPRAKET_CF_PROJECT || "spraket";

function resolveCwd() {
  if (existsSync(POINTER)) {
    const target = readFileSync(POINTER, "utf8").trim();
    if (target && existsSync(path.join(target, "package.json"))) {
      return target;
    }
  }
  return REPO_ROOT;
}

function run(cmd, args, cwd) {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function ensureBuild(cwd) {
  // Prefer root scripts so Agent Store worktree sync + build stay consistent.
  const rootBuild = run("pnpm", ["run", "build:web"], REPO_ROOT);
  if (rootBuild === 0) return;
  if (!existsSync(path.join(cwd, "node_modules"))) {
    const code = run("pnpm", ["install"], cwd);
    if (code !== 0) process.exit(code);
  }
  const code = run("pnpm", ["--filter", "@spraket/web", "build"], cwd);
  if (code !== 0) process.exit(code);
}

const target = (process.argv[2] || "").toLowerCase();
if (target !== "cloudflare" && target !== "vercel" && target !== "cf") {
  console.error(`Usage:
  node scripts/deploy.mjs cloudflare
  node scripts/deploy.mjs vercel

Dashboard (no CLI) is documented in README — connect the GitHub repo to
Cloudflare Pages or Vercel and use the build settings there.
`);
  process.exit(1);
}

const cwd = resolveCwd();
console.log(`Deploy cwd: ${cwd}`);
ensureBuild(cwd);

const dist = path.join(cwd, "apps/web/dist");
if (!existsSync(path.join(dist, "index.html"))) {
  console.error(`Build missing index.html at ${dist}`);
  process.exit(1);
}

if (target === "cloudflare" || target === "cf") {
  // Free Cloudflare Pages deploy; first run may prompt to create project.
  const code = run(
    "pnpm",
    [
      "dlx",
      "wrangler@4",
      "pages",
      "deploy",
      "apps/web/dist",
      "--project-name",
      PROJECT,
      "--commit-dirty=true",
    ],
    cwd,
  );
  if (code === 0) {
    console.log(`
Cloudflare Pages deploy finished.
Project: ${PROJECT}
Share the *.pages.dev URL from the output above with friends.
`);
  }
  process.exit(code);
}

// Vercel production deploy (free Hobby)
const code = run(
  "pnpm",
  ["dlx", "vercel@39", "deploy", "--prod", "--yes"],
  cwd,
);
if (code === 0) {
  console.log(`
Vercel deploy finished.
Share the *.vercel.app URL from the output above with friends.
`);
}
process.exit(code);
