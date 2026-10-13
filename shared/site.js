// site.js -- Code is Fun: what the pages share -- the language (FR / EN: the toggle in the header, kept in the
// browser; the browser's language at first), the progress kept in the browser, the level drawer, small helpers.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function () {
'use strict';
const LANG_KEY = 'codeisfun.lang';
const store = {
	get (key, def) { try { const v = localStorage.getItem (key); return v === null ? def : JSON.parse (v); } catch (e) { return def; } },
	set (key, v) { try { localStorage.setItem (key, JSON.stringify (v)); } catch (e) { /* (private mode: kept for this visit only) */ } } };
function initialLang ()
{
	const q = new URLSearchParams (location.search).get ('lang');
	if (q === 'fr' || q === 'en') return q;
	const s = store.get (LANG_KEY, null);
	if (s === 'fr' || s === 'en') return s;
	return (navigator.language || 'en').toLowerCase ().startsWith ('fr') ? 'fr' : 'en';
}
const listeners = [];
const Site = {
	lang: initialLang (),
	store,
	// a word in the language: t ('English', 'Français')
	t (en, fr) { return Site.lang === 'fr' ? fr : en; },
	get L () { return Site.lang === 'fr' ? 1 : 0; },
	onLang (fn) { listeners.push (fn); },
	setLang (l)
	{
		Site.lang = l; store.set (LANG_KEY, l);
		document.documentElement.lang = l;
		document.querySelectorAll ('.lang button').forEach ((b) => b.setAttribute ('aria-pressed', String (b.dataset.lang === l)));
		document.querySelectorAll ('[data-en]').forEach ((el) => { el.textContent = l === 'fr' ? el.dataset.fr : el.dataset.en; });
		document.querySelectorAll ('[data-en-label]').forEach ((el) => { const v = l === 'fr' ? el.dataset.frLabel : el.dataset.enLabel; el.setAttribute ('aria-label', v); el.title = v; });
		listeners.forEach ((fn) => fn (l));
	},
	starsHtml (n, of = 3)
	{
		let s = '<span class="stars" aria-label="' + Site.t (n + ' of ' + of + ' stars', n + ' étoile' + (n > 1 ? 's' : '') + ' sur ' + of) + '">';
		for (let k = 0; k < of; k++) s += '<span class="' + (k < n ? 'on' : '') + '" aria-hidden="true">★</span>';
		return s + '</span>';
	},
	esc (s) { return String (s).replace (/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
	// The message bar: kind 'info' | 'ok' | 'err' | 'none'; text (its first line bold when titled); stars
	message (el, kind, text, stars, titled)
	{
		el.className = 'msg ' + (kind || 'none');
		el.setAttribute ('role', kind === 'err' ? 'alert' : 'status');
		if (!kind || kind === 'none' || !text) { el.innerHTML = ''; return; }
		const lines = String (text).split ('\n');
		const body = titled && lines.length > 1 ? '<b>' + Site.esc (lines[0]) + '</b>' + Site.esc (lines.slice (1).join ('\n')) : Site.esc (text);
		const ico = stars ? Site.starsHtml (stars) : '<span class="ico" aria-hidden="true">' + (kind === 'ok' ? '✓' : kind === 'err' ? '!' : 'i') + '</span>';
		el.innerHTML = ico + '<span class="txt">' + body + '</span>';
	},
	openLevels (open) { document.body.classList.toggle ('levels-open', open); if (open) { const c = document.querySelector ('.levels [aria-current="true"]'); if (c) c.scrollIntoView ({ block: 'center' }); } },
	reducedMotion: matchMedia ('(prefers-reduced-motion: reduce)').matches,
	isPhone () { return matchMedia ('(max-width: 699px)').matches; } };
window.Site = Site;
document.addEventListener ('DOMContentLoaded', () =>
{
	document.querySelectorAll ('.lang button').forEach ((b) => b.addEventListener ('click', () => Site.setLang (b.dataset.lang)));
	document.querySelectorAll ('.levels-btn').forEach ((b) => b.addEventListener ('click', () => Site.openLevels (true)));
	document.querySelectorAll ('.scrim, .levels .close').forEach ((b) => b.addEventListener ('click', () => Site.openLevels (false)));
	document.addEventListener ('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains ('levels-open')) Site.openLevels (false); });
	Site.setLang (Site.lang);
});
}) ();
