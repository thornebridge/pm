<script lang="ts">
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

	interface Props {
		fields: CustomField[];
		onchange: (fields: CustomField[]) => void;
	}

	let { fields, onchange }: Props = $props();

	let expandedIdx = $state<number | null>(null);

	const FIELD_TYPES = [
		{ value: 'text', label: 'Text' },
		{ value: 'textarea', label: 'Long Text' },
		{ value: 'phone', label: 'Phone' },
		{ value: 'email', label: 'Email' },
		{ value: 'number', label: 'Number' },
		{ value: 'checkbox', label: 'Checkbox' },
		{ value: 'select', label: 'Dropdown' },
		{ value: 'radio', label: 'Radio Buttons' }
	];

	function addField() {
		const updated = [...fields, {
			label: '',
			type: 'text',
			required: false,
			placeholder: '',
			options: [],
			conditionalFieldId: '',
			conditionalValue: ''
		}];
		onchange(updated);
		expandedIdx = updated.length - 1;
	}

	function removeField(idx: number) {
		const updated = fields.filter((_, i) => i !== idx);
		onchange(updated);
		if (expandedIdx === idx) expandedIdx = null;
		else if (expandedIdx !== null && expandedIdx > idx) expandedIdx--;
	}

	function updateField(idx: number, key: string, value: unknown) {
		const updated = fields.map((f, i) => i === idx ? { ...f, [key]: value } : f);
		onchange(updated);
	}

	function moveUp(idx: number) {
		if (idx === 0) return;
		const updated = [...fields];
		[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
		onchange(updated);
		if (expandedIdx === idx) expandedIdx = idx - 1;
		else if (expandedIdx === idx - 1) expandedIdx = idx;
	}

	function moveDown(idx: number) {
		if (idx >= fields.length - 1) return;
		const updated = [...fields];
		[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
		onchange(updated);
		if (expandedIdx === idx) expandedIdx = idx + 1;
		else if (expandedIdx === idx + 1) expandedIdx = idx;
	}

	function addOption(idx: number) {
		const field = fields[idx];
		updateField(idx, 'options', [...field.options, '']);
	}

	function removeOption(fieldIdx: number, optIdx: number) {
		const field = fields[fieldIdx];
		updateField(fieldIdx, 'options', field.options.filter((_: string, i: number) => i !== optIdx));
	}

	function updateOption(fieldIdx: number, optIdx: number, value: string) {
		const field = fields[fieldIdx];
		const opts = [...field.options];
		opts[optIdx] = value;
		updateField(fieldIdx, 'options', opts);
	}

	const inputClass = 'w-full rounded-md border border-surface-300 bg-surface-50 px-2.5 py-1.5 text-xs text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';
</script>

<div class="space-y-2">
	{#each fields as field, idx}
		<div class="rounded-lg border border-surface-200 dark:border-surface-700">
			<!-- Field header (always visible) -->
			<div class="flex items-center gap-2 px-3 py-2">
				<div class="flex flex-col gap-0.5">
					<button type="button" aria-label="Move field up" onclick={() => moveUp(idx)} disabled={idx === 0} class="text-surface-300 hover:text-surface-500 disabled:opacity-30">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
					</button>
					<button type="button" aria-label="Move field down" onclick={() => moveDown(idx)} disabled={idx >= fields.length - 1} class="text-surface-300 hover:text-surface-500 disabled:opacity-30">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
					</button>
				</div>
				<div class="min-w-0 flex-1">
					<input
						value={field.label}
						oninput={(e) => updateField(idx, 'label', (e.target as HTMLInputElement).value)}
						placeholder="Field label"
						class="w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs font-medium text-surface-900 outline-none placeholder:text-surface-400 dark:text-surface-100"
					/>
				</div>
				<span class="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-surface-500 dark:bg-surface-800">{FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}</span>
				{#if field.required}
					<span class="text-[10px] text-red-500">Required</span>
				{/if}
				<button type="button" aria-label="Toggle field settings" onclick={() => { expandedIdx = expandedIdx === idx ? null : idx; }} class="rounded p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transition {expandedIdx === idx ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
				</button>
				<button type="button" aria-label="Remove field" onclick={() => removeField(idx)} class="rounded p-1 text-surface-400 hover:text-red-500">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
				</button>
			</div>

			<!-- Expanded settings -->
			{#if expandedIdx === idx}
				<div class="border-t border-surface-200 px-3 py-2.5 dark:border-surface-700">
					<div class="space-y-2.5">
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label class="mb-0.5 block text-[10px] text-surface-500">Type
								<select
									value={field.type}
									onchange={(e) => updateField(idx, 'type', (e.target as HTMLSelectElement).value)}
									class={inputClass}
								>
									{#each FIELD_TYPES as ft}
										<option value={ft.value}>{ft.label}</option>
									{/each}
								</select>
							</label>
							</div>
							<div>
								<span class="mb-0.5 block text-[10px] text-surface-500">Required</span>
								<label class="flex items-center gap-1.5 pt-1">
									<input
										type="checkbox"
										checked={field.required}
										onchange={(e) => updateField(idx, 'required', (e.target as HTMLInputElement).checked)}
										class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
									/>
									<span class="text-xs text-surface-600 dark:text-surface-400">Required</span>
								</label>
							</div>
						</div>
						<div>
							<label class="mb-0.5 block text-[10px] text-surface-500">Placeholder
							<input
								value={field.placeholder}
								oninput={(e) => updateField(idx, 'placeholder', (e.target as HTMLInputElement).value)}
								placeholder="Placeholder text"
								class={inputClass}
							/>
							</label>
						</div>

						<!-- Options for select/radio -->
						{#if field.type === 'select' || field.type === 'radio'}
							<div>
								<span class="mb-0.5 block text-[10px] text-surface-500">Options</span>
								<div class="space-y-1">
									{#each field.options as opt, optIdx}
										<div class="flex items-center gap-1">
											<input
												value={opt}
												oninput={(e) => updateOption(idx, optIdx, (e.target as HTMLInputElement).value)}
												placeholder="Option {optIdx + 1}"
												class="flex-1 {inputClass}"
											/>
											<button type="button" aria-label="Remove option" onclick={() => removeOption(idx, optIdx)} class="rounded p-0.5 text-surface-400 hover:text-red-500">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
											</button>
										</div>
									{/each}
									<button type="button" onclick={() => addOption(idx)} class="text-[10px] text-brand-600 hover:text-brand-500">+ Add option</button>
								</div>
							</div>
						{/if}

						<!-- Conditional visibility -->
						<div>
							<label class="mb-0.5 block text-[10px] text-surface-500">Show only when...
							<div class="flex items-center gap-1.5">
								<select
									value={field.conditionalFieldId}
									onchange={(e) => updateField(idx, 'conditionalFieldId', (e.target as HTMLSelectElement).value)}
									class="flex-1 {inputClass}"
								>
									<option value="">Always show</option>
									{#each fields as otherField, otherIdx}
										{#if otherIdx !== idx && otherField.label}
											<option value={otherField.id || `_idx_${otherIdx}`}>{otherField.label}</option>
										{/if}
									{/each}
								</select>
								{#if field.conditionalFieldId}
									<span class="text-[10px] text-surface-400">equals</span>
									<input
										value={field.conditionalValue}
										oninput={(e) => updateField(idx, 'conditionalValue', (e.target as HTMLInputElement).value)}
										placeholder="value"
										class="w-24 {inputClass}"
									/>
								{/if}
							</div>
						</label>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<button
		type="button"
		onclick={addField}
		class="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-surface-300 px-3 py-2 text-xs text-surface-500 transition hover:border-brand-500 hover:text-brand-600 dark:border-surface-700"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
		Add Field
	</button>
</div>
