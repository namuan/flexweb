import { expect, test } from '@playwright/test';

test('sample page can receive a FlexWeb-style CSS modification', async ({ page }) => {
  await page.setContent('<main><article><h1>Sample</h1><p id="story">Readable text</p></article></main>');
  await page.addStyleTag({ content: '#story { font-size: 22px; line-height: 1.8; }' });

  await expect(page.locator('#story')).toHaveCSS('font-size', '22px');
  await expect(page.locator('#story')).toHaveCSS('line-height', '39.6px');
});
