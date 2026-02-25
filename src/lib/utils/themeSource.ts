/**
 * Client-side .pmtheme builder and parser for the visual theme builder.
 */

export interface ThemeBuilderState {
	name: string;
	description: string;
	colors: Record<string, string>;
	font: string;
	headingFont: string;
	monoFont: string;
	mode: 'dark' | 'light';
	accent: string;
	success: string;
	warning: string;
	error: string;
	info: string;
	radius: 'none' | 'small' | 'medium' | 'large' | 'pill';
	density: 'compact' | 'comfortable' | 'spacious';
	sidebarStyle: 'default' | 'transparent' | 'accent';
	borderWidth: 'none' | 'thin' | 'default' | 'thick';
	texture: 'none' | 'grid' | 'dots';
	cardStyle: 'rounded' | 'square';
	depthStyle: 'shadow' | 'flat' | 'glass';
	gradient: 'none' | 'subtle' | 'vivid';
	animation: 'none' | 'subtle' | 'smooth';
}

export const DEFAULT_STATE: ThemeBuilderState = {
	name: '',
	description: '',
	colors: {},
	font: 'Inter, ui-sans-serif, system-ui, sans-serif',
	headingFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
	monoFont: 'JetBrains Mono, ui-monospace, monospace',
	mode: 'dark',
	accent: '#8b5cf6',
	success: '#22c55e',
	warning: '#f59e0b',
	error: '#ef4444',
	info: '#3b82f6',
	radius: 'medium',
	density: 'comfortable',
	sidebarStyle: 'default',
	borderWidth: 'default',
	texture: 'none',
	cardStyle: 'rounded',
	depthStyle: 'shadow',
	gradient: 'none',
	animation: 'subtle'
};

const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

/**
 * Build a valid .pmtheme markdown string from builder state.
 */
export function buildPmThemeSource(state: ThemeBuilderState): string {
	const lines: string[] = [];

	lines.push(`# ${state.name || 'Untitled'}`);
	lines.push('');
	if (state.description) {
		lines.push(state.description);
		lines.push('');
	}

	// Colors section
	lines.push('## Colors');
	lines.push('');
	lines.push('```pmtheme');
	lines.push('# Brand');
	for (const shade of SHADE_KEYS) {
		const key = `brand-${shade}`;
		lines.push(`${key}: ${state.colors[key] || '#000000'}`);
	}
	lines.push('');
	lines.push('# Surface');
	for (const shade of SHADE_KEYS) {
		const key = `surface-${shade}`;
		lines.push(`${key}: ${state.colors[key] || '#000000'}`);
	}
	lines.push('```');
	lines.push('');

	// Options section
	lines.push('## Options');
	lines.push('');
	lines.push('```pmtheme');

	lines.push('# Typography');
	lines.push(`font: ${state.font}`);
	if (state.headingFont && state.headingFont !== state.font) {
		lines.push(`heading-font: ${state.headingFont}`);
	}
	if (state.monoFont) {
		lines.push(`mono-font: ${state.monoFont}`);
	}
	lines.push('');

	lines.push('# Mode');
	lines.push(`mode: ${state.mode}`);
	lines.push('');

	lines.push('# Semantic colors');
	lines.push(`accent: ${state.accent}`);
	lines.push(`success: ${state.success}`);
	lines.push(`warning: ${state.warning}`);
	lines.push(`error: ${state.error}`);
	lines.push(`info: ${state.info}`);
	lines.push('');

	lines.push('# Layout & Shape');
	lines.push(`radius: ${state.radius}`);
	lines.push(`density: ${state.density}`);
	lines.push(`sidebar-style: ${state.sidebarStyle}`);
	lines.push(`border-width: ${state.borderWidth}`);
	lines.push('');

	lines.push('# Visual effects');
	lines.push(`texture: ${state.texture}`);
	lines.push(`card-style: ${state.cardStyle}`);
	lines.push(`depth-style: ${state.depthStyle}`);
	lines.push(`gradient: ${state.gradient}`);
	lines.push(`animation: ${state.animation}`);

	lines.push('```');

	return lines.join('\n');
}

/**
 * Parse a .pmtheme source string into ThemeBuilderState for loading into the builder.
 */
export function parseThemeSource(source: string): ThemeBuilderState {
	const state: ThemeBuilderState = { ...DEFAULT_STATE, colors: { ...DEFAULT_STATE.colors } };

	// Extract name
	const nameMatch = source.match(/^# (.+)$/m);
	if (nameMatch) state.name = nameMatch[1].trim();

	// Extract description (first non-empty, non-heading line after heading)
	const lines = source.split('\n');
	let foundHeading = false;
	for (const line of lines) {
		const trimmed = line.trim();
		if (!foundHeading && trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
			foundHeading = true;
			continue;
		}
		if (foundHeading && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
			state.description = trimmed;
			break;
		}
	}

	// Parse all fenced blocks
	const blockRegex = /```pmtheme\s*\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;

	while ((match = blockRegex.exec(source)) !== null) {
		for (const blockLine of match[1].split('\n')) {
			const trimmed = blockLine.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const colonIdx = trimmed.indexOf(':');
			if (colonIdx === -1) continue;

			const key = trimmed.slice(0, colonIdx).trim();
			const value = trimmed.slice(colonIdx + 1).trim();

			if (key.startsWith('brand-') || key.startsWith('surface-')) {
				state.colors[key] = value;
			} else if (key === 'font') {
				state.font = value;
			} else if (key === 'heading-font') {
				state.headingFont = value;
			} else if (key === 'mono-font') {
				state.monoFont = value;
			} else if (key === 'mode' && (value === 'dark' || value === 'light')) {
				state.mode = value;
			} else if (key === 'accent') {
				state.accent = value;
			} else if (key === 'success') {
				state.success = value;
			} else if (key === 'warning') {
				state.warning = value;
			} else if (key === 'error') {
				state.error = value;
			} else if (key === 'info') {
				state.info = value;
			} else if (key === 'radius') {
				state.radius = value as ThemeBuilderState['radius'];
			} else if (key === 'density') {
				state.density = value as ThemeBuilderState['density'];
			} else if (key === 'sidebar-style') {
				state.sidebarStyle = value as ThemeBuilderState['sidebarStyle'];
			} else if (key === 'border-width') {
				state.borderWidth = value as ThemeBuilderState['borderWidth'];
			} else if (key === 'texture') {
				state.texture = value as ThemeBuilderState['texture'];
			} else if (key === 'card-style') {
				state.cardStyle = value as ThemeBuilderState['cardStyle'];
			} else if (key === 'depth-style') {
				state.depthStyle = value as ThemeBuilderState['depthStyle'];
			} else if (key === 'gradient') {
				state.gradient = value as ThemeBuilderState['gradient'];
			} else if (key === 'animation') {
				state.animation = value as ThemeBuilderState['animation'];
			}
		}
	}

	return state;
}
