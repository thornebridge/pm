const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const REQUIRED_COLOR_KEYS = [
	'brand-50', 'brand-100', 'brand-200', 'brand-300', 'brand-400',
	'brand-500', 'brand-600', 'brand-700', 'brand-800', 'brand-900',
	'surface-50', 'surface-100', 'surface-200', 'surface-300', 'surface-400',
	'surface-500', 'surface-600', 'surface-700', 'surface-800', 'surface-900'
] as const;

export type ThemeTexture = 'none' | 'grid' | 'dots';
export type ThemeCardStyle = 'rounded' | 'square';
export type ThemeDepthStyle = 'shadow' | 'flat' | 'glass';
export type ThemeGradient = 'none' | 'subtle' | 'vivid';
export type ThemeRadius = 'none' | 'small' | 'medium' | 'large' | 'pill';
export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';
export type ThemeSidebarStyle = 'default' | 'transparent' | 'accent';
export type ThemeBorderWidth = 'none' | 'thin' | 'default' | 'thick';
export type ThemeAnimation = 'none' | 'subtle' | 'smooth';

export interface ParsedTheme {
	name: string;
	description: string;
	colors: Record<string, string>;
	font?: string;
	headingFont?: string;
	monoFont?: string;
	mode?: 'dark' | 'light';
	texture?: ThemeTexture;
	cardStyle?: ThemeCardStyle;
	depthStyle?: ThemeDepthStyle;
	gradient?: ThemeGradient;
	accent?: string;
	success?: string;
	warning?: string;
	error?: string;
	info?: string;
	radius?: ThemeRadius;
	density?: ThemeDensity;
	sidebarStyle?: ThemeSidebarStyle;
	borderWidth?: ThemeBorderWidth;
	animation?: ThemeAnimation;
}

export interface ThemeValidationResult {
	valid: boolean;
	errors: string[];
	theme?: ParsedTheme;
}

/**
 * Parse a .pmtheme markdown string into structured data.
 */
