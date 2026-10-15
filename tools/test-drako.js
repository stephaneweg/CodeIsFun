// test-drako.js -- Drako! in a browser (Playwright): no console error; the AI wins village 1; screenshots
//   node tools/test-drako.js [out-dir]     (phone portrait and landscape, desktop; EN and FR)
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
let pw; try { pw = require ('playwright'); } catch (e) { pw = require (path.join (process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const root = path.join (__dirname, '..');
const out = process.argv[2];
const url = 'file://' + path.join (root, 'snake/index.html');
let fails = 0;
const ok = (c, m) => { console.log ((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () =>
{
	const browser = await pw.chromium.launch ();
	const shot = async (page, name) => { if (out) await page.screenshot ({ path: path.join (out, name + '.png') }); };
	const sizes = [['phone', { width: 390, height: 844 }, true], ['land', { width: 844, height: 390 }, true], ['desktop', { width: 1366, height: 820 }, false]];
	for (const [name, vp, mobile] of sizes)
		for (const lang of name === 'phone' ? ['en', 'fr'] : ['en'])
		{
			const ctx = await browser.newContext ({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
			const page = await ctx.newPage ();
			const errs = [];
			page.on ('pageerror', (e) => errs.push (e.message));
			page.on ('console', (m) => { if (m.type () === 'error') errs.push (m.text ()); });
			const tag = name + '-' + lang;
			await page.goto (url + '?lang=' + lang);
			await page.waitForTimeout (1500);
			await shot (page, tag + '-title');
			await page.click ('#btPlay'); await page.waitForTimeout (500);
			await shot (page, tag + '-levels');
			await page.goto (url + '?lang=' + lang); await page.waitForTimeout (300);
			await page.click ('#btHow'); await page.waitForTimeout (500);
			await shot (page, tag + '-how');
			// a level, waiting for the first swipe
			await page.goto (url + '?lang=' + lang + '&level=3'); await page.waitForTimeout (600);
			await shot (page, tag + '-start');
			// the AI plays village 1 to the end
			await page.goto (url + '?lang=' + lang + '&level=1&auto'); await page.waitForTimeout (200);
			let mid = false;
			for (let i = 0; i < 90; i++)
			{
				await page.waitForTimeout (500);
				const s = await page.evaluate (() => ({ st: Drako.G.state, coins: Drako.G.coins, sc: Drako.screen }));
				if (!mid && s.coins >= 6) { mid = true; await shot (page, tag + '-play'); }
				if (s.sc === 'win' || s.sc === 'over') { await page.waitForTimeout (1500); break; }
			}
			const end = await page.evaluate (() => ({ st: Drako.G.state, coins: Drako.G.coins, sc: Drako.screen, score: Drako.G.score }));
			await shot (page, tag + '-end');
			ok (end.sc === 'win', tag + ': the AI saves village 1 (' + JSON.stringify (end) + ')');
			// a swipe starts a game (phone) / an arrow (desktop)
			await page.goto (url + '?lang=' + lang + '&level=1'); await page.waitForTimeout (300);
			if (mobile)
			{
				const cx = vp.width / 2, cy = vp.height / 2;
				await page.evaluate (([x, y]) => {
					const ev = (t, X, Y) => window.dispatchEvent (new PointerEvent (t, { pointerId: 1, clientX: X, clientY: Y, bubbles: true }));
					ev ('pointerdown', x, y); ev ('pointermove', x - 30, y); ev ('pointermove', x - 60, y); ev ('pointerup', x - 60, y);
				}, [cx, cy]);
			}
			else await page.keyboard.press ('ArrowLeft');
			await page.waitForTimeout (700);
			const g = await page.evaluate (() => ({ w: Drako.G.waiting, dir: Drako.G.dir, x: Drako.G.snake[0].x }));
			ok (!g.w && g.dir === (vp.width > vp.height ? 3 : 3), tag + ': a swipe / an arrow starts and steers ' + JSON.stringify (g));
			// endless until death (no input: it hits the wall), the game over panel
			await page.goto (url + '?lang=' + lang + '&endless'); await page.waitForTimeout (200);
			await page.keyboard.press ('ArrowUp');
			if (mobile) await page.evaluate (() => Drako.turn (0));
			for (let i = 0; i < 30 && (await page.evaluate (() => Drako.screen)) !== 'over'; i++) await page.waitForTimeout (300);
			await page.waitForTimeout (500);
			await shot (page, tag + '-over');
			ok ((await page.evaluate (() => Drako.screen)) === 'over', tag + ': game over shows');
			ok (!errs.length, tag + ': no error ' + errs.join (' | '));
			await ctx.close ();
		}
	await browser.close ();
	console.log (fails ? fails + ' failure(s)' : 'all right');
	process.exit (fails ? 1 : 0);
}) ();
