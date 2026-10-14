// three3d.js -- the free mode's 3D: Onyx BASIC's SCENE3D ... RENDER3D in the browser (Onyx's user/Libs/basic/
// bas3dscene.h and bas3d.h ported): the frame being built -- the model matrix and its stack, the camera, the light, the
// state (COLOR3D, TEXTURE3D, BLEND3D, DEPTH3D, CULL3D), the shapes lit per vertex (CUBE3D, SPHERE3D, CYLINDER3D,
// PLANE3D) and VERTEX3D's triangles as given -- turned into vertices and batches, each batch with its projection * view
// * model matrix; then drawn by WebGL (the GPU, as Onyx's kernel does), or by the software renderer when there is none
// (and in the tests under Node): the same picture -- clipped at the near plane, perspective-correct colours and texture
// coordinates, depth, culling (front = counter-clockwise, y up), the four blends.
//
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
(function (global) {
'use strict';

// the batch flags (Onyx's G3_*, = the kernel's KAPI_GPU_B_*)
const ZFUNC = 7, NOZWRITE = 1 << 3, CULL_BACK = 1 << 4, CULL_FRONT = 1 << 5, BLEND_SHIFT = 8, LINEAR = 1 << 12,
	WRAP_S_SHIFT = 13, WRAP_T_SHIFT = 15;
const VF = 10;					// a vertex: x y z w s t r g b a (colours 0..255)
const MAXV = 3 * 65536, MAXB = 4096, STACK = 32;

const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul (a, c)				// a * c, row by row
{
	const r = new Array (16);
	for (let i = 0; i < 4; i++)
		for (let j = 0; j < 4; j++)
			r[i * 4 + j] = a[i * 4] * c[j] + a[i * 4 + 1] * c[4 + j] + a[i * 4 + 2] * c[8 + j] + a[i * 4 + 3] * c[12 + j];
	return r;
}

// ---- the frame being built (bas3dscene.h) ------------------------------------------------------------------------------
class Scene3D
{
	constructor ()
	{
		this.eye = [0, 2, 6]; this.target = [0, 0, 0]; this.fov = 60;
		this.light = [0.4, 1, 0.6]; this.ambient = 0.3; this.lit = true; this.normL ();
		this.v = new Float32Array (4096 * VF); this.nv = 0;
		this.sph = {}; this.cyl = {}; this.collect = null;
		this.view = ident (); this.proj = ident ();
		this.begin (0, false);
	}
	normL ()
	{
		const L = this.light, l = Math.hypot (L[0], L[1], L[2]);
		this.lit = l > 1e-6;
		if (this.lit) { L[0] /= l; L[1] /= l; L[2] /= l; }
	}
	// SCENE3D: a new frame (the camera and the light stay)
	begin (clear, keep)
	{
		this.nv = 0; this.b = []; this.model = ident (); this.stack = [];
		this.color = 0xFFFFFF; this.alpha = 255; this.texture = 0; this.flags = CULL_BACK; this.pend = [];
		this.clear = clear; this.keep = keep; this.dirty = true; this.full = false;
	}
	post (t) { this.model = mul (this.model, t); this.dirty = true; }
	identity () { this.model = ident (); this.dirty = true; }
	translate (x, y, z) { const t = ident (); t[3] = x; t[7] = y; t[11] = z; this.post (t); }
	scale (x, y, z) { const t = ident (); t[0] = x; t[5] = y; t[10] = z; this.post (t); }
	rotate (ax, ay, az)				// degrees: X first, then Y, then Z
	{
		const D = Math.PI / 180;
		if (az) { const c = Math.cos (az * D), s = Math.sin (az * D), t = ident (); t[0] = c; t[1] = -s; t[4] = s; t[5] = c; this.post (t); }
		if (ay) { const c = Math.cos (ay * D), s = Math.sin (ay * D), t = ident (); t[0] = c; t[2] = s; t[8] = -s; t[10] = c; this.post (t); }
		if (ax) { const c = Math.cos (ax * D), s = Math.sin (ax * D), t = ident (); t[5] = c; t[6] = -s; t[9] = s; t[10] = c; this.post (t); }
	}
	push () { if (this.stack.length >= STACK) return false; this.stack.push (this.model.slice ()); return true; }
	pop () { if (!this.stack.length) return false; this.model = this.stack.pop (); this.dirty = true; return true; }
	setFlags (f) { if (f !== this.flags) { this.flags = f; this.dirty = true; } }
	setTexture (t) { if (t !== this.texture) { this.texture = t; this.dirty = true; } }
	// projection * view (aspect: the displayed width / height of the page, or of VIEW3D's part of it)
	camera (aspect)
	{
		const e = this.eye, tg = this.target;
		let f = [tg[0] - e[0], tg[1] - e[1], tg[2] - e[2]];
		let l = Math.hypot (f[0], f[1], f[2]);
		if (l < 1e-6) f = [0, 0, -1]; else f = [f[0] / l, f[1] / l, f[2] / l];
		let up = [0, 1, 0];
		if (f[1] > 0.999 || f[1] < -0.999) up = [0, 0, -1];
		let s = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]];
		l = Math.hypot (s[0], s[1], s[2]); s = [s[0] / l, s[1] / l, s[2] / l];
		const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
		this.view = [s[0], s[1], s[2], -(s[0] * e[0] + s[1] * e[1] + s[2] * e[2]),
			u[0], u[1], u[2], -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]),
			-f[0], -f[1], -f[2], f[0] * e[0] + f[1] * e[1] + f[2] * e[2],
			0, 0, 0, 1];
		const a = this.fov * Math.PI / 360, ct = Math.cos (a) / Math.sin (a), n = 0.1, fa = 1000;
		this.proj = [ct / aspect, 0, 0, 0, 0, ct, 0, 0, 0, 0, (fa + n) / (n - fa), 2 * fa * n / (n - fa), 0, 0, -1, 0];
		this.dirty = true;
	}
	// a batch for the next triangle (a new one when the matrix / texture / state changed)
	open ()
	{
		if (this.full) return false;
		if (this.nv + 3 > MAXV) { this.full = true; return false; }
		if (this.dirty || !this.b.length)
		{
			if (this.b.length >= MAXB) { this.full = true; return false; }
			this.b.push ({ first: this.nv, count: 0, texture: this.texture, flags: this.flags, m: mul (mul (this.proj, this.view), this.model) });
			this.dirty = false;
		}
		return true;
	}
	room ()
	{
		if ((this.nv + 3) * VF <= this.v.length) return;
		const n = new Float32Array (Math.min (MAXV * VF, this.v.length * 2)); n.set (this.v); this.v = n;
	}
	put (x, y, z, s, t, r, g, b, a)
	{
		const o = this.nv++ * VF, v = this.v;
		v[o] = x; v[o + 1] = y; v[o + 2] = z; v[o + 3] = 1; v[o + 4] = s; v[o + 5] = t; v[o + 6] = r; v[o + 7] = g; v[o + 8] = b; v[o + 9] = a;
	}
	putLit (x, y, z, s, t, shade)
	{
		const c = this.color, ch = (k) => { const f = k * shade; return f >= 255 ? 255 : f < 0 ? 0 : Math.floor (f + 0.5); };
		this.put (x, y, z, s, t, ch ((c >> 16) & 255), ch ((c >> 8) & 255), ch (c & 255), this.alpha);
	}
	shade (nx, ny, nz)				// the light on a model-space normal
	{
		if (!this.lit) return 1;
		const m = this.model, L = this.light;
		const wx = m[0] * nx + m[1] * ny + m[2] * nz, wy = m[4] * nx + m[5] * ny + m[6] * nz, wz = m[8] * nx + m[9] * ny + m[10] * nz;
		const l = Math.hypot (wx, wy, wz);
		const d = l > 1e-9 ? (wx * L[0] + wy * L[1] + wz * L[2]) / l : 0;
		return this.ambient + (1 - this.ambient) * (d > 0 ? d : 0);
	}
	// a lit triangle (positions P, normals N, texture coordinates T); orient: turned to face its normal
	tri (P, N, T, orient)
	{
		let o = [0, 1, 2];
		if (orient)
		{
			const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], az = P[1][2] - P[0][2];
			const bx = P[2][0] - P[0][0], by = P[2][1] - P[0][1], bz = P[2][2] - P[0][2];
			const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
			if (cx * cx + cy * cy + cz * cz < 1e-12) return;
			const nx = N[0][0] + N[1][0] + N[2][0], ny = N[0][1] + N[1][1] + N[2][1], nz = N[0][2] + N[1][2] + N[2][2];
			if (cx * nx + cy * ny + cz * nz < 0) o = [0, 2, 1];
		}
		if (this.collect) { this.collect.push ({ P: o.map ((k) => P[k].slice ()), N: o.map ((k) => N[k].slice ()), T: o.map ((k) => T[k].slice ()) }); return; }
		if (!this.open ()) return;
		this.room ();
		for (const k of o) this.putLit (P[k][0], P[k][1], P[k][2], T[k][0], T[k][1], this.shade (N[k][0], N[k][1], N[k][2]));
		this.b[this.b.length - 1].count += 3;
	}
	drawCached (L, kx, ky, kz)
	{
		for (const c of L)
		{
			if (!this.open ()) return;
			this.room ();
			for (let k = 0; k < 3; k++) this.putLit (c.P[k][0] * kx, c.P[k][1] * ky, c.P[k][2] * kz, c.T[k][0], c.T[k][1], this.shade (c.N[k][0], c.N[k][1], c.N[k][2]));
			this.b[this.b.length - 1].count += 3;
		}
	}
	quad (P, N, orient)				// corners in order, one normal
	{
		const ST = [[0, 1], [1, 1], [1, 0], [0, 0]], n3 = [N, N, N];
		this.tri ([P[0], P[1], P[2]], n3, [ST[0], ST[1], ST[2]], orient);
		this.tri ([P[0], P[2], P[3]], n3, [ST[0], ST[2], ST[3]], orient);
	}
	// VERTEX3D: three make a triangle (unlit, as given: counter-clockwise = the front)
	vertex (x, y, z, s, t)
	{
		const c = this.color;
		this.pend.push ([x, y, z, s, t, (c >> 16) & 255, (c >> 8) & 255, c & 255, this.alpha]);
		if (this.pend.length < 3) return;
		const p = this.pend; this.pend = [];
		if (!this.open ()) return;
		this.room ();
		for (const q of p) this.put (q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]);
		this.b[this.b.length - 1].count += 3;
	}
	cube (size)
	{
		const F = [[0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0], [1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0],
			[0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
		const CU = [-1, 1, 1, -1], CV = [-1, -1, 1, 1], h = size / 2;
		for (const d of F)
		{
			const P = [];
			for (let c = 0; c < 4; c++) P.push ([0, 1, 2].map ((k) => h * (d[k] + CU[c] * d[3 + k] + CV[c] * d[6 + k])));
			this.quad (P, [d[0], d[1], d[2]], false);
		}
	}
	plane (w, d)					// on y = 0, facing up
	{
		const x = w / 2, z = d / 2;
		this.quad ([[-x, 0, z], [x, 0, z], [x, 0, -z], [-x, 0, -z]], [0, 1, 0], false);
	}
	sphere (r, detail)
	{
		const sl = Math.max (6, Math.min (64, Math.round (detail)));
		if (!this.sph[sl]) { this.collect = this.sph[sl] = []; this.buildSphere (sl); this.collect = null; }
		this.drawCached (this.sph[sl], r, r, r);
	}
	buildSphere (sl)
	{
		const st = Math.floor (sl / 2), PI = Math.PI;
		for (let i = 0; i < st; i++)
			for (let j = 0; j < sl; j++)
			{
				const ii = [i, i + 1, i + 1, i], jj = [j, j, j + 1, j + 1], P = [], N = [], T = [];
				for (let k = 0; k < 4; k++)
				{
					const th = PI * ii[k] / st, ph = 2 * PI * jj[k] / sl, sth = Math.sin (th);
					N.push ([sth * Math.cos (ph), Math.cos (th), -sth * Math.sin (ph)]); P.push (N[k].slice ());
					T.push ([jj[k] / sl, ii[k] / st]);
				}
				this.tri ([P[0], P[1], P[2]], [N[0], N[1], N[2]], [T[0], T[1], T[2]], true);
				this.tri ([P[0], P[2], P[3]], [N[0], N[2], N[3]], [T[0], T[2], T[3]], true);
			}
	}
	cylinder (r, h, detail)			// around y, from y = 0 to h, closed
	{
		const sl = Math.max (6, Math.min (64, Math.round (detail)));
		if (!this.cyl[sl]) { this.collect = this.cyl[sl] = []; this.buildCylinder (sl); this.collect = null; }
		this.drawCached (this.cyl[sl], r, h, r);
	}
	buildCylinder (sl)
	{
		for (let j = 0; j < sl; j++)
		{
			const a0 = 2 * Math.PI * j / sl, a1 = 2 * Math.PI * (j + 1) / sl;
			const c0 = Math.cos (a0), s0 = -Math.sin (a0), c1 = Math.cos (a1), s1 = -Math.sin (a1), u0 = j / sl, u1 = (j + 1) / sl;
			this.tri ([[c0, 0, s0], [c1, 0, s1], [c1, 1, s1]], [[c0, 0, s0], [c1, 0, s1], [c1, 0, s1]], [[u0, 1], [u1, 1], [u1, 0]], true);
			this.tri ([[c0, 0, s0], [c1, 1, s1], [c0, 1, s0]], [[c0, 0, s0], [c1, 0, s1], [c0, 0, s0]], [[u0, 1], [u1, 0], [u0, 0]], true);
			for (let cap = 0; cap < 2; cap++)
			{
				const y = cap, ny = cap ? 1 : -1, Nc = [[0, ny, 0], [0, ny, 0], [0, ny, 0]];
				this.tri ([[0, y, 0], [c0, y, s0], [c1, y, s1]], Nc, [[0.5, 0.5], [0.5 + 0.5 * c0, 0.5 + 0.5 * s0], [0.5 + 0.5 * c1, 0.5 + 0.5 * s1]], true);
			}
		}
	}
}

// ---- the software renderer (bas3d.h) -------------------------------------------------------------------------------------
// tex: { px: Uint32Array 0xAARRGGBB, w, h }
function sample (T, s, t, flags, out)
{
	const ws = (flags >> WRAP_S_SHIFT) & 3, wt = (flags >> WRAP_T_SHIFT) & 3;
	const wrap = (i, n, mode) =>
	{
		if (mode === 1) return i < 0 ? 0 : i >= n ? n - 1 : i;
		if (mode === 2) { const p = 2 * n; i %= p; if (i < 0) i += p; return i < n ? i : p - 1 - i; }
		i %= n; return i < 0 ? i + n : i;
	};
	out[0] = out[1] = out[2] = out[3] = 0;
	const texel = (x, y, k) =>
	{
		const c = T.px[wrap (y, T.h, wt) * T.w + wrap (x, T.w, ws)];
		out[0] += k * ((c >>> 16) & 255); out[1] += k * ((c >>> 8) & 255); out[2] += k * (c & 255); out[3] += k * (c >>> 24);
	};
	let u = s * T.w, v = t * T.h;
	if (!(flags & LINEAR)) { texel (Math.floor (u), Math.floor (v), 1); return; }
	u -= 0.5; v -= 0.5;
	const x = Math.floor (u), y = Math.floor (v), fx = u - x, fy = v - y;
	texel (x, y, (1 - fx) * (1 - fy)); texel (x + 1, y, fx * (1 - fy)); texel (x, y + 1, (1 - fx) * fy); texel (x + 1, y + 1, fx * fy);
}
// one triangle in clip space (c: three arrays x y z w s t r g b a), in front of the near plane
function raster (dst, W, H, stride, off, zb, c, flags, T)
{
	const X = [], Y = [], Z = [], IW = [];
	for (let k = 0; k < 3; k++)
	{
		IW[k] = 1 / c[k][3];
		X[k] = (c[k][0] * IW[k] + 1) * 0.5 * W; Y[k] = (1 - c[k][1] * IW[k]) * 0.5 * H; Z[k] = c[k][2] * IW[k] * 0.5 + 0.5;
	}
	let area = (X[1] - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (Y[1] - Y[0]);
	if (area === 0) return;
	const front = area < 0;
	if ((flags & CULL_BACK) && !front) return;
	if ((flags & CULL_FRONT) && front) return;
	const o = area < 0 ? [0, 2, 1] : [0, 1, 2];
	if (area < 0) area = -area;
	const x0 = Math.max (0, Math.floor (Math.min (X[0], X[1], X[2]))), y0 = Math.max (0, Math.floor (Math.min (Y[0], Y[1], Y[2])));
	const x1 = Math.min (W - 1, Math.floor (Math.max (X[0], X[1], X[2]))), y1 = Math.min (H - 1, Math.floor (Math.max (Y[0], Y[1], Y[2])));
	if (y0 > y1 || x0 > x1) return;
	const inv = 1 / area;
	let zf = flags & ZFUNC; if (zf === 0) zf = 1;
	const zw = !(flags & NOZWRITE) && zf !== 7, blend = (flags >> BLEND_SHIFT) & 15;
	const A = o.map ((k) => { const v = c[k], iw = IW[k]; return [v[4] * iw, v[5] * iw, v[6] * iw, v[7] * iw, v[8] * iw, v[9] * iw]; });
	const PX = o.map ((k) => X[k]), PY = o.map ((k) => Y[k]), PZ = o.map ((k) => Z[k]), PW = o.map ((k) => IW[k]);
	const tx = [0, 0, 0, 0];
	for (let y = y0; y <= y1; y++)
		for (let x = x0; x <= x1; x++)
		{
			const px = x + 0.5, py = y + 0.5;
			const b0 = ((PX[1] - px) * (PY[2] - py) - (PX[2] - px) * (PY[1] - py)) * inv;
			const b1 = ((PX[2] - px) * (PY[0] - py) - (PX[0] - px) * (PY[2] - py)) * inv;
			const b2 = 1 - b0 - b1;
			if (b0 < 0 || b1 < 0 || b2 < 0) continue;
			const z = b0 * PZ[0] + b1 * PZ[1] + b2 * PZ[2];
			if (z < 0 || z > 1) continue;
			const zi = y * W + x, zr = zb[zi];
			let pass;
			switch (zf)
			{
			case 2: pass = z === zr; break; case 3: pass = z <= zr; break; case 4: pass = z > zr; break;
			case 5: pass = z !== zr; break; case 6: pass = z >= zr; break; case 7: pass = true; break; default: pass = z < zr;
			}
			if (!pass) continue;
			const w = 1 / (b0 * PW[0] + b1 * PW[1] + b2 * PW[2]);
			const at = (k) => (b0 * A[0][k] + b1 * A[1][k] + b2 * A[2][k]) * w;
			let r = at (2), g = at (3), bl = at (4), a = at (5);
			if (T) { sample (T, at (0), at (1), flags, tx); r *= tx[0] / 255; g *= tx[1] / 255; bl *= tx[2] / 255; a *= tx[3] / 255; }
			if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255; if (a > 255) a = 255;
			const di = off + y * stride + x, d = dst[di];
			const dr = (d >> 16) & 255, dg = (d >> 8) & 255, db = d & 255, fa = a / 255;
			switch (blend)
			{
			case 1: r = r * fa + dr * (1 - fa); g = g * fa + dg * (1 - fa); bl = bl * fa + db * (1 - fa); break;
			case 2: r = r * fa + dr; g = g * fa + dg; bl = bl * fa + db; break;
			case 3: r = r * dr / 255; g = g * dg / 255; bl = bl * db / 255; break;
			case 4: r = r + dr * (1 - fa); g = g + dg * (1 - fa); bl = bl + db * (1 - fa); break;
			}
			const c8 = (f) => f <= 0 ? 0 : f >= 255 ? 255 : Math.floor (f + 0.5);
			dst[di] = (c8 (r) << 16) | (c8 (g) << 8) | c8 (bl);
			if (zw) zb[zi] = z;
		}
}
// The frame into dst (0xRRGGBB ints, w x h at off, stride a row); textures: number -> texture or null
function swRender (dst, off, w, h, stride, sc, textures)
{
	if (!sc.keep) for (let y = 0; y < h; y++) dst.fill (sc.clear, off + y * stride, off + y * stride + w);
	const zb = new Float32Array (w * h).fill (1);
	const v = sc.v, EPS = 1e-5;
	for (const B of sc.b)
	{
		const M = B.m, T = B.texture > 0 ? textures (B.texture) : null;
		for (let t = 0; t + 3 <= B.count; t += 3)
		{
			const inp = [];
			for (let k = 0; k < 3; k++)
			{
				const p = (B.first + t + k) * VF, x = v[p], y = v[p + 1], z = v[p + 2], ww = v[p + 3];
				inp.push ([M[0] * x + M[1] * y + M[2] * z + M[3] * ww, M[4] * x + M[5] * y + M[6] * z + M[7] * ww,
					M[8] * x + M[9] * y + M[10] * z + M[11] * ww, M[12] * x + M[13] * y + M[14] * z + M[15] * ww,
					v[p + 4], v[p + 5], v[p + 6], v[p + 7], v[p + 8], v[p + 9]]);
			}
			const poly = [];
			for (let k = 0; k < 3; k++)
			{
				const a = inp[k], b = inp[(k + 1) % 3], da = a[2] + a[3], db = b[2] + b[3];
				const ina = da >= 0 && a[3] > EPS, inb = db >= 0 && b[3] > EPS;
				if (ina) poly.push (a);
				if (ina !== inb && poly.length < 4)
				{
					const f = da / (da - db), q = a.map ((x, i) => x + (b[i] - x) * f);
					if (q[3] > EPS) poly.push (q);
				}
			}
			for (let k = 1; k + 1 < poly.length; k++) raster (dst, w, h, stride, off, zb, [poly[0], poly[k], poly[k + 1]], B.flags, T);
		}
	}
}

// ---- WebGL ------------------------------------------------------------------------------------------------------------------
const VS = `attribute vec4 aPos; attribute vec2 aST; attribute vec4 aCol; uniform mat4 uM; varying vec2 vST; varying vec4 vCol;
void main () { gl_Position = uM * aPos; vST = aST; vCol = aCol / 255.0; }`;
const FS = `precision mediump float; varying vec2 vST; varying vec4 vCol; uniform sampler2D uT; uniform int uHasT; uniform vec2 uWrap;
float wrap1 (float c, float m) { if (m < 0.5) return fract (c); if (m < 1.5) return clamp (c, 0.0, 1.0); float f = mod (c, 2.0); return f > 1.0 ? 2.0 - f : f; }
void main () { vec4 c = vCol; if (uHasT == 1) c *= texture2D (uT, vec2 (wrap1 (vST.x, uWrap.x), wrap1 (vST.y, uWrap.y))); gl_FragColor = c; }`;
class GLRenderer
{
	constructor ()
	{
		this.ok = false;
		if (typeof document === 'undefined') return;
		const cv = document.createElement ('canvas');
		const gl = cv.getContext ('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false }) || cv.getContext ('experimental-webgl');
		if (!gl) return;
		const sh = (t, src) => { const s = gl.createShader (t); gl.shaderSource (s, src); gl.compileShader (s); return gl.getShaderParameter (s, gl.COMPILE_STATUS) ? s : null; };
		const vs = sh (gl.VERTEX_SHADER, VS), fs = sh (gl.FRAGMENT_SHADER, FS);
		if (!vs || !fs) return;
		const p = gl.createProgram (); gl.attachShader (p, vs); gl.attachShader (p, fs); gl.linkProgram (p);
		if (!gl.getProgramParameter (p, gl.LINK_STATUS)) return;
		this.cv = cv; this.gl = gl; this.p = p;
		this.aPos = gl.getAttribLocation (p, 'aPos'); this.aST = gl.getAttribLocation (p, 'aST'); this.aCol = gl.getAttribLocation (p, 'aCol');
		this.uM = gl.getUniformLocation (p, 'uM'); this.uHasT = gl.getUniformLocation (p, 'uHasT'); this.uWrap = gl.getUniformLocation (p, 'uWrap');
		this.uT = gl.getUniformLocation (p, 'uT');
		this.vb = gl.createBuffer ();
		this.bg = gl.createTexture ();			// (SCENE3D -1: the page as it was, under the frame)
		this.ok = true;
	}
	texture (T)					// a texture's GL object, made once
	{
		const gl = this.gl;
		if (T.gl) return T.gl;
		const t = gl.createTexture (), d = new Uint8Array (T.w * T.h * 4);
		for (let i = 0; i < T.w * T.h; i++) { const c = T.px[i]; d[i * 4] = (c >>> 16) & 255; d[i * 4 + 1] = (c >>> 8) & 255; d[i * 4 + 2] = c & 255; d[i * 4 + 3] = c >>> 24; }
		gl.bindTexture (gl.TEXTURE_2D, t);
		gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, T.w, T.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		T.gl = t;
		return t;
	}
	// The frame into dst (as swRender) -> true, false: not drawn (then the software renderer)
	render (dst, off, w, h, stride, sc, textures)
	{
		const gl = this.gl;
		if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
		gl.viewport (0, 0, w, h);
		gl.useProgram (this.p);
		gl.disable (gl.SCISSOR_TEST);
		gl.depthMask (true); gl.clearDepth (1);
		const cl = sc.clear;
		gl.clearColor (((cl >> 16) & 255) / 255, ((cl >> 8) & 255) / 255, (cl & 255) / 255, 1);
		gl.clear (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		const v = sc.v.subarray (0, sc.nv * VF);
		if (sc.keep) this.under (dst, off, w, h, stride, v.length);
		gl.bindBuffer (gl.ARRAY_BUFFER, this.vb);
		gl.bufferData (gl.ARRAY_BUFFER, v, gl.STREAM_DRAW);
		gl.enableVertexAttribArray (this.aPos); gl.vertexAttribPointer (this.aPos, 4, gl.FLOAT, false, VF * 4, 0);
		gl.enableVertexAttribArray (this.aST); gl.vertexAttribPointer (this.aST, 2, gl.FLOAT, false, VF * 4, 16);
		gl.enableVertexAttribArray (this.aCol); gl.vertexAttribPointer (this.aCol, 4, gl.FLOAT, false, VF * 4, 24);
		gl.enable (gl.DEPTH_TEST); gl.frontFace (gl.CCW);
		const ZF = [gl.LESS, gl.LESS, gl.EQUAL, gl.LEQUAL, gl.GREATER, gl.NOTEQUAL, gl.GEQUAL, gl.ALWAYS];
		const MT = new Float32Array (16);
		for (const B of sc.b)
		{
			if (!B.count) continue;
			const f = B.flags, zf = f & ZFUNC;
			gl.depthFunc (ZF[zf]); gl.depthMask (!(f & NOZWRITE) && zf !== 7);
			if (f & (CULL_BACK | CULL_FRONT)) { gl.enable (gl.CULL_FACE); gl.cullFace (f & CULL_BACK ? gl.BACK : gl.FRONT); } else gl.disable (gl.CULL_FACE);
			const bl = (f >> BLEND_SHIFT) & 15;
			if (!bl) gl.disable (gl.BLEND);
			else
			{
				gl.enable (gl.BLEND);
				if (bl === 1) gl.blendFunc (gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
				else if (bl === 2) gl.blendFunc (gl.SRC_ALPHA, gl.ONE);
				else if (bl === 3) gl.blendFunc (gl.DST_COLOR, gl.ZERO);
				else gl.blendFunc (gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			}
			const T = B.texture > 0 ? textures (B.texture) : null;
			if (T)
			{
				gl.activeTexture (gl.TEXTURE0); gl.bindTexture (gl.TEXTURE_2D, this.texture (T));
				const lin = f & LINEAR ? gl.LINEAR : gl.NEAREST;
				gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lin); gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin);
				gl.uniform1i (this.uT, 0); gl.uniform1i (this.uHasT, 1);
				gl.uniform2f (this.uWrap, (f >> WRAP_S_SHIFT) & 3, (f >> WRAP_T_SHIFT) & 3);
			}
			else gl.uniform1i (this.uHasT, 0);
			for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) MT[j * 4 + i] = B.m[i * 4 + j];	// (GL: by column)
			gl.uniformMatrix4fv (this.uM, false, MT);
			gl.drawArrays (gl.TRIANGLES, B.first, B.count);
		}
		// back into the page (GL's rows from the bottom)
		const px = new Uint8Array (w * h * 4);
		gl.readPixels (0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
		for (let y = 0; y < h; y++)
		{
			const s = (h - 1 - y) * w * 4, d = off + y * stride;
			for (let x = 0; x < w; x++) { const i = s + x * 4; dst[d + x] = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; }
		}
		return true;
	}
	// SCENE3D -1: the page's pixels drawn first (a quad, no depth)
	under (dst, off, w, h, stride)
	{
		const gl = this.gl, d = new Uint8Array (w * h * 4);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++)
			{
				const c = dst[off + y * stride + x], i = ((h - 1 - y) * w + x) * 4;
				d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
			}
		gl.bindTexture (gl.TEXTURE_2D, this.bg);
		gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		const q = new Float32Array ([-1, -1, 0, 1, 0, 0, 255, 255, 255, 255, 1, -1, 0, 1, 1, 0, 255, 255, 255, 255, 1, 1, 0, 1, 1, 1, 255, 255, 255, 255,
			-1, -1, 0, 1, 0, 0, 255, 255, 255, 255, 1, 1, 0, 1, 1, 1, 255, 255, 255, 255, -1, 1, 0, 1, 0, 1, 255, 255, 255, 255]);
		gl.bindBuffer (gl.ARRAY_BUFFER, this.vb);
		gl.bufferData (gl.ARRAY_BUFFER, q, gl.STREAM_DRAW);
		gl.enableVertexAttribArray (this.aPos); gl.vertexAttribPointer (this.aPos, 4, gl.FLOAT, false, VF * 4, 0);
		gl.enableVertexAttribArray (this.aST); gl.vertexAttribPointer (this.aST, 2, gl.FLOAT, false, VF * 4, 16);
		gl.enableVertexAttribArray (this.aCol); gl.vertexAttribPointer (this.aCol, 4, gl.FLOAT, false, VF * 4, 24);
		gl.disable (gl.DEPTH_TEST); gl.disable (gl.CULL_FACE); gl.disable (gl.BLEND);
		gl.uniformMatrix4fv (this.uM, false, new Float32Array ([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
		gl.activeTexture (gl.TEXTURE0); gl.uniform1i (this.uT, 0); gl.uniform1i (this.uHasT, 1); gl.uniform2f (this.uWrap, 1, 1);
		gl.drawArrays (gl.TRIANGLES, 0, 6);
	}
}

// ---- what the screen uses: a 3D state for a page, its textures, VIEW3D ---------------------------------------------------
class Render3D
{
	constructor () { this.scene = new Scene3D (); this.textures = []; this.view = null; this.gl = undefined; this.forceSoft = false; }
	gpu () { if (this.gl === undefined) this.gl = this.forceSoft ? null : new GLRenderer (); return !!(this.gl && this.gl.ok); }
	// GRAB3D: px 0xRRGGBB ints, w x h; magenta = transparent -> its number
	addTexture (rgb, w, h)
	{
		const px = new Uint32Array (w * h);
		for (let i = 0; i < w * h; i++) { const c = rgb[i] & 0xFFFFFF; px[i] = c === 0xFF00FF ? 0 : (0xFF000000 | c) >>> 0; }
		this.textures.push ({ px, w, h, gl: null });
		return this.textures.length;
	}
	aspect (W, H, pixelAspect)
	{
		const v = this.view, w = v ? v.w : W, h = v ? v.h : H;
		return w / (h > 0 ? h : 1) * (pixelAspect || 1);
	}
	// RENDER3D into the page (dst: W x H ints 0xRRGGBB)
	render (dst, W, H)
	{
		let x0 = 0, y0 = 0, w = W, h = H;
		const v = this.view;
		if (v && v.w > 0 && v.h > 0)
		{
			x0 = Math.max (0, v.x); y0 = Math.max (0, v.y);
			const x1 = Math.min (W, v.x + v.w), y1 = Math.min (H, v.y + v.h);
			if (x1 <= x0 || y1 <= y0) return;
			w = x1 - x0; h = y1 - y0;
		}
		const tex = (n) => this.textures[n - 1] || null;
		if (!(this.gpu () && this.gl.render (dst, y0 * W + x0, w, h, W, this.scene, tex))) swRender (dst, y0 * W + x0, w, h, W, this.scene, tex);
	}
}

global.Basic3D = { Scene3D, Render3D, swRender, CULL_BACK, CULL_FRONT, NOZWRITE, BLEND_SHIFT, LINEAR, WRAP_S_SHIFT, WRAP_T_SHIFT, ZFUNC };
if (typeof module !== 'undefined') module.exports = global.Basic3D;
}) (typeof window !== 'undefined' ? window : globalThis);
