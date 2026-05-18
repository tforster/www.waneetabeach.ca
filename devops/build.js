/**
 * build.js — Root build orchestrator
 *
 * 1. Optimises source images (PNG → WebP + compressed JPEG, responsive sizes)
 * 2. Runs the Gilbert static site compiler (workspaces/app)
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC_FILES = "workspaces/app/src/files";
const DIST_FILES = "workspaces/app/dist/files";

// Responsive widths to generate for hero images
const HERO_WIDTHS = [1200, 800, 400];

const heroImages = [{ src: "waneeta-beach-entrance-signx800.jpg", alt: "entrance-sign" }];

async function optimiseImages() {
  if (!existsSync(DIST_FILES)) mkdirSync(DIST_FILES, { recursive: true });

  for (const { src, alt } of heroImages) {
    const srcPath = join(SRC_FILES, src);

    for (const width of HERO_WIDTHS) {
      // WebP — primary format, best compression
      await sharp(srcPath)
        .resize(width)
        .webp({ quality: 82 })
        .toFile(join(DIST_FILES, `${alt}-${width}.webp`));

      // JPEG — fallback for older browsers
      await sharp(srcPath)
        .resize(width)
        .jpeg({ quality: 82, progressive: true })
        .toFile(join(DIST_FILES, `${alt}-${width}.jpg`));
    }

    console.log(`  ✓ ${src} → ${HERO_WIDTHS.join("w, ")}w (WebP + JPEG)`);
  }
}

async function build() {
  console.log("Building waneetabeach.ca…\n");

  console.log("Optimising images…");
  await optimiseImages();

  console.log("\nCompiling static site (Gilbert)…");
  execSync("node devops/build.js", { stdio: "inherit", cwd: "workspaces/app" });

  console.log("\nDone.");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
