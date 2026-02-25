<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { setActiveTheme } from '$lib/stores/theme.js';
	import { generateBrandPalette, generateSurfacePalette, isValidHex } from '$lib/utils/color.js';
	import { buildPmThemeSource, parseThemeSource, DEFAULT_STATE, type ThemeBuilderState } from '$lib/utils/themeSource.js';
	import PreviewPanel from '$lib/components/theme/PreviewPanel.svelte';

	let { data } = $props();

	type ThemeListItem = { id: string; name: string; description: string | null; variables: Record<string, string>; builtin: boolean };

	// Builder state
	let ts: ThemeBuilderState = $state({ ...DEFAULT_STATE, colors: { ...DEFAULT_STATE.colors } });
	let editId: string | null = $state(null);
	let saving = $state(false);
	let themes: ThemeListItem[] = $state([]);
	let loaded = $state(false);

	// Color input helpers for brand/surface base
	let brandBase = $state('#3d7a5c');
	let surfaceBase = $state('#a8a198');

	// Font presets
	const fontPresets = [
		'Inter, ui-sans-serif, system-ui, sans-serif',
		'system-ui, -apple-system, sans-serif',
		'DM Sans, ui-sans-serif, system-ui, sans-serif',
		'Nunito, ui-sans-serif, system-ui, sans-serif',
		'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
		'Geist, ui-sans-serif, system-ui, sans-serif'
	];

	const monoPresets = [
		'JetBrains Mono, ui-monospace, monospace',
		'ui-monospace, SFMono-Regular, monospace',
		'Fira Code, ui-monospace, monospace',
		'IBM Plex Mono, ui-monospace, monospace'
	];

	const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

	// Load themes + handle edit/base params
	$effect(() => {
		api<ThemeListItem[]>('/api/themes').then(async (t: ThemeListItem[]) => {
			themes = t;
			loaded = true;

			const editParam = page.url.searchParams.get('edit');
			const baseParam = page.url.searchParams.get('base');
			const themeId = editParam || baseParam;

			if (themeId) {
				try {
					const result = await api<{ source: string }>(`/api/themes/${themeId}`);
					const parsed = parseThemeSource(result.source);
					ts = parsed;

					// Set base colors from 500 values
					if (parsed.colors['brand-500']) brandBase = parsed.colors['brand-500'];
					if (parsed.colors['surface-500']) surfaceBase = parsed.colors['surface-500'];

					if (editParam) editId = editParam;
					// For base, clear name to force new
					if (baseParam) {
						ts.name = '';
						ts.description = '';
					}
				} catch {
					showToast('Failed to load theme', 'error');
				}
			}
		}).catch(() => { loaded = true; });
	});

	function autoGenerateBrand() {
		if (!isValidHex(brandBase)) return;
		const palette = generateBrandPalette(brandBase);
		ts.colors = { ...ts.colors, ...palette };
	}

	function autoGenerateSurface() {
		if (!isValidHex(surfaceBase)) return;
		const palette = generateSurfacePalette(surfaceBase);
		ts.colors = { ...ts.colors, ...palette };
	}

	function loadFromTheme(themeId: string) {
		const theme = themes.find((t: ThemeListItem) => t.id === themeId);
		if (!theme) return;
		api<{ source: string }>(`/api/themes/${themeId}`).then((result) => {
			const parsed = parseThemeSource(result.source);
			// Preserve name/description if editing
			const name = ts.name;
			const desc = ts.description;
			ts = parsed;
			if (editId) {
				ts.name = name;
				ts.description = desc;
			}
			if (parsed.colors['brand-500']) brandBase = parsed.colors['brand-500'];
			if (parsed.colors['surface-500']) surfaceBase = parsed.colors['surface-500'];
		}).catch(() => showToast('Failed to load theme', 'error'));
	}

	async function saveTheme() {
		if (!ts.name.trim()) {
			showToast('Please enter a theme name', 'error');
			return;
		}

		// Ensure all 20 required colors exist
		const required = ['brand', 'surface'];
		for (const prefix of required) {
			for (const shade of SHADE_KEYS) {
				if (!ts.colors[`${prefix}-${shade}`]) {
					showToast(`Missing ${prefix}-${shade} color. Use "Auto-generate" to fill palette.`, 'error');
					return;
				}
			}
		}

		saving = true;
		try {
			const source = buildPmThemeSource(ts);

			if (editId) {
				const result = await api<{ id: string; name: string }>(`/api/themes/${editId}`, {
					method: 'PUT',
					body: JSON.stringify({ source })
				});
				await setActiveTheme(result.id);
				showToast(`Theme "${result.name}" updated`);
			} else {
				const result = await api<{ id: string; name: string }>('/api/themes', {
					method: 'POST',
					body: JSON.stringify({ source })
				});
				await setActiveTheme(result.id);
				showToast(`Theme "${result.name}" created`);
			}

			await invalidateAll();
			goto('/settings');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save theme', 'error');
		} finally {
			saving = false;
		}
	}

	async function exportToClipboard() {
		const source = buildPmThemeSource(ts);
		await navigator.clipboard.writeText(source);
		showToast('Theme copied to clipboard');
	}

	// Option card helper types
	type OptionChoice<T> = { value: T; label: string };

	const radiusOptions: OptionChoice<ThemeBuilderState['radius']>[] = [
		{ value: 'none', label: 'None' },
		{ value: 'small', label: 'Small' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'large', label: 'Large' },
		{ value: 'pill', label: 'Pill' }
	];

	const densityOptions: OptionChoice<ThemeBuilderState['density']>[] = [
		{ value: 'compact', label: 'Compact' },
		{ value: 'comfortable', label: 'Comfortable' },
		{ value: 'spacious', label: 'Spacious' }
	];

	const sidebarOptions: OptionChoice<ThemeBuilderState['sidebarStyle']>[] = [
		{ value: 'default', label: 'Default' },
		{ value: 'transparent', label: 'Transparent' },
		{ value: 'accent', label: 'Accent' }
	];

	const borderWidthOptions: OptionChoice<ThemeBuilderState['borderWidth']>[] = [
		{ value: 'none', label: 'None' },
		{ value: 'thin', label: 'Thin' },
		{ value: 'default', label: 'Default' },
		{ value: 'thick', label: 'Thick' }
	];

	const textureOptions: OptionChoice<ThemeBuilderState['texture']>[] = [
		{ value: 'none', label: 'None' },
		{ value: 'grid', label: 'Grid' },
		{ value: 'dots', label: 'Dots' }
	];

	const cardStyleOptions: OptionChoice<ThemeBuilderState['cardStyle']>[] = [
		{ value: 'rounded', label: 'Rounded' },
		{ value: 'square', label: 'Square' }
	];

	const depthStyleOptions: OptionChoice<ThemeBuilderState['depthStyle']>[] = [
		{ value: 'shadow', label: 'Shadow' },
		{ value: 'flat', label: 'Flat' },
		{ value: 'glass', label: 'Glass' }
	];

	const gradientOptions: OptionChoice<ThemeBuilderState['gradient']>[] = [
		{ value: 'none', label: 'None' },
		{ value: 'subtle', label: 'Subtle' },
		{ value: 'vivid', label: 'Vivid' }
	];

	const animationOptions: OptionChoice<ThemeBuilderState['animation']>[] = [
		{ value: 'none', label: 'None' },
		{ value: 'subtle', label: 'Subtle' },
		{ value: 'smooth', label: 'Smooth' }
	];
