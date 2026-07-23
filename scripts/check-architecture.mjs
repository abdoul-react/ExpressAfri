#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
// Exemption: UI components that render @/data types directly (type-only usage, no business logic).
const allowlist = new Set([
  "app/(tabs)/store.tsx",
  "src/features/home/BannerCarousel.tsx",
  "src/features/home/HomeHeader.tsx",
  "src/features/home/PromoModal.tsx",
  "src/features/home/ShortcutRail.tsx",
]);

// Exemption: Auth screens that call auth service functions directly (the auth "hook" is
// the screen itself — there's no intermediate useAuth hook because auth is all side-effect).
const allowlistServiceScreens = new Set([
  "app/(tabs)/index.tsx",
  "app/auth/login.tsx",
  "app/auth/otp.tsx",
  "app/auth/forgot-password.tsx",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const targets = [
  ...walk(path.join(repoRoot, "app")),
  ...walk(path.join(repoRoot, "src", "features")),
];

const violations = [];

function isScreen(file) {
  return file.startsWith(path.join(repoRoot, "app"));
}

function isFeatureHook(file) {
  return /src[\\/]features[\\/].*[\\/]use.*\.(ts|tsx)$/.test(file);
}

function getFeatureDomain(file) {
  const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
  const match = rel.match(/^src\/features\/([^\/]+)/);
  return match ? match[1] : null;
}

for (const file of targets) {
  const relPath = path.relative(repoRoot, file).replace(/\\/g, "/");
  if (allowlist.has(relPath)) continue;

  const contents = readFileSync(file, "utf8");
  const directDataImport = /from ['"]@\/data(?:\/|['"])/.test(contents);
  if (directDataImport) {
    violations.push(`${relPath} — direct @/data import`);
  }

  if (isScreen(file) && !allowlistServiceScreens.has(relPath)) {
    const directServiceImport = /from ['"]@\/services(?:\/|['"])/.test(
      contents,
    );
    if (directServiceImport) {
      violations.push(`${relPath} — direct @/services import from screen`);
    }
  }

  if (isFeatureHook(file)) {
    const domain = getFeatureDomain(file);
    if (domain) {
      const hookImport = /from ['"]@\/features\/([^\/]+)\/use[^'"\n]*['"]/.exec(
        contents,
      );
      if (hookImport) {
        const importedDomain = hookImport[1];
        if (importedDomain !== domain) {
          violations.push(
            `${relPath} — hook imports hook from another domain: ${importedDomain}`,
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture violations detected:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Architecture check passed.");
