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

export const OCEAN_SOURCE = `# Ocean

A cool teal theme inspired by deep waters.

## Colors

\`\`\`pmtheme
brand-50: #f0fdfa
brand-100: #ccfbf1
brand-200: #99f6e4
brand-300: #5eead4
brand-400: #2dd4bf
brand-500: #14b8a6
brand-600: #0d9488
brand-700: #0f766e
brand-800: #115e59
brand-900: #134e4a
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

export const ROSE_SOURCE = `# Rose

A soft pink theme with warm undertones.

## Colors

\`\`\`pmtheme
brand-50: #fff1f2
brand-100: #ffe4e6
brand-200: #fecdd3
brand-300: #fda4af
brand-400: #fb7185
brand-500: #f43f5e
brand-600: #e11d48
brand-700: #be123c
brand-800: #9f1239
brand-900: #881337
surface-50: #fafafa
surface-100: #f4f4f5
surface-200: #e4e4e7
surface-300: #d4d4d8
surface-400: #a1a1aa
surface-500: #71717a
surface-600: #52525b
surface-700: #3f3f46
surface-800: #27272a
surface-900: #18181b
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const VIOLET_SOURCE = `# Violet

A rich purple theme for a creative workspace.

## Colors

\`\`\`pmtheme
brand-50: #f5f3ff
brand-100: #ede9fe
brand-200: #ddd6fe
brand-300: #c4b5fd
brand-400: #a78bfa
brand-500: #8b5cf6
brand-600: #7c3aed
brand-700: #6d28d9
brand-800: #5b21b6
brand-900: #4c1d95
surface-50: #fafafa
surface-100: #f4f4f5
surface-200: #e4e4e7
surface-300: #d4d4d8
surface-400: #a1a1aa
surface-500: #71717a
surface-600: #52525b
surface-700: #3f3f46
surface-800: #27272a
surface-900: #18181b
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const MIDNIGHT_SOURCE = `# Midnight

A deep indigo theme for late-night sessions.

## Colors

\`\`\`pmtheme
brand-50: #eef2ff
brand-100: #e0e7ff
brand-200: #c7d2fe
brand-300: #a5b4fc
brand-400: #818cf8
brand-500: #6366f1
brand-600: #4f46e5
brand-700: #4338ca
brand-800: #3730a3
brand-900: #312e81
surface-50: #f5f5f5
surface-100: #ebebeb
surface-200: #d4d4d4
surface-300: #b0b0b0
surface-400: #7a7a7a
surface-500: #555555
surface-600: #404040
surface-700: #2d2d2d
surface-800: #1a1a2e
surface-900: #0d0d1a
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const MOCHA_SOURCE = `# Mocha

A warm brown theme like a cozy coffee shop.

## Colors

\`\`\`pmtheme
brand-50: #fdf8f6
brand-100: #f2e8e5
brand-200: #eaddd7
brand-300: #e6d3c8
brand-400: #c4a882
brand-500: #a47551
brand-600: #8b5e3c
brand-700: #6f4b31
brand-800: #553a27
brand-900: #3d2b1f
surface-50: #faf8f5
surface-100: #f5f0ea
surface-200: #e8e0d5
surface-300: #d6c9b8
surface-400: #b8a48e
surface-500: #968069
surface-600: #7a6555
surface-700: #5e4d42
surface-800: #3d3330
surface-900: #1f1a18
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const CRIMSON_SOURCE = `# Crimson

A bold red theme with sharp contrast.

## Colors

\`\`\`pmtheme
brand-50: #fef2f2
brand-100: #fee2e2
brand-200: #fecaca
brand-300: #fca5a5
brand-400: #f87171
brand-500: #ef4444
brand-600: #dc2626
brand-700: #b91c1c
brand-800: #991b1b
brand-900: #7f1d1d
surface-50: #fafafa
surface-100: #f5f5f5
surface-200: #e5e5e5
surface-300: #d4d4d4
surface-400: #a3a3a3
surface-500: #737373
surface-600: #525252
surface-700: #404040
surface-800: #262626
surface-900: #171717
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const ARCTIC_SOURCE = `# Arctic

A crisp ice-blue light theme for bright workspaces.

## Colors

\`\`\`pmtheme
brand-50: #ecfeff
brand-100: #cffafe
brand-200: #a5f3fc
brand-300: #67e8f9
brand-400: #22d3ee
brand-500: #06b6d4
brand-600: #0891b2
brand-700: #0e7490
brand-800: #155e75
brand-900: #164e63
surface-50: #f9fafb
surface-100: #f3f4f6
surface-200: #e5e7eb
surface-300: #d1d5db
surface-400: #9ca3af
surface-500: #6b7280
surface-600: #4b5563
surface-700: #374151
surface-800: #1f2937
surface-900: #111827
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: light
\`\`\`
`;

