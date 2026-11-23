// Renders the PNG app icons from inline SVG. Run: node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const leaf = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-32 -32)" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 47c0-19 12.5-29.5 31-29.5 0 19-10.5 31.5-29 31.5"/><path d="M17 47c6-8 12.5-12.5 21-16.5"/>
  </g>`;
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F8A6B"/><stop offset="1" stop-color="#136650"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/>`;
const icons = {
  'icon-512.png': [512, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${leaf(6.4)}</svg>`],
  'icon-192.png': [192, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${leaf(6.4)}</svg>`],
  'icon-maskable-512.png': [512, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${leaf(4.6)}</svg>`],
  'apple-touch-icon.png': [180, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${leaf(5.6)}</svg>`],
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, [size, svg]] of Object.entries(icons)) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(`public/icons/${name}`, await page.screenshot({ omitBackground: false }));
}
await browser.close();
console.log('icons written');
