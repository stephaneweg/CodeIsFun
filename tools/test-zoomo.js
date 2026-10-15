// test-zoomo.js -- Zoomo! in a browser (Playwright): the four circuits are well formed; the player's craft, flying
// itself, finishes three laps on each and the results come (stars kept, the next circuit opened); the items; the
// keyboard and a finger steer; the screens; no console error; screenshots
//   node tools/test-zoomo.js [out-dir]     (phone portrait and landscape, desktop; EN and FR)
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
let pw; try { pw = require ('playwright'); } catch (e) { pw = require (path.join (process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const root = path.join (__dirname, '..');
const out = process.argv[2];
const url = 'file://' + path.join (root, 'race/index.html');
let fails = 0;
const ok = (c, m) => { console.log ((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () =>
{
	const browser = await pw.chromium.launch ();
	const shot = async (page, name) => { if (out) await page.screenshot ({ path: path.join (out, 'zoomo-' + name + '.png') }); };
	// each circuit: built, then a whole race flown by the autopilot (the simulation run by hand: minutes in seconds)
	{
		const ctx = await browser.newContext ({ viewport: { width: 900, height: 600 } });
		const page = await ctx.newPage ();
		const errs = []; page.on ('pageerror', (e) => errs.push (e.message));
		for (let ti = 1; ti <= 4; ti++)
		{
			await page.goto (url + '?lang=en&auto&seed=' + (3 + ti) + '&track=' + ti); await page.waitForTimeout (150);
			const tr = await page.evaluate (() =>
			{
				const L = Zoomo.TR; let bad = 0, deco = 0, pads = 0, boxes = 0;
				for (let i = 0; i < 480; i++) { if (!isFinite (L.px[i] + L.py[i] + L.pz[i] + L.rx[i] + L.uy[i])) bad++; deco += L.deco[i].length; if (L.kind[i] & 2) pads++; if (L.kind[i] & 4) boxes++; }
				return { bad, deco, pads, boxes, len: Math.round (L.tlen) };
			});
			ok (!tr.bad && tr.deco > 40 && tr.pads > 2 && tr.boxes >= 2, 'circuit ' + ti + ' is well formed ' + JSON.stringify (tr));
			const r = await page.evaluate (() =>
			{
				let used = 0;
				for (let k = 0; k < 400 && Zoomo.screen === 'play'; k++) { Zoomo.step (120); if (Zoomo.G.me.item) { Zoomo.useItem (Zoomo.G.me); used++; } Zoomo.draw (); }
				return { screen: Zoomo.screen, laps: Zoomo.G.me.lap, t: Math.round (Zoomo.G.raceT), place: Zoomo.G.me.place, used, stars: Zoomo.prog.stars.slice (), unlocked: Zoomo.prog.unlocked };
			});
			ok (r.screen === 'results' && r.stars[ti - 1] >= 1 && r.used > 0, 'the autopilot finishes circuit ' + ti + ' ' + JSON.stringify (r));
		}
		ok (!errs.length, 'no error while racing ' + errs.join (' | '));
		await ctx.close ();
	}
	// the screens, the controls, at three sizes
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
			await page.goto (url + '?lang=' + lang + '&seed=5');
			await page.waitForTimeout (1200);
			await shot (page, tag + '-title');
			await page.click ('#btPlay'); await page.waitForTimeout (500);
			await shot (page, tag + '-select');
			ok (await page.locator ('#pilots .pilot').count () === 6 && await page.locator ('#tracks .tile').count () === 4, tag + ': six pilots, four circuits');
			await page.click ('#pilots .pilot:nth-child(6)'); await page.waitForTimeout (100);
			ok (await page.evaluate (() => Zoomo.prog.pilot) === 5, tag + ': a pilot picked');
			await page.click ('#tracks .tile:first-child'); await page.waitForTimeout (300);
			ok (await page.evaluate (() => Zoomo.screen === 'play' && Zoomo.G.ships[0].pilot === 5), tag + ': the race starts with Drako');
			await page.evaluate (() => Zoomo.step (120 * 5));
			// steering: the keyboard (or a finger held on the right half)
			const lx0 = await page.evaluate (() => Zoomo.G.me.lx);
			if (mobile)
			{
				const cdp = await ctx.newCDPSession (page);
				await cdp.send ('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vp.width * 0.85, y: vp.height * 0.6 }] });
				await page.evaluate (() => Zoomo.step (120));
				await cdp.send ('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
			}
			else { await page.keyboard.down ('ArrowRight'); await page.evaluate (() => Zoomo.step (120)); await page.keyboard.up ('ArrowRight'); }
			const lx1 = await page.evaluate (() => Zoomo.G.me.lx);
			ok (lx1 > lx0 + 0.5, tag + ': steering to the right (' + lx0.toFixed (2) + ' -> ' + lx1.toFixed (2) + ')');
			await page.evaluate (() => { Zoomo.G.me.item = 'turbo'; });
			await page.waitForTimeout (100);
			await shot (page, tag + '-race');
			await page.click ('#btPause'); await page.waitForTimeout (400);
			ok (await page.evaluate (() => Zoomo.screen) === 'pause', tag + ': paused');
			await shot (page, tag + '-pause');
			await page.click ('#btResume'); await page.waitForTimeout (100);
			// the results
			await page.evaluate (() => { for (let k = 0; k < 400 && Zoomo.screen === 'play'; k++) { Zoomo.G.auto = true; Zoomo.step (120); } });
			await page.waitForTimeout (1200);
			ok (await page.evaluate (() => Zoomo.screen) === 'results', tag + ': the results');
			await shot (page, tag + '-results');
			await page.goto (url + '?lang=' + lang); await page.waitForTimeout (300);
			await page.click ('#btHow'); await page.waitForTimeout (400);
			await shot (page, tag + '-how');
			ok (await page.locator ('#legendItems li').count () === 4, tag + ': the four items explained');
			ok (!errs.length, tag + ': no error ' + errs.join (' | '));
			await ctx.close ();
		}
	await browser.close ();
	console.log (fails ? fails + ' failure(s)' : 'all right');
	process.exit (fails ? 1 : 0);
}) ();