</script>

<svelte:head>
	<title>{editId ? 'Edit Theme' : 'Theme Builder'}</title>
</svelte:head>

<div class="flex h-full flex-col lg:flex-row">
	<!-- Controls Panel -->
	<div class="flex-1 overflow-y-auto p-6 lg:max-w-xl">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">
				{editId ? 'Edit Theme' : 'Theme Builder'}
			</h1>
			<a href="/settings" class="text-sm text-surface-500 hover:text-surface-300">&larr; Back</a>
		</div>

		<div class="space-y-6">
			<!-- Name & Description -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Name & Description</h2>
				<div class="space-y-2">
					<input
						bind:value={ts.name}
						placeholder="Theme name"
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
					<input
						bind:value={ts.description}
						placeholder="Short description (optional)"
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>
			</section>

			<!-- Start From -->
			{#if loaded && themes.length > 0}
				<section>
					<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Start From</h2>
					<select
						onchange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) loadFromTheme(v); }}
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					>
						<option value="">Choose a base theme...</option>
						{#each themes as theme (theme.id)}
							<option value={theme.id}>{theme.name}{theme.builtin ? '' : ' (custom)'}</option>
						{/each}
					</select>
				</section>
			{/if}

			<!-- Brand Colors -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Brand Colors</h2>
				<div class="mb-2 flex items-center gap-2">
					<label class="text-xs text-surface-600 dark:text-surface-400">Base</label>
					<input type="color" bind:value={brandBase} class="h-7 w-10 cursor-pointer rounded border border-surface-300 dark:border-surface-700" />
					<input
						bind:value={brandBase}
						placeholder="#3d7a5c"
						class="w-24 rounded-md border border-surface-300 bg-surface-50 px-2 py-1 font-mono text-xs text-surface-900 outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
					<button
						onclick={autoGenerateBrand}
						class="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-500"
					>Auto-generate</button>
				</div>
				<div class="grid grid-cols-5 gap-1.5">
					{#each SHADE_KEYS as shade}
						{@const key = `brand-${shade}`}
						<div>
							<label class="mb-0.5 block text-center text-[9px] text-surface-500">{shade}</label>
							<input
								type="color"
								value={ts.colors[key] || '#000000'}
								oninput={(e) => { ts.colors[key] = (e.target as HTMLInputElement).value; }}
								class="h-7 w-full cursor-pointer rounded border border-surface-300 dark:border-surface-700"
							/>
						</div>
					{/each}
				</div>
			</section>

			<!-- Surface Colors -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Surface Colors</h2>
				<div class="mb-2 flex items-center gap-2">
					<label class="text-xs text-surface-600 dark:text-surface-400">Base</label>
					<input type="color" bind:value={surfaceBase} class="h-7 w-10 cursor-pointer rounded border border-surface-300 dark:border-surface-700" />
					<input
						bind:value={surfaceBase}
						placeholder="#a8a198"
						class="w-24 rounded-md border border-surface-300 bg-surface-50 px-2 py-1 font-mono text-xs text-surface-900 outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
					<button
						onclick={autoGenerateSurface}
						class="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-500"
					>Auto-generate</button>
				</div>
				<div class="grid grid-cols-5 gap-1.5">
					{#each SHADE_KEYS as shade}
						{@const key = `surface-${shade}`}
						<div>
							<label class="mb-0.5 block text-center text-[9px] text-surface-500">{shade}</label>
							<input
								type="color"
								value={ts.colors[key] || '#000000'}
								oninput={(e) => { ts.colors[key] = (e.target as HTMLInputElement).value; }}
								class="h-7 w-full cursor-pointer rounded border border-surface-300 dark:border-surface-700"
							/>
						</div>
					{/each}
				</div>
			</section>

			<!-- Semantic Colors -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Semantic Colors</h2>
				<div class="grid grid-cols-5 gap-2">
					{#each [
						{ key: 'accent', label: 'Accent' },
						{ key: 'success', label: 'Success' },
						{ key: 'warning', label: 'Warning' },
						{ key: 'error', label: 'Error' },
						{ key: 'info', label: 'Info' }
					] as sem}
						<div>
							<label class="mb-0.5 block text-center text-[9px] text-surface-500">{sem.label}</label>
							<input
								type="color"
								value={ts[sem.key as keyof ThemeBuilderState] as string}
								oninput={(e) => { (ts as any)[sem.key] = (e.target as HTMLInputElement).value; }}
								class="h-7 w-full cursor-pointer rounded border border-surface-300 dark:border-surface-700"
							/>
						</div>
					{/each}
				</div>
			</section>

			<!-- Typography -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Typography</h2>
				<div class="space-y-2">
					<div>
						<label class="mb-0.5 block text-xs text-surface-600 dark:text-surface-400">Body Font</label>
						<select
							bind:value={ts.font}
							class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						>
							{#each fontPresets as preset}
								<option value={preset}>{preset.split(',')[0].replace(/'/g, '')}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-0.5 block text-xs text-surface-600 dark:text-surface-400">Heading Font</label>
						<select
							bind:value={ts.headingFont}
							class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						>
							{#each fontPresets as preset}
								<option value={preset}>{preset.split(',')[0].replace(/'/g, '')}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-0.5 block text-xs text-surface-600 dark:text-surface-400">Mono Font</label>
						<select
							bind:value={ts.monoFont}
							class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						>
							{#each monoPresets as preset}
								<option value={preset}>{preset.split(',')[0].replace(/'/g, '')}</option>
							{/each}
						</select>
					</div>
				</div>
			</section>

			<!-- Mode -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Mode</h2>
				<div class="flex rounded-md border border-surface-300 dark:border-surface-700">
					<button
						onclick={() => (ts.mode = 'dark')}
						class="flex-1 py-1.5 text-sm font-medium transition {ts.mode === 'dark' ? 'bg-brand-600 text-white' : 'text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800'}"
						style="border-radius: var(--pm-r-md) 0 0 var(--pm-r-md);"
					>Dark</button>
					<button
						onclick={() => (ts.mode = 'light')}
						class="flex-1 py-1.5 text-sm font-medium transition {ts.mode === 'light' ? 'bg-brand-600 text-white' : 'text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800'}"
						style="border-radius: 0 var(--pm-r-md) var(--pm-r-md) 0;"
					>Light</button>
				</div>
			</section>

			<!-- Radius -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Radius</h2>
				<div class="flex gap-1.5">
					{#each radiusOptions as opt}
						<button
							onclick={() => (ts.radius = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.radius === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Density -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Density</h2>
				<div class="flex gap-1.5">
					{#each densityOptions as opt}
						<button
							onclick={() => (ts.density = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.density === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Sidebar Style -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Sidebar Style</h2>
				<div class="flex gap-1.5">
					{#each sidebarOptions as opt}
						<button
							onclick={() => (ts.sidebarStyle = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.sidebarStyle === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Border Width -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Border Width</h2>
				<div class="flex gap-1.5">
					{#each borderWidthOptions as opt}
						<button
							onclick={() => (ts.borderWidth = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.borderWidth === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Texture -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Texture</h2>
				<div class="flex gap-1.5">
					{#each textureOptions as opt}
						<button
							onclick={() => (ts.texture = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.texture === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Card Style -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Card Style</h2>
				<div class="flex gap-1.5">
					{#each cardStyleOptions as opt}
						<button
							onclick={() => (ts.cardStyle = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.cardStyle === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Depth Style -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Depth Style</h2>
				<div class="flex gap-1.5">
					{#each depthStyleOptions as opt}
						<button
							onclick={() => (ts.depthStyle = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.depthStyle === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Gradient -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Gradient</h2>
				<div class="flex gap-1.5">
					{#each gradientOptions as opt}
						<button
							onclick={() => (ts.gradient = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.gradient === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Animation -->
			<section>
				<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">Animation</h2>
				<div class="flex gap-1.5">
					{#each animationOptions as opt}
						<button
							onclick={() => (ts.animation = opt.value)}
							class="flex-1 rounded-md border py-2 text-center text-xs font-medium transition {ts.animation === opt.value ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}"
						>{opt.label}</button>
					{/each}
				</div>
			</section>

			<!-- Actions -->
			<section class="flex items-center gap-3 border-t border-surface-300 pt-4 dark:border-surface-700">
				<button
					onclick={saveTheme}
					disabled={saving}
					class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{saving ? 'Saving...' : editId ? 'Save Changes' : 'Save & Activate'}
				</button>
				<button
					onclick={exportToClipboard}
					class="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:border-surface-400 dark:border-surface-700 dark:text-surface-300 dark:hover:border-surface-600"
				>Export to Clipboard</button>
			</section>
		</div>
	</div>

	<!-- Preview Panel (sticky on desktop) -->
	<div class="border-t border-surface-300 p-6 dark:border-surface-700 lg:sticky lg:top-0 lg:w-[520px] lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-t-0 lg:border-l">
		<h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500">Live Preview</h2>
		<PreviewPanel state={ts} />
	</div>
</div>
