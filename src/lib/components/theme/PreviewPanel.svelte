<script lang="ts">
	import type { ThemeBuilderState } from '$lib/utils/themeSource.js';
	import PreviewSidebar from './PreviewSidebar.svelte';
	import PreviewTaskCards from './PreviewTaskCards.svelte';
	import PreviewButtons from './PreviewButtons.svelte';
	import PreviewFormInputs from './PreviewFormInputs.svelte';
	import PreviewKanban from './PreviewKanban.svelte';

	interface Props {
		state: ThemeBuilderState;
	}
	let { state }: Props = $props();

	const cssVars = $derived.by(() => {
		const parts: string[] = [];
		// Color variables
		for (const [key, value] of Object.entries(state.colors)) {
			parts.push(`--color-${key}: ${value}`);
		}
		// Font variables
		if (state.font) parts.push(`--font-sans: ${state.font}`);
		if (state.headingFont) parts.push(`--font-heading: ${state.headingFont}`);
		if (state.monoFont) parts.push(`--font-mono: ${state.monoFont}`);
		// Semantic colors
		parts.push(`--color-accent: ${state.accent}`);
		parts.push(`--color-success: ${state.success}`);
		parts.push(`--color-warning: ${state.warning}`);
		parts.push(`--color-error: ${state.error}`);
		parts.push(`--color-info: ${state.info}`);
		// Layout variables based on radius
		const radiusMap: Record<string, string> = {
			none: '0; --pm-r-md: 0; --pm-r-lg: 0; --pm-r-xl: 0; --pm-r-full: 0',
			small: '2px; --pm-r-md: 4px; --pm-r-lg: 6px; --pm-r-xl: 8px; --pm-r-full: 9999px',
			medium: '4px; --pm-r-md: 6px; --pm-r-lg: 8px; --pm-r-xl: 12px; --pm-r-full: 9999px',
			large: '6px; --pm-r-md: 10px; --pm-r-lg: 14px; --pm-r-xl: 20px; --pm-r-full: 9999px',
			pill: '9999px; --pm-r-md: 9999px; --pm-r-lg: 9999px; --pm-r-xl: 9999px; --pm-r-full: 9999px'
		};
		parts.push(`--pm-r-sm: ${radiusMap[state.radius] || radiusMap.medium}`);

		const densityMap: Record<string, string> = {
			compact: '0.25rem; --pm-d-pad-x: 0.375rem; --pm-d-pad-y: 0.25rem; --pm-d-pad: 0.5rem',
			comfortable: '0.5rem; --pm-d-pad-x: 0.75rem; --pm-d-pad-y: 0.5rem; --pm-d-pad: 0.75rem',
			spacious: '0.75rem; --pm-d-pad-x: 1rem; --pm-d-pad-y: 0.75rem; --pm-d-pad: 1rem'
		};
		parts.push(`--pm-d-gap: ${densityMap[state.density] || densityMap.comfortable}`);

		const bwMap: Record<string, string> = { none: '0px', thin: '0.5px', default: '1px', thick: '2px' };
		parts.push(`--pm-bw: ${bwMap[state.borderWidth] || '1px'}`);

		const animMap: Record<string, string> = {
			none: '0ms; --pm-anim-transition: none',
			subtle: '150ms; --pm-anim-transition: 150ms ease',
			smooth: '300ms; --pm-anim-transition: 300ms cubic-bezier(0.4, 0, 0.2, 1)'
		};
		parts.push(`--pm-anim-duration: ${animMap[state.animation] || animMap.subtle}`);

		return parts.join('; ');
	});

	const modeClass = $derived(state.mode === 'light' ? 'light' : 'dark');

	const textureClass = $derived.by(() => {
		if (state.texture === 'grid') return 'pm-texture-grid';
		if (state.texture === 'dots') return 'pm-texture-dots';
		return '';
	});
</script>

<div
	class="{modeClass} overflow-hidden border border-surface-300 dark:border-surface-700"
	style="{cssVars}; border-radius: var(--pm-r-lg); font-family: var(--font-sans);"
	data-card-style={state.cardStyle}
	data-depth-style={state.depthStyle}
	data-gradient={state.gradient}
	data-radius={state.radius}
	data-density={state.density}
	data-sidebar-style={state.sidebarStyle}
	data-border-width={state.borderWidth}
	data-animation={state.animation}
>
	<div class="flex h-[420px]" style="background-color: {state.mode === 'light' ? 'var(--color-surface-50)' : 'var(--color-surface-900)'}; color: {state.mode === 'light' ? 'var(--color-surface-900)' : 'var(--color-surface-100)'};">
		<PreviewSidebar />
		<div class="flex-1 overflow-y-auto {textureClass}" style="padding: var(--pm-d-pad);">
			<div class="space-y-4">
				<PreviewTaskCards />
				<PreviewButtons />
				<PreviewFormInputs />
				<PreviewKanban />
			</div>
		</div>
	</div>
</div>
