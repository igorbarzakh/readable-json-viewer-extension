import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { build, transform } from "esbuild";

const DIST_DIR = "dist";
const DIST_SRC_DIR = `${DIST_DIR}/src`;

async function buildContentScript() {
  await build({
    entryPoints: ["src/content-script.js"],
    outfile: `${DIST_SRC_DIR}/content-script.js`,
    bundle: false,
    minify: true,
    target: ["chrome114"],
    legalComments: "none",
  });
}

async function buildStyles() {
  const css = await readFile("src/styles.css", "utf8");
  const transformed = await transform(css, {
    loader: "css",
    minify: true,
    legalComments: "none",
  });
  await writeFile(`${DIST_SRC_DIR}/styles.css`, transformed.code, "utf8");
}

async function run() {
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_SRC_DIR, { recursive: true });
  await Promise.all([buildContentScript(), buildStyles()]);
  await copyFile("manifest.json", `${DIST_DIR}/manifest.json`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
