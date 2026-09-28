#!/usr/bin/env node
/**
 * Cursor Project Agent Store (fuse.agent-store) cannot host node_modules:
 * - symlinks are EPERM
 * - package manager temp→final renames/copies often ENOSYS / EAGAIN
 *
 * This helper syncs the repo to a normal filesystem worktree and runs pnpm there.
 * On a normal clone (macOS/Linux home disk), it is a no-op passthrough.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const POINTER = path.join(REPO_ROOT, ".work-root");

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".vite",
  "coverage",
  ".turbo",
  ".work-root",
]);

function canSymlink(dir) {
  const a = path.join(dir, `.spraket-symlink-test-${process.pid}`);
  try {
    symlinkSync(dir, a);
    unlinkSync(a);
    return true;
  } catch {
    try {
      unlinkSync(a);
    } catch {
      /* ignore */
    }
    return false;
  }
}

function isAgentStorePath(p) {
  const norm = p.replace(/\\/g, "/");
  return (
    norm.includes("/cursor/stores/") ||
    norm.includes("/.cursor/stores/")
  );
}

function needsExternalWorktree(root = REPO_ROOT) {
  if (process.env.SPRAKET_FORCE_WORKTREE === "1") return true;
  if (process.env.SPRAKET_FORCE_LOCAL === "1") return false;
  if (isAgentStorePath(root)) return true;
  return !canSymlink(root);
}

function defaultWorkRoot() {
  if (process.env.SPRAKET_WORK_ROOT) {
    return path.resolve(process.env.SPRAKET_WORK_ROOT);
  }
  // Prefer home cache; fall back to /tmp when home is unavailable.
  const home = os.homedir();
  if (home && home !== "/" && existsSync(home)) {
    return path.join(home, ".cache", "spraket-web");
  }
  return path.join(os.tmpdir(), "spraket-web-work");
}

function readPointer() {
  if (!existsSync(POINTER)) return null;
  const target = readFileSync(POINTER, "utf8").trim();
  if (!target) return null;
  if (!existsSync(path.join(target, "package.json"))) return null;
  return target;
}

