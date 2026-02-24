import { processCrmAutomations } from './engine.js';
import type { CrmAutomationPayload } from './types.js';

export function emitCrmAutomationEvent(payload: CrmAutomationPayload): void {
	processCrmAutomations(payload).catch((err) => {
		console.error('[crm-automations] Error processing event:', payload.event, err);
	});
}
