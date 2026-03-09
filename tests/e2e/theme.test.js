import { test, expect } from './fixture.js';

const SAMPLE = { value: 42 };

test('theme toggle switches between light and dark', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);

  const html = page.locator('html');
  const themeBefore = await html.getAttribute('data-theme');

  await page.locator('#toggle-theme').click();

  const themeAfter = await html.getAttribute('data-theme');
  expect(themeAfter).not.toBe(themeBefore);
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
