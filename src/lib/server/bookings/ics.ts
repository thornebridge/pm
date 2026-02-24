/**
 * RFC 5545 iCalendar (.ics) file generator.
 * No external dependencies — the format is simple enough to template.
 */

export interface IcsEvent {
	uid: string;
	title: string;
	description?: string;
	location?: string;
	startTime: number; // unix ms
	endTime: number; // unix ms
	organizerName: string;
	organizerEmail: string;
	attendeeName: string;
	attendeeEmail: string;
}

function formatDateUtc(ms: number): string {
	const d = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		d.getUTCFullYear().toString() +
		pad(d.getUTCMonth() + 1) +
		pad(d.getUTCDate()) +
		'T' +
		pad(d.getUTCHours()) +
		pad(d.getUTCMinutes()) +
		pad(d.getUTCSeconds()) +
		'Z'
	);
}

function escapeIcs(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(event: IcsEvent, method: 'REQUEST' | 'CANCEL' = 'REQUEST'): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//PM//Bookings//EN',
		`METHOD:${method}`,
		'BEGIN:VEVENT',
		`UID:${event.uid}`,
		`DTSTAMP:${formatDateUtc(Date.now())}`,
		`DTSTART:${formatDateUtc(event.startTime)}`,
		`DTEND:${formatDateUtc(event.endTime)}`,
		`SUMMARY:${escapeIcs(event.title)}`,
		`ORGANIZER;CN=${escapeIcs(event.organizerName)}:mailto:${event.organizerEmail}`,
		`ATTENDEE;CN=${escapeIcs(event.attendeeName)};RSVP=TRUE:mailto:${event.attendeeEmail}`,
		`STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
		`SEQUENCE:${method === 'CANCEL' ? '1' : '0'}`
	];

	if (event.description) {
		lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
	}
	if (event.location) {
		lines.push(`LOCATION:${escapeIcs(event.location)}`);
	}

	lines.push('END:VEVENT', 'END:VCALENDAR');

	return lines.join('\r\n') + '\r\n';
}