export const SUNSET_SOURCE = `# Sunset

A warm orange theme like a desert sky.

## Colors

\`\`\`pmtheme
brand-50: #fff7ed
brand-100: #ffedd5
brand-200: #fed7aa
brand-300: #fdba74
brand-400: #fb923c
brand-500: #f97316
brand-600: #ea580c
brand-700: #c2410c
brand-800: #9a3412
brand-900: #7c2d12
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

export const NEON_SOURCE = `# Neon

An electric cyan theme for a futuristic vibe.

## Colors

\`\`\`pmtheme
brand-50: #ecfeff
brand-100: #cffafe
brand-200: #a5f3fc
brand-300: #67e8f9
brand-400: #22d3ee
brand-500: #00e5ff
brand-600: #00b8d4
brand-700: #0097a7
brand-800: #00838f
brand-900: #006064
surface-50: #e8eaf6
surface-100: #c5cae9
surface-200: #9fa8da
surface-300: #7986cb
surface-400: #5c6bc0
surface-500: #3f51b5
surface-600: #303f9f
surface-700: #1a237e
surface-800: #121838
surface-900: #0a0e1f
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const SAGE_SOURCE = `# Sage

A muted olive theme for a calm workspace.

## Colors

\`\`\`pmtheme
brand-50: #f6f7f4
brand-100: #e8ebe0
brand-200: #d4d9c4
brand-300: #b5bd9b
brand-400: #97a17a
brand-500: #7c865f
brand-600: #626b4b
brand-700: #4d543c
brand-800: #3f4433
brand-900: #363a2d
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

export const LAVENDER_SOURCE = `# Lavender

A gentle purple light theme for a serene feel.

## Colors

\`\`\`pmtheme
brand-50: #faf5ff
brand-100: #f3e8ff
brand-200: #e9d5ff
brand-300: #d8b4fe
brand-400: #c084fc
brand-500: #a855f7
brand-600: #9333ea
brand-700: #7e22ce
brand-800: #6b21a8
brand-900: #581c87
surface-50: #faf9fb
surface-100: #f4f2f7
surface-200: #e8e5ef
surface-300: #d5d0e0
surface-400: #a8a1b6
surface-500: #7c758e
surface-600: #5e586e
surface-700: #454054
surface-800: #2e2a3a
surface-900: #1a1722
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: light
\`\`\`
`;

export const COBALT_SOURCE = `# Cobalt

A deep blue theme for focused work.

## Colors

\`\`\`pmtheme
brand-50: #eff6ff
brand-100: #dbeafe
brand-200: #bfdbfe
brand-300: #93c5fd
brand-400: #60a5fa
brand-500: #2563eb
brand-600: #1d4ed8
brand-700: #1e40af
brand-800: #1e3a8a
brand-900: #172554
surface-50: #f8f9fa
surface-100: #eef0f4
surface-200: #d8dce6
surface-300: #b8bfcc
surface-400: #8891a3
surface-500: #5e687a
surface-600: #454e5e
surface-700: #333b49
surface-800: #1e2433
surface-900: #0e1320
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: dark
\`\`\`
`;

export const SAND_SOURCE = `# Sand

A warm golden light theme like sun-baked dunes.

## Colors

\`\`\`pmtheme
brand-50: #fefce8
brand-100: #fef9c3
brand-200: #fef08a
brand-300: #fde047
brand-400: #facc15
brand-500: #eab308
brand-600: #ca8a04
brand-700: #a16207
brand-800: #854d0e
brand-900: #713f12
surface-50: #fafaf5
surface-100: #f5f5eb
surface-200: #e8e8d8
surface-300: #d6d6c2
surface-400: #a8a88e
surface-500: #7a7a64
surface-600: #5c5c48
surface-700: #454536
surface-800: #2e2e24
surface-900: #1a1a14
\`\`\`

## Options

\`\`\`pmtheme
font: Inter, ui-sans-serif, system-ui, sans-serif
mode: light
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
	makeBuiltin('ember', EMBER_SOURCE),
	makeBuiltin('ocean', OCEAN_SOURCE),
	makeBuiltin('rose', ROSE_SOURCE),
	makeBuiltin('violet', VIOLET_SOURCE),
	makeBuiltin('midnight', MIDNIGHT_SOURCE),
	makeBuiltin('mocha', MOCHA_SOURCE),
	makeBuiltin('crimson', CRIMSON_SOURCE),
	makeBuiltin('arctic', ARCTIC_SOURCE),
	makeBuiltin('sunset', SUNSET_SOURCE),
	makeBuiltin('neon', NEON_SOURCE),
	makeBuiltin('sage', SAGE_SOURCE),
	makeBuiltin('lavender', LAVENDER_SOURCE),
	makeBuiltin('cobalt', COBALT_SOURCE),
	makeBuiltin('sand', SAND_SOURCE)
];

export function getBuiltinTheme(id: string): BuiltinTheme | undefined {
	return BUILTIN_THEMES.find((t) => t.id === id);
}
