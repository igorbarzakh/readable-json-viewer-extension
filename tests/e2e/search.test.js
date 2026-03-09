import { test, expect } from './fixture.js';

const SAMPLE = { name: 'Alice', role: 'admin', city: 'New York' };

async function openSearch(page) {
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(isMac ? 'Meta+f' : 'Control+f');
  await page.waitForSelector('#json-search-bar:not([hidden])', { timeout: 3000 });
}

test('Cmd/Ctrl+F opens search bar', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await expect(page.locator('#json-search-bar')).toBeVisible();
});

test('search highlights matching lines', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await page.locator('#json-search-input').fill('Alice');
  await expect(page.locator('mark.json-search-hl-current')).toBeVisible();
});

test('shows match count in status', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await page.locator('#json-search-input').fill('a');
  await expect(page.locator('#json-search-status')).toContainText(/\d+ \/ \d+/);
});

test('next/prev buttons navigate between matches', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await page.locator('#json-search-input').fill('a');

  const statusBefore = await page.locator('#json-search-status').textContent();
  await page.locator('#json-search-next').click();
  const statusAfter = await page.locator('#json-search-status').textContent();
  expect(statusBefore).not.toBe(statusAfter);
});

test('close button hides search bar and clears input', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await page.locator('#json-search-input').fill('Alice');

  await page.locator('#json-search-close').click();

  await expect(page.locator('#json-search-bar')).toBeHidden();
  const value = await page.locator('#json-search-input').inputValue();
  expect(value).toBe('');
});

test('Escape closes search bar and clears input', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await page.locator('#json-search-input').fill('York');

  await page.keyboard.press('Escape');

  await expect(page.locator('#json-search-bar')).toBeHidden();
  const value = await page.locator('#json-search-input').inputValue();
  expect(value).toBe('');
});

test('no results shows "No results" status', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await openSearch(page);
  await page.locator('#json-search-input').fill('xyznotfound');
  await expect(page.locator('#json-search-status')).toHaveText('No results');
});