function syncTo(dest) {
  mkdirSync(dest, { recursive: true });
  // Clean install artifacts in dest that should refresh from source
  for (const name of [
    "apps",
    "packages",
    "scripts",
    ".github",
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    ".npmrc",
    ".gitignore",
    ".node-version",
    "README.md",
    "vercel.json",
    "wrangler.toml",
  ]) {
    const from = path.join(REPO_ROOT, name);
    const to = path.join(dest, name);
    if (!existsSync(from)) continue;
    const st = statSync(from);
    if (st.isDirectory()) {
      rmSync(to, { recursive: true, force: true });
      cpSync(from, to, {
        recursive: true,
        filter: (src) => {
          const rel = path.relative(from, src);
          if (!rel || rel === ".") return true;
          const parts = rel.split(path.sep);
          if (parts.some((p) => EXCLUDE_DIRS.has(p))) return false;
          return true;
        },
      });
    } else {
      copyFileSync(from, to);
    }
  }
  // Ensure package.json scripts in worktree call pnpm directly (avoid recursion)
  const pkgPath = path.join(dest, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.scripts = {
    bootstrap: "pnpm install",
    "install:app": "pnpm install",
    dev: "pnpm --filter @spraket/web dev",
    build: "pnpm -r build",
    "build:web": "pnpm --filter @spraket/web build",
    test: "pnpm --filter @spraket/core test",
    typecheck: "pnpm -r typecheck",
    "worktree:info": "node -e \"console.log(process.cwd())\"",
    doctor: "node -e \"console.log(process.cwd())\"",
    deploy: "node scripts/deploy.mjs cloudflare",
    "deploy:cloudflare": "node scripts/deploy.mjs cloudflare",
    "deploy:vercel": "node scripts/deploy.mjs vercel",
  };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(POINTER, `${dest}\n`);
  writeFileSync(path.join(dest, ".spraket-worktree"), `${REPO_ROOT}\n`);
  return dest;
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function ensurePnpm() {
  const check = spawnSync("pnpm", ["-v"], { encoding: "utf8" });
  if (check.status === 0) return "pnpm";
  // Corepack (Node 20+) can enable the pinned packageManager
  const corepack = spawnSync(
    "corepack",
    ["enable"],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (corepack.status === 0) {
    const again = spawnSync("pnpm", ["-v"], { encoding: "utf8" });
    if (again.status === 0) return "pnpm";
  }
  console.error(`
pnpm is required (packageManager: pnpm@9.15.0).

  corepack enable
  corepack prepare pnpm@9.15.0 --activate

Or: npm install -g pnpm@9
`);
  process.exit(1);
}

function resolveRoot() {
  if (!needsExternalWorktree()) return REPO_ROOT;
  return readPointer() ?? defaultWorkRoot();
}

function printFsHelp() {
  console.error(`
Språket install cannot use node_modules in this directory.

Detected: Cursor Project store / FUSE path without symlink support
  ${REPO_ROOT}

Package managers need rename + symlinks; fuse.agent-store returns
EPERM/ENOSYS/EAGAIN. Use the bootstrap worktree on a normal disk:

  pnpm run bootstrap

That syncs to:
  ${defaultWorkRoot()}
(override with SPRAKET_WORK_ROOT=/path)

Then:

  pnpm test
  pnpm build
  pnpm dev

On a normal clone (macOS/Linux home folder), plain \`pnpm install\` works.
`);
}

const [command, ...rest] = process.argv.slice(2);

if (!command || command === "help") {
  console.log(`Usage:
  node scripts/worktree.mjs bootstrap   # sync + pnpm install (always use on Agent Store)
  node scripts/worktree.mjs install     # alias for bootstrap when external worktree needed; else pnpm install
  node scripts/worktree.mjs run <script> [args...]
  node scripts/worktree.mjs info
`);
  process.exit(0);
}

if (command === "info") {
  console.log(
    JSON.stringify(
      {
        repoRoot: REPO_ROOT,
        needsExternalWorktree: needsExternalWorktree(),
        workRoot: resolveRoot(),
        pointer: readPointer(),
        canSymlink: canSymlink(REPO_ROOT),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (command === "check-install") {
  if (needsExternalWorktree()) {
    printFsHelp();
    process.exit(1);
  }
  process.exit(0);
}

if (command === "bootstrap" || command === "install") {
  ensurePnpm();
  if (needsExternalWorktree()) {
    const dest = defaultWorkRoot();
    console.log(`Syncing Språket → ${dest}`);
    syncTo(dest);
    // Prefer hoisted linker in worktree for broader FS compatibility (e.g. some network volumes)
    const npmrc = path.join(dest, ".npmrc");
    if (!existsSync(npmrc)) {
      writeFileSync(npmrc, "node-linker=hoisted\n");
    }
    const code = run("pnpm", ["install", ...rest], dest);
    if (code === 0) {
      console.log(`
Install OK in worktree:
  ${dest}

From the store path you can now run:
  pnpm test
  pnpm build
  pnpm dev
`);
    }
    process.exit(code);
  }
  // Normal filesystem: install in place
  const code = run("pnpm", ["install", ...rest], REPO_ROOT);
  process.exit(code);
}

if (command === "run") {
  const script = rest[0];
  const scriptArgs = rest.slice(1);
  if (!script) {
    console.error("Missing script name");
    process.exit(1);
  }
  ensurePnpm();
  let cwd = REPO_ROOT;
  if (needsExternalWorktree()) {
    let dest = readPointer();
    if (!dest || !existsSync(path.join(dest, "node_modules"))) {
      console.log("Worktree missing or not installed — bootstrapping…");
      dest = defaultWorkRoot();
      syncTo(dest);
      const code = run("pnpm", ["install"], dest);
      if (code !== 0) process.exit(code);
    } else {
      // Refresh sources before run so store edits are picked up
      syncTo(dest);
    }
    cwd = dest;
  }
  process.exit(run("pnpm", ["run", script, ...scriptArgs], cwd));
}

console.error(`Unknown command: ${command}`);
process.exit(1);
