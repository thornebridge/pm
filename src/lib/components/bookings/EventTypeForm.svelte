<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';
	import CustomFieldBuilder from './CustomFieldBuilder.svelte';

	interface Schedule {
		dayOfWeek: number;
		startTime: string;
		endTime: string;
		enabled: boolean;
	}

	interface Override {
		date: string;
		startTime: string;
		endTime: string;
		isBlocked: boolean;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		eventType?: {
			id: string;
			title: string;
			slug: string;
			description?: string | null;
			durationMinutes: number;
			color: string;
			location?: string | null;
			bufferMinutes: number;
			minNoticeHours: number;
			maxDaysOut: number;
			schedulingType?: string;
			roundRobinMode?: string | null;
			logoMimeType?: string | null;
		};
	}

	let { open, onclose, eventType }: Props = $props();

	const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const DEFAULT_SCHEDULES: Schedule[] = [
		{ dayOfWeek: 0, startTime: '09:00', endTime: '17:00', enabled: false },
		{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', enabled: true },
		{ dayOfWeek: 2, startTime: '09:00', endTime: '17:00', enabled: true },
		{ dayOfWeek: 3, startTime: '09:00', endTime: '17:00', enabled: true },
		{ dayOfWeek: 4, startTime: '09:00', endTime: '17:00', enabled: true },
		{ dayOfWeek: 5, startTime: '09:00', endTime: '17:00', enabled: true },
		{ dayOfWeek: 6, startTime: '09:00', endTime: '17:00', enabled: false }
	];

	interface CustomField {
		id?: string;
		label: string;
		type: string;
		required: boolean;
		placeholder: string;
		options: string[];
		conditionalFieldId: string;
		conditionalValue: string;
	}

	// Tab state
	let activeTab = $state<'details' | 'availability' | 'questions'>('details');

	// Details fields
	let title = $state('');
	let slug = $state('');
	let description = $state('');
	let durationMinutes = $state(30);
	let color = $state('#6366f1');
	let location = $state('');
	let bufferMinutes = $state(0);
	let minNoticeHours = $state(4);
	let maxDaysOut = $state(60);
	let saving = $state(false);
	let slugEdited = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	// Logo
	let hasLogo = $state(false);
	let logoPreview = $state('');
	let logoFile = $state<File | null>(null);
	let removeLogo = $state(false);

	// Scheduling type (round robin)
	let schedulingType = $state<'individual' | 'round_robin'>('individual');
	let roundRobinMode = $state<'rotation' | 'load_balanced'>('rotation');

	// Availability
	let schedules = $state<Schedule[]>([...DEFAULT_SCHEDULES]);
	let overrides = $state<Override[]>([]);
	let newOverrideDate = $state('');
	let loadingSchedules = $state(false);

	// Custom fields
	let customFields = $state<CustomField[]>([]);
	let loadingFields = $state(false);

	$effect(() => {
		if (open) {
			activeTab = 'details';
			removeLogo = false;
			logoFile = null;
			logoPreview = '';
			if (eventType) {
				title = eventType.title;
				slug = eventType.slug;
				description = eventType.description || '';
				durationMinutes = eventType.durationMinutes;
				color = eventType.color;
				location = eventType.location || '';
				bufferMinutes = eventType.bufferMinutes;
				minNoticeHours = eventType.minNoticeHours;
				maxDaysOut = eventType.maxDaysOut;
				schedulingType = (eventType.schedulingType as 'individual' | 'round_robin') || 'individual';
				roundRobinMode = (eventType.roundRobinMode as 'rotation' | 'load_balanced') || 'rotation';
				slugEdited = true;
				hasLogo = !!eventType.logoMimeType;
				// Load schedules, overrides, and custom fields from API
				loadEventTypeSchedules(eventType.id);
				loadCustomFields(eventType.id);
			} else {
				title = '';
				slug = '';
				description = '';
				durationMinutes = 30;
				color = '#6366f1';
				location = '';
				bufferMinutes = 0;
				minNoticeHours = 4;
				maxDaysOut = 60;
				schedulingType = 'individual';
				roundRobinMode = 'rotation';
				slugEdited = false;
				hasLogo = false;
				schedules = DEFAULT_SCHEDULES.map((s) => ({ ...s }));
				overrides = [];
				customFields = [];
			}
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function loadEventTypeSchedules(id: string) {
		loadingSchedules = true;
		try {
			const res = await api(`/api/bookings/event-types/${id}`);
			const data = await res.json();
			if (data.schedules?.length > 0) {
				schedules = DAY_NAMES.map((_, i) => {
					const s = data.schedules.find((s: Schedule) => s.dayOfWeek === i);
					return s
						? { dayOfWeek: i, startTime: s.startTime, endTime: s.endTime, enabled: s.enabled }
						: { dayOfWeek: i, startTime: '09:00', endTime: '17:00', enabled: false };
				});
			}
			if (data.overrides) {
				overrides = data.overrides.map((o: Override & { id?: string }) => ({
					date: o.date,
					startTime: o.startTime || '09:00',
					endTime: o.endTime || '17:00',
					isBlocked: o.isBlocked
				}));
			}
		} catch {
			// Use defaults
			schedules = DEFAULT_SCHEDULES.map((s) => ({ ...s }));
		} finally {
			loadingSchedules = false;
		}
	}

	async function loadCustomFields(id: string) {
		loadingFields = true;
		try {
			const res = await api(`/api/bookings/event-types/${id}/fields`);
			const data = await res.json();
			customFields = (data.fields || []).map((f: CustomField & { id?: string }) => ({
				id: f.id,
				label: f.label || '',
				type: f.type || 'text',
				required: !!f.required,
				placeholder: f.placeholder || '',
				options: f.options || [],
				conditionalFieldId: f.conditionalFieldId || '',
				conditionalValue: f.conditionalValue || ''
			}));
		} catch {
			customFields = [];
		} finally {
			loadingFields = false;
		}
	}

	function slugify(text: string): string {
		return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function onTitleInput() {
		if (!slugEdited) {
			slug = slugify(title);
		}
	}

	function onLogoSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (file.size > 512 * 1024) {
			showToast('Logo must be under 512KB', 'error');
			return;
		}
		logoFile = file;
		removeLogo = false;
		const reader = new FileReader();
		reader.onload = () => { logoPreview = reader.result as string; };
		reader.readAsDataURL(file);
	}

	function addOverride() {
		if (!newOverrideDate) return;
		if (overrides.some((o) => o.date === newOverrideDate)) {
			showToast('Override for this date already exists', 'error');
			return;
		}
		overrides = [...overrides, { date: newOverrideDate, startTime: '09:00', endTime: '17:00', isBlocked: false }];
		newOverrideDate = '';
	}

	function removeOverride(idx: number) {
		overrides = overrides.filter((_, i) => i !== idx);
	}

	async function save() {
		if (!title.trim() || !slug.trim()) return;
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				title: title.trim(),
				slug: slug.trim(),
				description: description || null,
				durationMinutes,
				color,
				location: location || null,
				bufferMinutes,
				minNoticeHours,
				maxDaysOut,
				schedulingType,
				roundRobinMode: schedulingType === 'round_robin' ? roundRobinMode : null,
				schedules,
				overrides
			};

			let eventId = eventType?.id;

			if (eventType) {
				await api(`/api/bookings/event-types/${eventType.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
			} else {
				const res = await api('/api/bookings/event-types', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				const data = await res.json();
				eventId = data.id;
			}

			// Handle logo upload/removal
			if (eventId) {
				if (removeLogo) {
					await api(`/api/bookings/event-types/${eventId}/logo`, { method: 'DELETE' });
				} else if (logoFile) {
					const fd = new FormData();
					fd.append('file', logoFile);
					await fetch(`/api/bookings/event-types/${eventId}/logo`, { method: 'POST', body: fd });
				}

				// Save custom fields
				if (customFields.length > 0 || eventType) {
					await api(`/api/bookings/event-types/${eventId}/fields`, {
						method: 'PUT',
						body: JSON.stringify({ fields: customFields.map((f, i) => ({ ...f, position: i })) })
					});
				}
			}

			showToast(eventType ? 'Event type updated' : 'Event type created');
			onclose();
			await invalidateAll();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			save();
		}
	}

	const inputClass = 'w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';
	const labelClass = 'mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400';
	const smallInputClass = 'w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[5vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-xl rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<!-- Header -->
			<div class="border-b border-surface-300 px-5 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{eventType ? 'Edit Event Type' : 'New Event Type'}
				</h2>
			</div>

			<!-- Tabs -->
			<div class="flex border-b border-surface-300 px-5 dark:border-surface-800">
				{#each [
					{ id: 'details', label: 'Details' },
					{ id: 'availability', label: 'Availability' },
					{ id: 'questions', label: 'Questions' }
				] as tab}
					<button
						onclick={() => { activeTab = tab.id as typeof activeTab; }}
						class="border-b-2 px-3 py-2 text-xs font-medium transition {activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
					>{tab.label}</button>
				{/each}
			</div>

			<form onsubmit={(e) => { e.preventDefault(); save(); }}>
				{#if activeTab === 'details'}
					<div class="space-y-3 p-5">
						<!-- Logo -->
						<div>
							<label class={labelClass}>Logo</label>
							<div class="flex items-center gap-3">
								{#if logoPreview}
									<img src={logoPreview} alt="Logo preview" class="h-10 w-10 rounded object-contain" />
								{:else if hasLogo && !removeLogo}
									<div class="flex h-10 w-10 items-center justify-center rounded bg-surface-200 dark:bg-surface-700">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-surface-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg>
									</div>
								{/if}
								<div class="flex gap-2">
									<label class="cursor-pointer rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">
										{hasLogo || logoPreview ? 'Change' : 'Upload'}
										<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onchange={onLogoSelect} class="hidden" />
									</label>
									{#if (hasLogo && !removeLogo) || logoPreview}
										<button type="button" onclick={() => { removeLogo = true; logoFile = null; logoPreview = ''; }} class="rounded-md px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
											Remove
										</button>
									{/if}
								</div>
							</div>
						</div>

						<div>
							<label for="et-title" class={labelClass}>Title *</label>
							<input id="et-title" bind:this={inputEl} bind:value={title} oninput={onTitleInput} placeholder="e.g. 30 Minute Consultation" class={inputClass} />
						</div>
						<div>
							<label for="et-slug" class={labelClass}>URL Slug *</label>
							<div class="flex items-center gap-1">
								<span class="text-xs text-surface-500">/bookings/</span>
								<input id="et-slug" bind:value={slug} oninput={() => { slugEdited = true; }} placeholder="30-min-consultation" class="flex-1 {smallInputClass}" />
							</div>
						</div>
						<div>
							<label for="et-desc" class={labelClass}>Description</label>
							<textarea id="et-desc" bind:value={description} rows={2} placeholder="Brief description shown on the booking page" class={inputClass}></textarea>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="et-duration" class={labelClass}>Duration</label>
								<select id="et-duration" bind:value={durationMinutes} class={smallInputClass}>
									<option value={15}>15 min</option>
									<option value={30}>30 min</option>
									<option value={45}>45 min</option>
									<option value={60}>60 min</option>
									<option value={90}>90 min</option>
								</select>
							</div>
							<div>
								<label for="et-color" class={labelClass}>Color</label>
								<input id="et-color" type="color" bind:value={color} class="h-9 w-full cursor-pointer rounded-md border border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800" />
							</div>
						</div>
						<div>
							<label for="et-location" class={labelClass}>Location</label>
							<input id="et-location" bind:value={location} placeholder="e.g. Google Meet, Phone, Office" class={smallInputClass} />
							{#if location.toLowerCase() === 'google meet'}
								<p class="mt-1 text-[10px] text-brand-600">A Google Meet link will be automatically generated when booked.</p>
							{/if}
						</div>
						<div class="grid grid-cols-3 gap-3">
							<div>
								<label for="et-buffer" class={labelClass}>Buffer (min)</label>
								<input id="et-buffer" type="number" min="0" max="60" bind:value={bufferMinutes} class={smallInputClass} />
							</div>
							<div>
								<label for="et-notice" class={labelClass}>Min Notice (hrs)</label>
								<input id="et-notice" type="number" min="0" max="168" bind:value={minNoticeHours} class={smallInputClass} />
							</div>
							<div>
								<label for="et-maxdays" class={labelClass}>Max Days Out</label>
								<input id="et-maxdays" type="number" min="1" max="365" bind:value={maxDaysOut} class={smallInputClass} />
							</div>
						</div>

						<!-- Scheduling Type -->
						<div class="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
							<label class={labelClass}>Scheduling Type</label>
							<div class="mt-1 flex gap-3">
								<label class="flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
									<input type="radio" name="scheduling-type" value="individual" bind:group={schedulingType} class="h-3.5 w-3.5 border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
									Individual
								</label>
								<label class="flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
									<input type="radio" name="scheduling-type" value="round_robin" bind:group={schedulingType} class="h-3.5 w-3.5 border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
									Round Robin
								</label>
							</div>
							{#if schedulingType === 'round_robin'}
								<div class="mt-2.5 space-y-2 border-t border-surface-200 pt-2.5 dark:border-surface-700">
									<label class="mb-1 block text-[10px] font-medium text-surface-500">Assignment Mode</label>
									<div class="flex gap-3">
										<label class="flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
											<input type="radio" name="rr-mode" value="rotation" bind:group={roundRobinMode} class="h-3.5 w-3.5 border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
											Rotation
										</label>
										<label class="flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
											<input type="radio" name="rr-mode" value="load_balanced" bind:group={roundRobinMode} class="h-3.5 w-3.5 border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600" />
											Load Balanced
										</label>
									</div>
									<p class="text-[10px] text-surface-400">
										{roundRobinMode === 'rotation' ? 'Assigns to the next team member in order, cycling through the list.' : 'Assigns to the team member with the fewest upcoming bookings.'}
									</p>
									<p class="text-[10px] text-surface-400">Manage team members from the bookings page after saving.</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				{#if activeTab === 'questions'}
					<div class="p-5">
						{#if loadingFields}
							<div class="py-6 text-center text-sm text-surface-500">Loading fields...</div>
						{:else}
							<div class="mb-2">
								<h3 class="text-xs font-semibold text-surface-700 dark:text-surface-300">Custom Questions</h3>
								<p class="text-[10px] text-surface-400">Add fields to collect additional info from people who book with you.</p>
							</div>
							<CustomFieldBuilder fields={customFields} onchange={(fields) => { customFields = fields; }} />
						{/if}
					</div>
				{/if}

				{#if activeTab === 'availability'}
					<div class="space-y-4 p-5">
						{#if loadingSchedules}
							<div class="py-6 text-center text-sm text-surface-500">Loading availability...</div>
						{:else}
							<!-- Weekly Schedule -->
							<div>
								<h3 class="mb-2 text-xs font-semibold text-surface-700 dark:text-surface-300">Weekly Hours</h3>
								<div class="space-y-1.5">
									{#each schedules as sched, i}
										<div class="flex items-center gap-2">
											<label class="flex w-20 items-center gap-1.5 text-xs">
												<input
													type="checkbox"
													checked={sched.enabled}
													onchange={(e) => { schedules[i] = { ...sched, enabled: (e.target as HTMLInputElement).checked }; }}
													class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
												/>
												<span class="text-surface-700 dark:text-surface-300">{DAY_NAMES[sched.dayOfWeek].slice(0, 3)}</span>
											</label>
											{#if sched.enabled}
												<input
													type="time"
													value={sched.startTime}
													onchange={(e) => { schedules[i] = { ...sched, startTime: (e.target as HTMLInputElement).value }; }}
													class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
												/>
												<span class="text-xs text-surface-400">to</span>
												<input
													type="time"
													value={sched.endTime}
													onchange={(e) => { schedules[i] = { ...sched, endTime: (e.target as HTMLInputElement).value }; }}
													class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
												/>
											{:else}
												<span class="text-xs text-surface-400">Unavailable</span>
											{/if}
										</div>
									{/each}
								</div>
							</div>

							<!-- Date Overrides -->
							<div>
								<h3 class="mb-2 text-xs font-semibold text-surface-700 dark:text-surface-300">Date Overrides</h3>
								<p class="mb-2 text-[10px] text-surface-400">Override hours for specific dates, or block them entirely.</p>
								{#if overrides.length > 0}
									<div class="mb-2 space-y-1.5">
										{#each overrides as ov, i}
											<div class="flex items-center gap-2 rounded border border-surface-200 px-2 py-1.5 dark:border-surface-700">
												<span class="text-xs font-medium text-surface-700 dark:text-surface-300">{ov.date}</span>
												<label class="flex items-center gap-1 text-[10px] text-surface-500">
													<input
														type="checkbox"
														checked={ov.isBlocked}
														onchange={(e) => { overrides[i] = { ...ov, isBlocked: (e.target as HTMLInputElement).checked }; }}
														class="h-3 w-3 rounded border-surface-300 text-red-600"
													/>
													Blocked
												</label>
												{#if !ov.isBlocked}
													<input
														type="time"
														value={ov.startTime}
														onchange={(e) => { overrides[i] = { ...ov, startTime: (e.target as HTMLInputElement).value }; }}
														class="rounded border border-surface-300 bg-surface-50 px-1.5 py-0.5 text-[11px] dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
													/>
													<span class="text-[10px] text-surface-400">-</span>
													<input
														type="time"
														value={ov.endTime}
														onchange={(e) => { overrides[i] = { ...ov, endTime: (e.target as HTMLInputElement).value }; }}
														class="rounded border border-surface-300 bg-surface-50 px-1.5 py-0.5 text-[11px] dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
													/>
												{/if}
												<button type="button" onclick={() => removeOverride(i)} class="ml-auto rounded p-0.5 text-surface-400 hover:text-red-500">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}
								<div class="flex items-center gap-2">
									<input
										type="date"
										bind:value={newOverrideDate}
										class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
									/>
									<button
										type="button"
										onclick={addOverride}
										disabled={!newOverrideDate}
										class="rounded-md border border-surface-300 px-2 py-1 text-xs text-surface-600 hover:bg-surface-100 disabled:opacity-40 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
									>
										Add Override
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Footer -->
				<div class="flex items-center justify-between border-t border-surface-300 px-5 py-3 dark:border-surface-800">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !title.trim() || !slug.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : eventType ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
