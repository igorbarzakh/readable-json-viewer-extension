import { test, expect } from './fixture.js';

const SAMPLE = { value: 42 };

const isMac = process.platform === 'darwin';

test('theme toggle switches between light and dark', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);

  const html = page.locator('html');
  const themeBefore = await html.getAttribute('data-theme');

  await page.locator('#toggle-theme').click();

  const themeAfter = await html.getAttribute('data-theme');
  expect(themeAfter).not.toBe(themeBefore);
});

test('Cmd/Ctrl+Alt+T shortcut toggles theme', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  const html = page.locator('html');
  const themeBefore = await html.getAttribute('data-theme');

  await page.keyboard.press(isMac ? 'Meta+Alt+t' : 'Control+Alt+t');

  const themeAfter = await html.getAttribute('data-theme');
  expect(themeAfter).not.toBe(themeBefore);
});

test('toggle-theme button title contains keyboard shortcut', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  const title = await page.locator('#toggle-theme').getAttribute('title');
  expect(title).toMatch(isMac ? /⌘.*⌥.*T/i : /Ctrl.*Alt.*T/i);
});

test('dark theme applies dark class/attribute', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  const html = page.locator('html');

  // Click until we reach dark
  for (let i = 0; i < 3; i++) {
    const theme = await html.getAttribute('data-theme');
    if (theme === 'dark') break;
    await page.locator('#toggle-theme').click();
  }

  await expect(html).toHaveAttribute('data-theme', 'dark');
});
