import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function run() {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const zipName = `readable-json-viewer-extension-v${pkg.version}.zip`;
  await mkdir("artifacts", { recursive: true });
  await rm(`artifacts/${zipName}`, { force: true });

  await runCommand("npx", ["bestzip", `artifacts/${zipName}`, "dist/*"]);
  console.log(`Created artifacts/${zipName}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
