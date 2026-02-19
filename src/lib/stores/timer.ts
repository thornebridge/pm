import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

interface TimerState {
	running: boolean;
	taskId: string | null;
	projectId: string | null;
	startedAt: number | null;
}

const initial: TimerState = browser
	? JSON.parse(localStorage.getItem('pm-timer') || 'null') ?? { running: false, taskId: null, projectId: null, startedAt: null }
	: { running: false, taskId: null, projectId: null, startedAt: null };

export const timer = writable<TimerState>(initial);

if (browser) {
	timer.subscribe((value) => {
		localStorage.setItem('pm-timer', JSON.stringify(value));
	});
}

export function startTimer(taskId: string, projectId: string) {
	timer.set({ running: true, taskId, projectId, startedAt: Date.now() });
}

export function stopTimer(): { taskId: string; projectId: string; startedAt: number; durationMs: number } | null {
	const state = get(timer);
	if (!state.running || !state.taskId || !state.projectId || !state.startedAt) return null;

	const result = {
		taskId: state.taskId,
		projectId: state.projectId,
		startedAt: state.startedAt,
		durationMs: Date.now() - state.startedAt
	};

	timer.set({ running: false, taskId: null, projectId: null, startedAt: null });
	return result;
}
