import { processAutomations } from './engine.js';
import type { AutomationEventPayload } from './types.js';

export function emitAutomationEvent(payload: AutomationEventPayload): void {
	processAutomations(payload).catch((err) => {
		console.error('[automations] Error processing event:', payload.event, err);
	});
}
