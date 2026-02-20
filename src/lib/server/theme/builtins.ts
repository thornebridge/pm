import { parsePmTheme, themeToVariables } from './parser.js';

export const FOREST_SOURCE = `# Forest

The default warm green theme for a natural workspace.

## Colors

\`\`\`pmtheme
brand-50: #f0f7f3
brand-100: #dce8e1
brand-200: #b5d1c0
brand-300: #8cb99e
brand-400: #5e9a78
brand-500: #3d7a5c
brand-600: #2d4f3e
brand-700: #243f32
brand-800: #1b3027
brand-900: #12201a
surface-50: #faf9f7
surface-100: #f3f1ed
surface-200: #ebe8e3
surface-300: #ddd9d2
surface-400: #c4bfb6
surface-500: #a8a198
surface-600: #8a847b
surface-700: #6b665e
surface-800: #49453f
surface-900: #1c1917
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const SLATE_SOURCE = `# Slate

A cool blue-gray theme for a focused workspace.

## Colors

\`\`\`pmtheme
brand-50: #eff6ff
brand-100: #dbeafe
brand-200: #bfdbfe
brand-300: #93c5fd
brand-400: #60a5fa
brand-500: #3b82f6
brand-600: #2563eb
brand-700: #1d4ed8
brand-800: #1e40af
brand-900: #172554
surface-50: #f8fafc
surface-100: #f1f5f9
surface-200: #e2e8f0
surface-300: #cbd5e1
surface-400: #94a3b8
surface-500: #64748b
surface-600: #475569
surface-700: #334155
surface-800: #1e293b
surface-900: #0f172a
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const EMBER_SOURCE = `# Ember

A warm amber theme with rich earth tones.

## Colors

\`\`\`pmtheme
brand-50: #fffbeb
brand-100: #fef3c7
brand-200: #fde68a
brand-300: #fcd34d
brand-400: #fbbf24
brand-500: #f59e0b
brand-600: #d97706
brand-700: #b45309
brand-800: #92400e
brand-900: #78350f
surface-50: #fafaf9
surface-100: #f5f5f4
surface-200: #e7e5e4
surface-300: #d6d3d1
surface-400: #a8a29e
surface-500: #78716c
surface-600: #57534e
surface-700: #44403c
surface-800: #292524
surface-900: #1c1917
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export interface BuiltinTheme {
	id: string;
	name: string;
	description: string;
	source: string;
	variables: Record<string, string>;
	mode: 'dark' | 'light';
	builtin: true;
}

function makeBuiltin(id: string, source: string): BuiltinTheme {
	const parsed = parsePmTheme(source);
	return {
		id,
		name: parsed.name,
		description: parsed.description,
		source,
		variables: themeToVariables(parsed),
		mode: parsed.mode || 'dark',
		builtin: true
	};
}

export const BUILTIN_THEMES: BuiltinTheme[] = [
	makeBuiltin('forest', FOREST_SOURCE),
	makeBuiltin('slate', SLATE_SOURCE),
	makeBuiltin('ember', EMBER_SOURCE)
];

export function getBuiltinTheme(id: string): BuiltinTheme | undefined {
	return BUILTIN_THEMES.find((t) => t.id === id);
}
