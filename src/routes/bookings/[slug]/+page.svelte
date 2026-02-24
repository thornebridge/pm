<script lang="ts">
	let { data } = $props();

	type Slot = { startTime: number; endTime: number };

	let step = $state<'date' | 'time' | 'form' | 'done'>('date');
	let selectedDate = $state('');
	let slots = $state<Slot[]>([]);
	let loadingSlots = $state(false);
	let selectedSlot = $state<Slot | null>(null);
	let name = $state('');
	let email = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let errorMsg = $state('');
	let bookedTime = $state('');

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
		const dow = d.getDay();
		if (dow === 0 || dow === 6) return false; // weekends
		if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false; // past
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

	async function submit() {
		if (!selectedSlot || !name.trim() || !email.trim()) return;
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
					notes: notes.trim() || undefined
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || 'Booking failed');

			bookedTime = formatSlotTime(selectedSlot.startTime, selectedSlot.endTime);
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

<div class="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
	{#if data.notFound}
		<div class="text-center">
			<h1 class="text-lg font-medium text-neutral-300">Booking page not found</h1>
			<p class="mt-2 text-sm text-neutral-600">This link may be inactive or incorrect.</p>
		</div>
	{:else if data.eventType}
		<div class="w-full max-w-md">
			<!-- Header -->
			<div class="mb-6 text-center">
				<div class="mx-auto mb-3 h-3 w-3 rounded-full" style="background-color: {data.eventType.color}"></div>
				<p class="text-xs text-neutral-600">{data.ownerName}</p>
				<h1 class="text-lg font-medium text-neutral-200">{data.eventType.title}</h1>
				<div class="mt-1 flex items-center justify-center gap-3 text-xs text-neutral-500">
					<span>{data.eventType.durationMinutes} min</span>
					{#if data.eventType.location}
						<span>&middot; {data.eventType.location}</span>
					{/if}
				</div>
				{#if data.eventType.description}
					<p class="mt-2 text-sm text-neutral-500">{data.eventType.description}</p>
				{/if}
			</div>

			{#if errorMsg}
				<div class="mb-4 rounded border border-red-900/50 bg-red-950/50 px-3 py-2 text-xs text-red-400">{errorMsg}</div>
			{/if}

			<!-- Step: Date Selection -->
			{#if step === 'date' || step === 'time'}
				<div class="rounded-lg border border-neutral-800/60 bg-neutral-900 p-4">
					<!-- Calendar Header -->
					<div class="mb-3 flex items-center justify-between">
						<button onclick={prevMonth} class="rounded p-1 text-neutral-500 hover:text-neutral-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						</button>
						<span class="text-sm font-medium text-neutral-300">{monthLabel}</span>
						<button onclick={nextMonth} class="rounded p-1 text-neutral-500 hover:text-neutral-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
						</button>
					</div>

					<!-- Day Headers -->
					<div class="mb-1 grid grid-cols-7 text-center text-[10px] text-neutral-600">
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
								class="flex h-8 items-center justify-center rounded text-sm transition
									{isSelected ? 'bg-brand-600 text-white' : selectable ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-800 cursor-default'}"
							>
								{day}
							</button>
						{/each}
					</div>

					<div class="mt-2 text-center text-[10px] text-neutral-600">{timezone}</div>
				</div>

				<!-- Time Slots -->
				{#if step === 'time'}
					<div class="mt-4 rounded-lg border border-neutral-800/60 bg-neutral-900 p-4">
						<h3 class="mb-3 text-center text-xs font-medium text-neutral-400">
							{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
						</h3>
						{#if loadingSlots}
							<div class="py-4 text-center text-sm text-neutral-600">Loading...</div>
						{:else if slots.length === 0}
							<div class="py-4 text-center text-sm text-neutral-600">No available times on this date.</div>
						{:else}
							<div class="grid grid-cols-2 gap-2">
								{#each slots as slot}
									<button
										onclick={() => selectSlot(slot)}
										class="rounded border border-neutral-800/60 px-3 py-2 text-sm text-neutral-300 transition hover:border-brand-500 hover:text-brand-400"
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
				<div class="rounded-lg border border-neutral-800/60 bg-neutral-900 p-4">
					<div class="mb-4 border-b border-neutral-800 pb-3">
						<p class="text-sm font-medium text-neutral-300">{formatFullTime(selectedSlot.startTime)}</p>
						<p class="text-xs text-neutral-600">{data.eventType.durationMinutes} min &middot; {timezone}</p>
					</div>
					<div class="space-y-3">
						<div>
							<label for="book-name" class="mb-1 block text-xs text-neutral-500">Name *</label>
							<input
								id="book-name"
								bind:value={name}
								placeholder="Your name"
								class="w-full rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-neutral-600"
							/>
						</div>
						<div>
							<label for="book-email" class="mb-1 block text-xs text-neutral-500">Email *</label>
							<input
								id="book-email"
								type="email"
								bind:value={email}
								placeholder="your@email.com"
								class="w-full rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-neutral-600"
							/>
						</div>
						<div>
							<label for="book-notes" class="mb-1 block text-xs text-neutral-500">Notes</label>
							<textarea
								id="book-notes"
								bind:value={notes}
								rows={2}
								placeholder="Anything you'd like to share"
								class="w-full rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-neutral-600"
							></textarea>
						</div>
						<div class="flex gap-2 pt-1">
							<button
								onclick={() => { step = 'time'; }}
								class="rounded border border-neutral-800/60 px-3 py-2 text-sm text-neutral-500 transition hover:text-neutral-300"
							>
								Back
							</button>
							<button
								onclick={submit}
								disabled={submitting || !name.trim() || !email.trim()}
								class="flex-1 rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
							>
								{submitting ? 'Booking...' : 'Confirm Booking'}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Step: Success -->
			{#if step === 'done'}
				<div class="rounded-lg border border-neutral-800/60 bg-neutral-900 p-6 text-center">
					<div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-900/50">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
					</div>
					<h3 class="text-base font-medium text-neutral-200">Booking confirmed</h3>
					<p class="mt-2 text-sm text-neutral-400">{bookedTime}</p>
					<p class="mt-1 text-xs text-neutral-600">A confirmation email has been sent to {email}.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