export function parsePmTheme(source: string): ParsedTheme {
	const lines = source.split('\n');

	// Extract name from first # heading
	let name = 'Untitled';
	let description = '';
	let foundHeading = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!foundHeading && line.startsWith('# ') && !line.startsWith('## ')) {
			name = line.slice(2).trim();
			foundHeading = true;
			// Grab the next non-empty, non-heading line as description
			for (let j = i + 1; j < lines.length; j++) {
				const desc = lines[j].trim();
				if (desc === '' || desc.startsWith('#') || desc.startsWith('```')) continue;
				description = desc;
				break;
			}
			break;
		}
	}

	// Extract key-value pairs from ```pmtheme fenced blocks
	const colors: Record<string, string> = {};
	let font: string | undefined;
	let headingFont: string | undefined;
	let monoFont: string | undefined;
	let mode: 'dark' | 'light' | undefined;
	let texture: ThemeTexture | undefined;
	let cardStyle: ThemeCardStyle | undefined;
	let depthStyle: ThemeDepthStyle | undefined;
	let gradient: ThemeGradient | undefined;
	let accent: string | undefined;
	let success: string | undefined;
	let warning: string | undefined;
	let error: string | undefined;
	let info: string | undefined;
	let radius: ThemeRadius | undefined;
	let density: ThemeDensity | undefined;
	let sidebarStyle: ThemeSidebarStyle | undefined;
	let borderWidth: ThemeBorderWidth | undefined;
	let animation: ThemeAnimation | undefined;

	const TEXTURES: ThemeTexture[] = ['none', 'grid', 'dots'];
	const CARD_STYLES: ThemeCardStyle[] = ['rounded', 'square'];
	const DEPTH_STYLES: ThemeDepthStyle[] = ['shadow', 'flat', 'glass'];
	const GRADIENTS: ThemeGradient[] = ['none', 'subtle', 'vivid'];
	const RADII: ThemeRadius[] = ['none', 'small', 'medium', 'large', 'pill'];
	const DENSITIES: ThemeDensity[] = ['compact', 'comfortable', 'spacious'];
	const SIDEBAR_STYLES: ThemeSidebarStyle[] = ['default', 'transparent', 'accent'];
	const BORDER_WIDTHS: ThemeBorderWidth[] = ['none', 'thin', 'default', 'thick'];
	const ANIMATIONS: ThemeAnimation[] = ['none', 'subtle', 'smooth'];

	const blockRegex = /```pmtheme\s*\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;

	while ((match = blockRegex.exec(source)) !== null) {
		const block = match[1];
		for (const blockLine of block.split('\n')) {
			const trimmed = blockLine.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const colonIdx = trimmed.indexOf(':');
			if (colonIdx === -1) continue;

			const key = trimmed.slice(0, colonIdx).trim();
			const value = trimmed.slice(colonIdx + 1).trim();

			if (key === 'font') {
				font = value;
			} else if (key === 'heading-font') {
				headingFont = value;
			} else if (key === 'mono-font') {
				monoFont = value;
			} else if (key === 'mode' && (value === 'dark' || value === 'light')) {
				mode = value;
			} else if (key === 'texture' && TEXTURES.includes(value as ThemeTexture)) {
				texture = value as ThemeTexture;
			} else if (key === 'card-style' && CARD_STYLES.includes(value as ThemeCardStyle)) {
				cardStyle = value as ThemeCardStyle;
			} else if (key === 'depth-style' && DEPTH_STYLES.includes(value as ThemeDepthStyle)) {
				depthStyle = value as ThemeDepthStyle;
			} else if (key === 'gradient' && GRADIENTS.includes(value as ThemeGradient)) {
				gradient = value as ThemeGradient;
			} else if (key === 'accent' && HEX_PATTERN.test(value)) {
				accent = value;
			} else if (key === 'success' && HEX_PATTERN.test(value)) {
				success = value;
			} else if (key === 'warning' && HEX_PATTERN.test(value)) {
				warning = value;
			} else if (key === 'error' && HEX_PATTERN.test(value)) {
				error = value;
			} else if (key === 'info' && HEX_PATTERN.test(value)) {
				info = value;
			} else if (key === 'radius' && RADII.includes(value as ThemeRadius)) {
				radius = value as ThemeRadius;
			} else if (key === 'density' && DENSITIES.includes(value as ThemeDensity)) {
				density = value as ThemeDensity;
			} else if (key === 'sidebar-style' && SIDEBAR_STYLES.includes(value as ThemeSidebarStyle)) {
				sidebarStyle = value as ThemeSidebarStyle;
			} else if (key === 'border-width' && BORDER_WIDTHS.includes(value as ThemeBorderWidth)) {
				borderWidth = value as ThemeBorderWidth;
			} else if (key === 'animation' && ANIMATIONS.includes(value as ThemeAnimation)) {
				animation = value as ThemeAnimation;
			} else if (key.startsWith('brand-') || key.startsWith('surface-')) {
				colors[key] = value;
			}
		}
	}

	return {
		name, description, colors, font, headingFont, monoFont, mode,
		texture, cardStyle, depthStyle, gradient,
		accent, success, warning, error, info,
		radius, density, sidebarStyle, borderWidth, animation
	};
}

/**
 * Validate a parsed theme has all required color keys with valid hex values.
 */
export function validateTheme(source: string): ThemeValidationResult {
	const errors: string[] = [];

	let theme: ParsedTheme;
	try {
		theme = parsePmTheme(source);
	} catch {
		return { valid: false, errors: ['Failed to parse .pmtheme source'] };
	}

	if (!theme.name || theme.name === 'Untitled') {
		errors.push('Missing theme name (# heading)');
	}

	for (const key of REQUIRED_COLOR_KEYS) {
		if (!theme.colors[key]) {
			errors.push(`Missing required color: ${key}`);
		} else if (!HEX_PATTERN.test(theme.colors[key])) {
			errors.push(`Invalid hex color for ${key}: ${theme.colors[key]}`);
		}
	}

	// Check for unexpected keys (XSS prevention)
	for (const [key, value] of Object.entries(theme.colors)) {
		if (!HEX_PATTERN.test(value)) {
			errors.push(`Invalid hex color for ${key}: ${value}`);
		}
	}

	if (theme.font && theme.font.length > 200) {
		errors.push('Font value too long (max 200 chars)');
	}
	if (theme.headingFont && theme.headingFont.length > 200) {
		errors.push('Heading font value too long (max 200 chars)');
	}
	if (theme.monoFont && theme.monoFont.length > 200) {
		errors.push('Mono font value too long (max 200 chars)');
	}

	// Validate semantic color hex values
	const semanticKeys = ['accent', 'success', 'warning', 'error', 'info'] as const;
	for (const key of semanticKeys) {
		if (theme[key] && !HEX_PATTERN.test(theme[key]!)) {
			errors.push(`Invalid hex color for ${key}: ${theme[key]}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		theme: errors.length === 0 ? theme : undefined
	};
}

/**
 * Convert a parsed theme into a CSS variable map for storage and runtime injection.
 */
export function themeToVariables(theme: ParsedTheme): Record<string, string> {
	const vars: Record<string, string> = {};

	for (const [key, value] of Object.entries(theme.colors)) {
		vars[`--color-${key}`] = value;
	}

	if (theme.font) vars['--font-sans'] = theme.font;
	if (theme.headingFont) vars['--font-heading'] = theme.headingFont;
	if (theme.monoFont) vars['--font-mono'] = theme.monoFont;

	if (theme.texture) vars['--pm-texture'] = theme.texture;
	if (theme.cardStyle) vars['--pm-card-style'] = theme.cardStyle;
	if (theme.depthStyle) vars['--pm-depth-style'] = theme.depthStyle;
	if (theme.gradient) vars['--pm-gradient'] = theme.gradient;

	if (theme.accent) vars['--color-accent'] = theme.accent;
	if (theme.success) vars['--color-success'] = theme.success;
	if (theme.warning) vars['--color-warning'] = theme.warning;
	if (theme.error) vars['--color-error'] = theme.error;
	if (theme.info) vars['--color-info'] = theme.info;

	if (theme.radius) vars['--pm-radius'] = theme.radius;
	if (theme.density) vars['--pm-density'] = theme.density;
	if (theme.sidebarStyle) vars['--pm-sidebar-style'] = theme.sidebarStyle;
	if (theme.borderWidth) vars['--pm-border-width'] = theme.borderWidth;
	if (theme.animation) vars['--pm-animation'] = theme.animation;

	return vars;
}
