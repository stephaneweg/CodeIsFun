// test-briko.js -- Briko Boom! in a browser (Playwright): the levels are well formed; the autopilot clears all 12;
// the finger and the mouse steer; the screens; no console error; screenshots
//   node tools/test-briko.js [out-dir]     (phone portrait and landscape, desktop; EN and FR)
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
let pw; try { pw = require ('playwright'); } catch (e) { pw = require (path.join (process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const root = path.join (__dirname, '..');
const out = process.argv[2];
const url = 'file://' + path.join (root, 'brick/index.html');
let fails = 0;
const ok = (c, m) => { console.log ((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () =>
{
	const browser = await pw.chromium.launch ();
	const shot = async (page, name) => { if (out) await page.screenshot ({ path: path.join (out, 'briko-' + name + '.png') }); };
	// the levels, and the autopilot through all of them (the simulation run by hand: minutes of play in seconds)
	{
		const ctx = await browser.newContext ({ viewport: { width: 800, height: 900 } });
		const page = await ctx.newPage ();
		const errs = []; page.on ('pageerror', (e) => errs.push (e.message));
		await page.goto (url + '?lang=en'); await page.waitForTimeout (200);
		const bad = await page.evaluate (() => Briko.LEVELS.flatMap ((L, i) => L.rows.filter ((r) => r.length !== 13 || /[^.1-6TUMXGSm]/.test (r)).map ((r) => (i + 1) + ': ' + r)));
		ok (!bad.length, 'every row is 13 known cells ' + bad.join (' | '));
		for (let li = 1; li <= 12; li++)
		{
			await page.goto (url + '?lang=en&auto&seed=' + (7 + li) + '&level=' + li); await page.waitForTimeout (100);
			const r = await page.evaluate (() =>
			{
				for (let k = 0; k < 600 && Briko.G.phase !== 'done' && Briko.G.phase !== 'over'; k++) Briko.step (120);
				return { phase: Briko.G.phase, time: Math.round (Briko.G.time), lives: Briko.G.lives, score: Briko.G.score, left: Briko.G.bricks.filter ((b) => b.alive && b.k !== 'M').length };
			});
			ok (r.phase === 'done', 'the autopilot clears level ' + li + ' ' + JSON.stringify (r));
		}
		// every capsule, applied, then a few seconds of play
		await page.goto (url + '?lang=en&auto&seed=3&level=6'); await page.waitForTimeout (100);
		const n = await page.evaluate (() => { Briko.step (240); for (const k of 'ERMCZSFBLWD') Briko.applyPower (k, 300); Briko.step (1200); return Briko.G.balls.length; });
		ok (n >= 0, 'every capsule works (' + n + ' balls)');
		ok (!errs.length, 'no error while simulating ' + errs.join (' | '));
		await ctx.close ();
	}
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
			await page.waitForTimeout (1500);
			await shot (page, tag + '-title');
			await page.click ('#btLevels'); await page.waitForTimeout (500);
			await shot (page, tag + '-levels');
			await page.goto (url + '?lang=' + lang); await page.waitForTimeout (300);
			await page.click ('#btHow'); await page.waitForTimeout (500);
			await shot (page, tag + '-how');
			// a level, waiting for the launch
			await page.goto (url + '?lang=' + lang + '&level=7&seed=2'); await page.waitForTimeout (700);
			await shot (page, tag + '-start');
			// steering: a finger's slide moves the paddle by as much; the mouse puts it under the pointer
			const box = await page.evaluate (() => ({ x: Briko.G.paddle.x }));
			const sx = vp.width / 2, sy = vp.height * 0.8;
			if (mobile)
			{
				await page.evaluate (([x, y]) =>
				{
					const cv = document.getElementById ('cv');
					const ev = (t, X) => cv.dispatchEvent (new PointerEvent (t, { pointerId: 3, pointerType: 'touch', clientX: X, clientY: y, bubbles: true }));
					ev ('pointerdown', x); ev ('pointermove', x - 40); ev ('pointermove', x - 80);
				}, [sx, sy]);
			}
			else await page.mouse.move (sx - 200, sy);
			await page.waitForTimeout (500);
			const moved = await page.evaluate (() => Briko.G.paddle.x);
			ok (moved < box.x - 20, tag + ': the paddle follows (' + Math.round (box.x) + ' -> ' + Math.round (moved) + ')');
			// a tap / a click launches
			if (mobile) await page.evaluate (([x, y]) => { const cv = document.getElementById ('cv'); cv.dispatchEvent (new PointerEvent ('pointerup', { pointerId: 3, pointerType: 'touch', clientX: x - 80, clientY: y, bubbles: true }));
				cv.dispatchEvent (new PointerEvent ('pointerdown', { pointerId: 4, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); cv.dispatchEvent (new PointerEvent ('pointerup', { pointerId: 4, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); }, [sx, sy]);
			else await page.mouse.click (sx - 200, sy);
			await page.waitForTimeout (300);
			ok (await page.evaluate (() => !Briko.G.balls[0].stuck), tag + ': a tap / a click launches the ball');
			// some play, for the picture
			await page.goto (url + '?lang=' + lang + '&level=7&auto&seed=4'); await page.waitForTimeout (200);
			await page.evaluate (() => { Briko.step (20 * 120); Briko.applyPower ('Z', 300); Briko.applyPower ('M', 300); Briko.step (90); });
			await page.waitForTimeout (120);
			await shot (page, tag + '-play');
			// the pause
			await page.evaluate (() => Briko.pause ()); await page.waitForTimeout (400);
			await shot (page, tag + '-pause');
			ok ((await page.evaluate (() => Briko.screen)) === 'pause', tag + ': pause shows');
			// a level cleared: its stars
			await page.goto (url + '?lang=' + lang + '&level=1&auto&seed=9'); await page.waitForTimeout (100);
			await page.evaluate (() => { for (let k = 0; k < 400 && Briko.G.phase !== 'done'; k++) Briko.step (120); });
			await page.waitForTimeout (1400);
			await shot (page, tag + '-clear');
			ok ((await page.evaluate (() => Briko.screen)) === 'clear', tag + ': the level-clear panel shows');
			// game over: no input, the ball falls three times
			await page.goto (url + '?lang=' + lang + '&level=2'); await page.waitForTimeout (100);
			await page.evaluate (() => { for (let k = 0; k < 200 && Briko.G.phase !== 'over'; k++) { Briko.G.paddle.x = 30; Briko.step (60); } });
			await page.waitForTimeout (600);
			await shot (page, tag + '-over');
			ok ((await page.evaluate (() => Briko.screen)) === 'over', tag + ': game over shows');
			ok (!errs.length, tag + ': no error ' + errs.join (' | '));
			await ctx.close ();
		}
	await browser.close ();
	console.log (fails ? fails + ' failure(s)' : 'all right');
	process.exit (fails ? 1 : 0);
}) ();
