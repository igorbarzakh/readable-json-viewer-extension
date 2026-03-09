import { test as base, chromium } from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

function startJsonServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const json = url.searchParams.get('data') ?? '{}';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(json);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

export const test = base.extend({
  extensionContext: [async ({}, use) => {
    const ctx = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(ctx);
    await ctx.close();
  }, { scope: 'worker' }],

  jsonServer: [async ({}, use) => {
    const server = await startJsonServer();
    const { port } = server.address();
    await use({ port });
    server.close();
  }, { scope: 'worker' }],

  jsonPage: async ({ extensionContext, jsonServer }, use) => {
    const opened = [];
    async function openJson(json) {
      const encoded = encodeURIComponent(JSON.stringify(json));
      const url = `http://127.0.0.1:${jsonServer.port}/?data=${encoded}`;
      const page = await extensionContext.newPage();
      opened.push(page);
      await page.goto(url);
      await page.waitForSelector('#json-editor', { timeout: 8000 });
      return page;
    }
    await use(openJson);
    for (const page of opened) await page.close().catch(() => {});
  },
});

export { expect } from '@playwright/test';
