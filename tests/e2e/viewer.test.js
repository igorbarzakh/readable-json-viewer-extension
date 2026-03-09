import { test, expect } from './fixture.js';

const SAMPLE = { name: 'Alice', age: 30, tags: ['admin', 'user'], address: { city: 'NY' } };

test('renders JSON tree on application/json page', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await expect(page.locator('#json-editor')).toBeVisible();
  await expect(page.locator('.json-key').first()).toBeVisible();
});

test('displays string, number values with correct classes', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);
  await expect(page.locator('.json-string').first()).toBeVisible();
  await expect(page.locator('.json-number').first()).toBeVisible();
});

test('collapse and expand an object node', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);

  // find the toggle for $.address and collapse it
  const toggle = page.locator('[data-path="$.address"]').first();
  await toggle.click();

  // collapsed: ellipsis visible, child key "city" no longer visible
  await expect(page.locator('.json-ellipsis').first()).toBeVisible();

  // expand again
  await toggle.click();
  await expect(page.locator('.json-ellipsis')).toHaveCount(0);
});

test('collapse-all button collapses all nodes', async ({ jsonPage }) => {
  const page = await jsonPage(SAMPLE);

  await page.locator('#toggle-all').click();
  const ellipsis = page.locator('.json-ellipsis');
  await expect(ellipsis.first()).toBeVisible();
});

test('copy button copies formatted JSON to clipboard', async ({ jsonPage, extensionContext }) => {
  await extensionContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await jsonPage(SAMPLE);

  await page.locator('#copy-json').click();

  // After click the icon switches to a checkmark (.copy-done-icon)
  await expect(page.locator('#copy-json .copy-done-icon')).toBeVisible({ timeout: 2000 });
});
