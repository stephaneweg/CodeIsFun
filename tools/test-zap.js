// test-zap.js -- Cosmo Zap! in a browser (Playwright): the autopilot clears waves; the bunkers get eaten; the finger,
// the keyboard and the mouse steer; the capsules; the screens; no console error; screenshots
//   node tools/test-zap.js [out-dir]     (phone portrait and landscape, desktop; EN and FR)
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
const path = require ('path');
let pw; try { pw = require ('playwright'); } catch (e) { pw = require (path.join (process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const root = path.join (__dirname, '..');
const out = process.argv[2];
const url = 'file://' + path.join (root, 'invaders/index.html');
let fails = 0;
const ok = (c, m) => { console.log ((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () =>
{
	const browser = await pw.chromium.launch ();
	const shot = async (page, name) => { if (out) await page.screenshot ({ path: path.join (out, 'zap-' + name + '.png') }); };
	// the autopilot plays (the simulation run by hand: minutes of play in seconds)
	{
		const ctx = await browser.newContext ({ viewport: { width: 800, height: 900 } });
		const page = await ctx.newPage ();
		const errs = []; page.on ('pageerror', (e) => errs.push (e.message));
		let best = 0;
		for (const seed of [3, 11, 42])
		{
			await page.goto (url + '?lang=en&auto&seed=' + seed); await page.waitForTimeout (100);
			const r = await page.evaluate (() =>
			{
				for (let k = 0; k < 900 && Zap.G.state !== 'over' && Zap.G.wave < 4; k++) Zap.step (120);
				const eaten = Zap.G.bunkers.reduce ((n, b) => n + b.cells.filter ((c) => !c).length, 0);
				return { wave: Zap.G.wave, score: Zap.G.score, state: Zap.G.state, kills: Zap.G.kills, eaten };
			});
			console.log ('     seed ' + seed + ': wave ' + r.wave + ', ' + r.kills + ' aliens, score ' + r.score + ', ' + r.state);
			best = Math.max (best, r.wave);
			ok (r.kills >= 45, 'seed ' + seed + ': the autopilot clears the first wave');
		}
		ok (best >= 3, 'the autopilot reaches wave 3');
		await page.goto (url + '?lang=en&seed=5&wave=3'); await page.waitForTimeout (100);
		const hits = await page.evaluate (() =>
		{
			Zap.step (300);
			const before = Zap.G.bunkers.reduce ((n, b) => n + b.cells.filter ((c) => c).length, 0);
			for (let k = 0; k < 40; k++) { Zap.G.p.inv = 5; Zap.step (60); }
			const after = Zap.G.bunkers.reduce ((n, b) => n + b.cells.filter ((c) => c).length, 0);
			return { before, after, wave: Zap.G.wave };
		});
		ok (hits.wave === 3 && hits.after < hits.before, 'the bombs nibble the cheese (' + hits.before + ' → ' + hits.after + ' cells)');
		// every capsule, a death, a wave clear, a game over
		const r2 = await page.evaluate (() =>
		{
			const G = Zap.G, p = G.p, res = {};
			for (const k of ['T', 'R', 'S', 'L']) G.caps.push ({ x: p.x, y: 700 - 40, k, t: 0 });
			const lives = G.lives;
			Zap.step (60);
			res.caps = p.triple > 0 && p.rapid > 0 && p.shield && G.lives === lives + 1;
			G.bombs.push ({ x: p.x, y: 680, vy: 300, kind: 'goo', t: 0 }); p.inv = 0;
			Zap.step (120);
			res.shield = !p.shield && G.lives === lives + 1 && p.dead <= 0;
			p.inv = 0; G.bombs.push ({ x: p.x, y: 680, vy: 300, kind: 'zig', t: 0 });
			Zap.step (120);
			res.died = G.lives === lives && p.dead > 0;
			for (const a of G.aliens) if (a.alive) Zap.killAlien (a);
			Zap.step (10);
			res.clear = G.state === 'clear';
			Zap.step (400);
			res.next = G.wave === 4;
			G.lives = 1; Zap.step (500); p.inv = 0; p.shield = false;
			G.bombs.push ({ x: p.x, y: 680, vy: 300, kind: 'goo', t: 0 });
			Zap.step (800);
			res.over = Zap.screen;
			return res;
		});
		ok (r2.caps, 'the four capsules: triple, rapid, bubble, extra life');
		ok (r2.shield, 'the bubble saves the ship once');
		ok (r2.died, 'a bomb costs a life');
		ok (r2.clear && r2.next, 'a cleared wave brings the next');
		ok (r2.over === 'over', 'the last life: the game over screen');
		ok (!errs.length, 'no page error ' + errs.join (' | '));
		await ctx.close ();
	}
	// the screens, the controls, in three sizes
	for (const [name, vp, touch] of [['phone', { width: 390, height: 844 }, true], ['landscape', { width: 844, height: 390 }, true], ['desktop', { width: 1280, height: 800 }, false]])
	{
		const ctx = await browser.newContext ({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
		const page = await ctx.newPage ();
		const errs = []; page.on ('pageerror', (e) => errs.push (e.message)); page.on ('console', (m) => { if (m.type () === 'error') errs.push (m.text ()); });
		await page.goto (url + '?lang=' + (name === 'phone' ? 'fr' : 'en') + '&seed=9'); await page.waitForTimeout (1500);
		await shot (page, name + '-title');
		await page.click ('#btHow'); await page.waitForTimeout (400);
		ok (await page.evaluate (() => document.querySelectorAll ('#legendAliens li').length === 4 && document.querySelectorAll ('#legendCaps li').length === 4), name + ': how to play, with the legend');
		await shot (page, name + '-how');
		await page.evaluate (() => Zap.show ('title'));
		await page.click ('#btPlay'); await page.waitForTimeout (2600);
		ok (await page.evaluate (() => Zap.screen === 'play' && Zap.G.state === 'play'), name + ': playing');
		const x0 = await page.evaluate (() => Zap.G.p.x);
		if (touch)
		{
			const cdp = await ctx.newCDPSession (page);
			const tp = (type, x, y) => cdp.send ('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
			await tp ('touchStart', vp.width / 2, vp.height * 0.8);
			for (let i = 1; i <= 8; i++) { await tp ('touchMove', vp.width / 2 - i * 12, vp.height * 0.8); await page.waitForTimeout (30); }
			await page.waitForTimeout (300);
			const r = await page.evaluate (() => ({ x: Zap.G.p.x, shots: Zap.G.fired }));
			await tp ('touchEnd');
			ok (r.x < x0 - 40 && r.shots > 0, name + ': the finger slides the ship and fires (' + Math.round (x0) + ' → ' + Math.round (r.x) + ')');
		}
		else
		{
			await page.keyboard.down ('ArrowRight'); await page.waitForTimeout (400); await page.keyboard.up ('ArrowRight');
			const xk = await page.evaluate (() => Zap.G.p.x);
			ok (xk > x0 + 60, name + ': the arrows move the ship');
			await page.keyboard.down (' '); await page.waitForTimeout (100);
			ok (await page.evaluate (() => Zap.G.fired > 0), name + ': Space fires');
			await page.keyboard.up (' ');
			await page.mouse.move (300, 600); await page.waitForTimeout (500);
			const xm = await page.evaluate (() => Zap.G.p.x);
			ok (xm < xk - 40, name + ': the mouse steers');
		}
		await page.waitForTimeout (700);
		await shot (page, name + '-play');
		await page.click ('#btPause'); await page.waitForTimeout (300);
		ok (await page.evaluate (() => Zap.screen === 'pause'), name + ': pause');
		await shot (page, name + '-pause');
		await page.click ('#btResume');
		await page.evaluate (() => { Zap.G.lives = 1; Zap.G.p.inv = 0; Zap.G.p.shield = false; Zap.G.bombs.push ({ x: Zap.G.p.x, y: 680, vy: 300, kind: 'goo', t: 0 }); });
		await page.waitForTimeout (3500);
		ok (await page.evaluate (() => Zap.screen === 'over'), name + ': game over');
		await shot (page, name + '-over');
		ok (!errs.length, name + ': no error ' + errs.join (' | '));
		await ctx.close ();
	}
	await browser.close ();
	console.log (fails ? fails + ' failure(s)' : 'all good');
	process.exit (fails ? 1 : 0);
}) ();
