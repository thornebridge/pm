<script lang="ts">
	let { data } = $props();

	type Slot = { startTime: number; endTime: number };
	type CustomField = {
		id: string;
		label: string;
		type: string;
		required: boolean;
		placeholder: string | null;
		options: string[];
		conditionalFieldId: string | null;
		conditionalValue: string | null;
	};

	let step = $state<'date' | 'time' | 'form' | 'done'>('date');
	let selectedDate = $state('');
	let slots = $state<Slot[]>([]);
	let loadingSlots = $state(false);
	let selectedSlot = $state<Slot | null>(null);
	let name = $state('');
	let email = $state('');
	let notes = $state('');
	let customValues = $state<Record<string, string>>({});
	let submitting = $state(false);
	let errorMsg = $state('');
	let bookedTime = $state('');
	let bookedMeetLink = $state('');

	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Calendar state
	const today = new Date();
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth());

	const maxDate = $derived(() => {
		if (!data.eventType) return new Date();
		const d = new Date();
		d.setDate(d.getDate() + data.eventType.maxDaysOut);
		return d;
	});

	const daysInMonth = $derived(new Date(viewYear, viewMonth + 1, 0).getDate());
	const firstDayOfWeek = $derived(new Date(viewYear, viewMonth, 1).getDay());
	const monthLabel = $derived(new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

	function isDateSelectable(day: number): boolean {
		const d = new Date(viewYear, viewMonth, day);
		if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
		if (d > maxDate()) return false;
		return true;
	}

	function prevMonth() {
		if (viewMonth === 0) { viewYear--; viewMonth = 11; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewYear++; viewMonth = 0; }
		else viewMonth++;
	}

	function dateStr(day: number): string {
		return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	async function selectDate(day: number) {
		const ds = dateStr(day);
		selectedDate = ds;
		selectedSlot = null;
		loadingSlots = true;
		errorMsg = '';

		try {
			const res = await fetch(`/api/bookings/${data.eventType!.slug}/availability?date=${ds}&timezone=${encodeURIComponent(timezone)}`);
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || 'Failed to load availability');
			slots = json.slots;
			step = 'time';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load availability';
			slots = [];
		} finally {
			loadingSlots = false;
		}
	}

	function selectSlot(slot: Slot) {
		selectedSlot = slot;
		step = 'form';
	}

	function isFieldVisible(field: CustomField): boolean {
		if (!field.conditionalFieldId) return true;
		return customValues[field.conditionalFieldId] === field.conditionalValue;
	}

	async function submit() {
		if (!selectedSlot || !name.trim() || !email.trim()) return;

		// Validate required custom fields
		for (const field of data.customFields || []) {
			if (field.required && isFieldVisible(field)) {
				const val = customValues[field.id]?.trim();
				if (!val) {
					errorMsg = `${field.label} is required`;
					return;
				}
			}
		}

		submitting = true;
		errorMsg = '';

		try {
			const res = await fetch(`/api/bookings/${data.eventType!.slug}/book`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					startTime: selectedSlot.startTime,
					timezone,
					notes: notes.trim() || undefined,
					customFields: Object.keys(customValues).length > 0 ? customValues : undefined
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || 'Booking failed');

			bookedTime = formatSlotTime(selectedSlot.startTime, selectedSlot.endTime);
			bookedMeetLink = json.meetLink || '';
			step = 'done';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Booking failed';
		} finally {
			submitting = false;
		}
	}

	function formatSlotTime(start: number, end: number): string {
		const opts: Intl.DateTimeFormatOptions = { timeZone: timezone, hour: 'numeric', minute: '2-digit' };
		return `${new Date(start).toLocaleTimeString('en-US', opts)} - ${new Date(end).toLocaleTimeString('en-US', opts)}`;
	}

	function formatFullTime(start: number): string {
		return new Date(start).toLocaleString('en-US', {
			timeZone: timezone,
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>{data.eventType ? data.eventType.title : 'Not Found'}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
	{#if data.notFound}
		<div class="text-center">
			<h1 class="text-lg font-medium text-gray-900">Booking page not found</h1>
			<p class="mt-2 text-sm text-gray-500">This link may be inactive or incorrect.</p>
		</div>
	{:else if data.eventType}
		<div class="w-full max-w-md">
			<!-- Header -->
			<div class="mb-6 text-center">
				{#if data.eventType.logoData && data.eventType.logoMimeType}
					<img
						src="data:{data.eventType.logoMimeType};base64,{data.eventType.logoData}"
						alt="{data.eventType.title}"
						class="mx-auto mb-3 h-12 w-auto"
					/>
				{:else}
					<div class="mx-auto mb-3 h-3 w-3 rounded-full" style="background-color: {data.eventType.color}"></div>
				{/if}
				<p class="text-xs text-gray-500">{data.ownerName}</p>
				<h1 class="text-lg font-semibold text-gray-900">{data.eventType.title}</h1>
				<div class="mt-1 flex items-center justify-center gap-3 text-xs text-gray-500">
					<span>{data.eventType.durationMinutes} min</span>
					{#if data.eventType.location}
						<span>&middot; {data.eventType.location}</span>
					{/if}
				</div>
				{#if data.eventType.description}
					<p class="mt-2 text-sm text-gray-500">{data.eventType.description}</p>
				{/if}
			</div>

			{#if errorMsg}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</div>
			{/if}

			<!-- Step: Date Selection -->
			{#if step === 'date' || step === 'time'}
				<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
					<!-- Calendar Header -->
					<div class="mb-3 flex items-center justify-between">
						<button aria-label="Previous month" onclick={prevMonth} class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						</button>
						<span class="text-sm font-medium text-gray-900">{monthLabel}</span>
						<button aria-label="Next month" onclick={nextMonth} class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
						</button>
					</div>

					<!-- Day Headers -->
					<div class="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-gray-400">
						<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
					</div>

					<!-- Day Grid -->
					<div class="grid grid-cols-7 gap-1">
						{#each Array(firstDayOfWeek) as _}
							<div></div>
						{/each}
						{#each Array(daysInMonth) as _, i}
							{@const day = i + 1}
							{@const selectable = isDateSelectable(day)}
							{@const isSelected = selectedDate === dateStr(day)}
							<button
								disabled={!selectable}
								onclick={() => selectDate(day)}
								class="flex h-8 items-center justify-center rounded-lg text-sm transition
									{isSelected ? 'bg-brand-600 font-medium text-white' : selectable ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-default'}"
							>
								{day}
							</button>
						{/each}
					</div>

					<div class="mt-3 text-center text-[10px] text-gray-400">{timezone}</div>
				</div>

				<!-- Time Slots -->
				{#if step === 'time'}
					<div class="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
						<h3 class="mb-3 text-center text-xs font-medium text-gray-500">
							{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
						</h3>
						{#if loadingSlots}
							<div class="py-4 text-center text-sm text-gray-400">Loading...</div>
						{:else if slots.length === 0}
							<div class="py-4 text-center text-sm text-gray-400">No available times on this date.</div>
						{:else}
							<div class="grid grid-cols-2 gap-2">
								{#each slots as slot}
									<button
										onclick={() => selectSlot(slot)}
										class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600"
									>
										{formatSlotTime(slot.startTime, slot.endTime)}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Step: Confirmation Form -->
			{#if step === 'form' && selectedSlot}
				<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
					<div class="mb-4 border-b border-gray-100 pb-3">
						<p class="text-sm font-medium text-gray-900">{formatFullTime(selectedSlot.startTime)}</p>
						<p class="text-xs text-gray-500">{data.eventType.durationMinutes} min &middot; {timezone}</p>
					</div>
					<div class="space-y-3">
						<div>
							<label for="book-name" class="mb-1 block text-xs font-medium text-gray-600">Name *</label>
							<input
								id="book-name"
								bind:value={name}
								placeholder="Your name"
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							/>
						</div>
						<div>
							<label for="book-email" class="mb-1 block text-xs font-medium text-gray-600">Email *</label>
							<input
								id="book-email"
								type="email"
								bind:value={email}
								placeholder="your@email.com"
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							/>
						</div>
						<div>
							<label for="book-notes" class="mb-1 block text-xs font-medium text-gray-600">Notes</label>
							<textarea
								id="book-notes"
								bind:value={notes}
								rows={2}
								placeholder="Anything you'd like to share"
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							></textarea>
						</div>

						<!-- Custom Fields -->
						{#each data.customFields || [] as field}
							{#if isFieldVisible(field)}
								<div>
									<label for="custom-{field.id}" class="mb-1 block text-xs font-medium text-gray-600">
										{field.label}{field.required ? ' *' : ''}
									</label>
									{#if field.type === 'text' || field.type === 'phone' || field.type === 'email' || field.type === 'number'}
										<input
											id="custom-{field.id}"
											type={field.type === 'phone' ? 'tel' : field.type}
											bind:value={customValues[field.id]}
											placeholder={field.placeholder || ''}
											class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
										/>
									{:else if field.type === 'textarea'}
										<textarea
											id="custom-{field.id}"
											bind:value={customValues[field.id]}
											rows={2}
											placeholder={field.placeholder || ''}
											class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
										></textarea>
									{:else if field.type === 'checkbox'}
										<label class="flex items-center gap-2">
											<input
												id="custom-{field.id}"
												type="checkbox"
												checked={customValues[field.id] === 'true'}
												onchange={(e) => { customValues[field.id] = (e.target as HTMLInputElement).checked ? 'true' : 'false'; }}
												class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
											/>
											<span class="text-sm text-gray-700">{field.placeholder || field.label}</span>
										</label>
									{:else if field.type === 'select'}
										<select
											id="custom-{field.id}"
											bind:value={customValues[field.id]}
											class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
										>
											<option value="">Select...</option>
											{#each field.options as option}
												<option value={option}>{option}</option>
											{/each}
										</select>
									{:else if field.type === 'radio'}
										<div class="space-y-1.5">
											{#each field.options as option}
												<label class="flex items-center gap-2">
													<input
														type="radio"
														name="custom-{field.id}"
														value={option}
														checked={customValues[field.id] === option}
														onchange={() => { customValues[field.id] = option; }}
														class="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
													/>
													<span class="text-sm text-gray-700">{option}</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						{/each}

						<div class="flex gap-2 pt-1">
							<button
								onclick={() => { step = 'time'; }}
								class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
							>
								Back
							</button>
							<button
								onclick={submit}
								disabled={submitting || !name.trim() || !email.trim()}
								class="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
							>
								{submitting ? 'Booking...' : 'Confirm Booking'}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Step: Success -->
			{#if step === 'done'}
				<div class="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
					<div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
					</div>
					<h3 class="text-base font-semibold text-gray-900">Booking confirmed</h3>
					<p class="mt-2 text-sm text-gray-600">{bookedTime}</p>
					{#if bookedMeetLink}
						<p class="mt-2 text-sm">
							<a href={bookedMeetLink} target="_blank" rel="noopener" class="text-brand-600 underline hover:text-brand-500">Join Google Meet</a>
						</p>
					{/if}
					<p class="mt-2 text-xs text-gray-400">A confirmation email has been sent to {email}.</p>
				</div>
			{/if}

			<!-- Footer -->
			<div class="mt-6 text-center">
				<p class="text-[10px] text-gray-300">Powered by PM</p>
			</div>
		</div>
	{/if}
</div>
