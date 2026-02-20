const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const REQUIRED_COLOR_KEYS = [
	'brand-50', 'brand-100', 'brand-200', 'brand-300', 'brand-400',
	'brand-500', 'brand-600', 'brand-700', 'brand-800', 'brand-900',
	'surface-50', 'surface-100', 'surface-200', 'surface-300', 'surface-400',
	'surface-500', 'surface-600', 'surface-700', 'surface-800', 'surface-900'
] as const;

export interface ParsedTheme {
	name: string;
	description: string;
	colors: Record<string, string>;
	font?: string;
	mode?: 'dark' | 'light';
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
	let mode: 'dark' | 'light' | undefined;

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
			} else if (key === 'mode' && (value === 'dark' || value === 'light')) {
				mode = value;
			} else if (key.startsWith('brand-') || key.startsWith('surface-')) {
				colors[key] = value;
			}
		}
	}

	return { name, description, colors, font, mode };
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

	if (theme.font) {
		vars['--font-sans'] = theme.font;
	}

	return vars;
}
