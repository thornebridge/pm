/**
 * Color utilities for theme builder: HSL conversion + palette auto-generation.
 */

export function hexToHsl(hex: string): [number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return [0, 0, 0];

	const r = parseInt(result[1], 16) / 255;
	const g = parseInt(result[2], 16) / 255;
	const b = parseInt(result[3], 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
			case g: h = ((b - r) / d + 2) / 6; break;
			case b: h = ((r - g) / d + 4) / 6; break;
		}
	}

	return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h: number, s: number, l: number): string {
	h = h / 360;
	s = s / 100;
	l = l / 100;

	let r: number, g: number, b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	const toHex = (x: number) => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

// Lightness targets for brand palette (500 is anchor)
const BRAND_LIGHTNESS = [97, 92, 83, 72, 58, -1, 35, 25, 18, 12];

// Saturation scaling at extremes
const BRAND_SAT_SCALE = [0.3, 0.5, 0.7, 0.85, 0.95, 1, 0.95, 0.9, 0.8, 0.7];

/**
 * Generate a full 10-shade brand palette from a base hex (used as 500).
 */
export function generateBrandPalette(baseHex: string): Record<string, string> {
	const [h, s] = hexToHsl(baseHex);
	const palette: Record<string, string> = {};

	for (let i = 0; i < SHADE_KEYS.length; i++) {
		const key = `brand-${SHADE_KEYS[i]}`;
		if (SHADE_KEYS[i] === '500') {
			palette[key] = baseHex;
		} else {
			const targetL = BRAND_LIGHTNESS[i];
			const scaledS = Math.round(s * BRAND_SAT_SCALE[i]);
			palette[key] = hslToHex(h, scaledS, targetL);
		}
	}

	return palette;
}

// Surface palette: very low saturation
const SURFACE_LIGHTNESS = [97, 94, 90, 85, 75, 65, 52, 40, 27, 10];
const SURFACE_SAT_SCALE = [0.15, 0.15, 0.12, 0.1, 0.08, 0.08, 0.07, 0.06, 0.06, 0.05];

/**
 * Generate a full 10-shade surface palette from a base hex (used as 500).
 */
export function generateSurfacePalette(baseHex: string): Record<string, string> {
	const [h, s] = hexToHsl(baseHex);
	const palette: Record<string, string> = {};

	for (let i = 0; i < SHADE_KEYS.length; i++) {
		const key = `surface-${SHADE_KEYS[i]}`;
		const targetL = SURFACE_LIGHTNESS[i];
		const scaledS = Math.round(Math.min(s, 100) * SURFACE_SAT_SCALE[i]);
		palette[key] = hslToHex(h, scaledS, targetL);
	}

	return palette;
}

export function isValidHex(hex: string): boolean {
	return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}
