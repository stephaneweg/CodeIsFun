// shots.js -- screenshots of the pages at a desktop's and a phone's sizes, and the console's errors
//   node tools/shots.js <out-dir> [page ...]   (pages: home turtle circuits; needs Playwright)
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
let pw; try { pw = require ('playwright'); } catch (e) { pw = require (path.join (process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const root = path.join (__dirname, '..');
const out = process.argv[2] || '.';
const pages = process.argv.length > 3 ? process.argv.slice (3) : ['home', 'turtle', 'circuits'];
const url = (p) => 'file://' + path.join (root, p === 'home' ? 'index.html' : p + '/index.html');
(async () =>
{
	const browser = await pw.chromium.launch ();
	for (const [name, vp, mobile] of [['desktop', { width: 1366, height: 820 }, false], ['phone', { width: 390, height: 844 }, true]])
		for (const lang of ['en', 'fr'])
			for (const p of pages)
			{
				const ctx = await browser.newContext ({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
				const page = await ctx.newPage ();
				page.on ('console', (m) => { if (m.type () === 'error') console.log (p, name, 'console:', m.text ()); });
				page.on ('pageerror', (e) => console.log (p, name, 'error:', e.message));
				await page.goto (url (p) + '?lang=' + lang);
				await page.waitForTimeout (400);
				await page.keyboard.press ('Escape');
				const f = path.join (out, p + '-' + name + '-' + lang + '.png');
				await page.screenshot ({ path: f, fullPage: mobile });
				console.log (f);
				await ctx.close ();
			}
	await browser.close ();
}) ();
