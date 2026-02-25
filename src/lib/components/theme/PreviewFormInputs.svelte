<div class="space-y-2">
	<h3 class="text-xs font-semibold text-surface-500" style="font-family: var(--font-heading);">Form Elements</h3>

	<div>
		<label class="mb-0.5 block text-[10px] text-surface-600 dark:text-surface-400">Text input
		<input
			type="text"
			placeholder="Enter text..."
			class="w-full bg-surface-50 text-xs text-surface-900 outline-none dark:bg-surface-800 dark:text-surface-100"
			style="border-radius: var(--pm-r-md); border: var(--pm-bw) solid var(--color-surface-300); padding: var(--pm-d-pad-y) var(--pm-d-pad-x);"
		/>
		</label>
	</div>

	<div>
		<label class="mb-0.5 block text-[10px] text-surface-600 dark:text-surface-400">Select
		<select
			class="w-full bg-surface-50 text-xs text-surface-900 outline-none dark:bg-surface-800 dark:text-surface-100"
			style="border-radius: var(--pm-r-md); border: var(--pm-bw) solid var(--color-surface-300); padding: var(--pm-d-pad-y) var(--pm-d-pad-x);"
		>
			<option>Option 1</option>
			<option>Option 2</option>
		</select>
		</label>
	</div>

	<div class="flex items-center" style="gap: var(--pm-d-gap);">
		<label class="flex items-center gap-1.5">
			<input type="checkbox" checked class="rounded text-brand-600" style="border-color: var(--color-surface-300);" />
			<span class="text-[10px] text-surface-700 dark:text-surface-300">Checked</span>
		</label>
		<label class="flex items-center gap-1.5">
			<input type="checkbox" class="rounded text-brand-600" style="border-color: var(--color-surface-300);" />
			<span class="text-[10px] text-surface-700 dark:text-surface-300">Unchecked</span>
		</label>
	</div>
</div>
