import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';

const DIST_DIR = 'dist';
const DIST_SRC_DIR = `${DIST_DIR}/src`;

async function buildContentScript() {
  await build({
    entryPoints: ['src/content-script.js'],
    outfile: `${DIST_SRC_DIR}/content-script.js`,
    bundle: false,
    minify: true,
    target: ['chrome114'],
    legalComments: 'none',
  });
}

async function buildStyles() {
  const css = await readFile('src/styles.css', 'utf8');
  const transformed = await transform(css, {
    loader: 'css',
    minify: true,
    legalComments: 'none',
  });
  await writeFile(`${DIST_SRC_DIR}/styles.css`, transformed.code, 'utf8');
}

async function run() {
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_SRC_DIR, { recursive: true });
  await Promise.all([buildContentScript(), buildStyles()]);
  await copyFile('manifest.json', `${DIST_DIR}/manifest.json`);
  await mkdir(`${DIST_DIR}/icons`, { recursive: true });
  await Promise.all([
    copyFile('icons/icon-16.png', `${DIST_DIR}/icons/icon-16.png`),
    copyFile('icons/icon-32.png', `${DIST_DIR}/icons/icon-32.png`),
    copyFile('icons/icon-48.png', `${DIST_DIR}/icons/icon-48.png`),
    copyFile('icons/icon-128.png', `${DIST_DIR}/icons/icon-128.png`),
    copyFile('icons/dark-mode.svg', `${DIST_DIR}/icons/dark-mode.svg`),
    copyFile('icons/light-mode.svg', `${DIST_DIR}/icons/light-mode.svg`),
  ]);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
