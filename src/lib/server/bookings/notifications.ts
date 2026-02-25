import { sendEmail } from '$lib/server/notifications/email.js';
import { generateIcs, type IcsEvent } from './ics.js';

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bookingEmailHtml(opts: { heading: string; details: string[]; note?: string }): string {
	const rows = opts.details.map((d) => `<p style="margin:2px 0;color:#444;font-size:14px;">${d}</p>`).join('');
	const note = opts.note
		? `<p style="margin:12px 0 0;color:#666;font-size:13px;font-style:italic;">${escapeHtml(opts.note)}</p>`
		: '';

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="padding:24px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#111;">${escapeHtml(opts.heading)}</h2>
      ${rows}
      ${note}
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e5e5e5;">
      <p style="margin:0;color:#999;font-size:11px;">Sent by PM</p>
    </div>
  </div>
</body>
</html>`;
}

function formatTime(ms: number, timezone: string): string {
	return new Date(ms).toLocaleString('en-US', {
		timeZone: timezone,
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

export interface BookingInfo {
	id: string;
	inviteeName: string;
	inviteeEmail: string;
	startTime: number;
	endTime: number;
	timezone: string;
	notes?: string | null;
}

export interface EventTypeInfo {
	title: string;
	durationMinutes: number;
	location?: string | null;
}

export interface OwnerInfo {
	name: string;
	email: string;
}

export async function sendBookingConfirmation(
	booking: BookingInfo,
	eventType: EventTypeInfo,
	owner: OwnerInfo,
	meetLink?: string | null
): Promise<void> {
	const icsEvent: IcsEvent = {
		uid: `booking-${booking.id}@pm`,
		title: eventType.title,
		description: booking.notes || undefined,
		location: meetLink || eventType.location || undefined,
		startTime: booking.startTime,
		endTime: booking.endTime,
		organizerName: owner.name,
		organizerEmail: owner.email,
		attendeeName: booking.inviteeName,
		attendeeEmail: booking.inviteeEmail
	};

	const icsContent = generateIcs(icsEvent, 'REQUEST');
	const attachment = { filename: 'invite.ics', content: Buffer.from(icsContent) };
	const timeStr = formatTime(booking.startTime, booking.timezone);

	const locationDetails: string[] = [];
	if (meetLink) {
		locationDetails.push(`Join: <a href="${escapeHtml(meetLink)}" style="color:#2d4f3e;">${escapeHtml(meetLink)}</a>`);
	} else if (eventType.location) {
		locationDetails.push(`Location: ${escapeHtml(eventType.location)}`);
	}

	// Email to invitee
	await sendEmail(
		booking.inviteeEmail,
		`Booking Confirmed: ${eventType.title}`,
		bookingEmailHtml({
			heading: 'Your booking is confirmed',
			details: [
				`<strong>${escapeHtml(eventType.title)}</strong>`,
				`${escapeHtml(timeStr)} (${eventType.durationMinutes} min)`,
				`With: ${escapeHtml(owner.name)}`,
				...locationDetails
			],
			note: booking.notes || undefined
		}),
		[attachment]
	);

	// Email to owner
	await sendEmail(
		owner.email,
		`New Booking: ${booking.inviteeName} — ${eventType.title}`,
		bookingEmailHtml({
			heading: 'New booking received',
			details: [
				`<strong>${escapeHtml(eventType.title)}</strong>`,
				`${escapeHtml(timeStr)} (${eventType.durationMinutes} min)`,
				`With: ${escapeHtml(booking.inviteeName)} (${escapeHtml(booking.inviteeEmail)})`,
				...locationDetails
			],
			note: booking.notes || undefined
		}),
		[attachment]
	);
}

export async function sendBookingCancellation(
	booking: BookingInfo,
	eventType: EventTypeInfo,
	owner: OwnerInfo
): Promise<void> {
	const icsEvent: IcsEvent = {
		uid: `booking-${booking.id}@pm`,
		title: eventType.title,
		location: eventType.location || undefined,
		startTime: booking.startTime,
		endTime: booking.endTime,
		organizerName: owner.name,
		organizerEmail: owner.email,
		attendeeName: booking.inviteeName,
		attendeeEmail: booking.inviteeEmail
	};

	const icsContent = generateIcs(icsEvent, 'CANCEL');
	const attachment = { filename: 'cancel.ics', content: Buffer.from(icsContent) };
	const timeStr = formatTime(booking.startTime, booking.timezone);

	await sendEmail(
		booking.inviteeEmail,
		`Booking Cancelled: ${eventType.title}`,
		bookingEmailHtml({
			heading: 'Your booking has been cancelled',
			details: [
				`<strong>${escapeHtml(eventType.title)}</strong>`,
				`${escapeHtml(timeStr)} (${eventType.durationMinutes} min)`,
				`With: ${escapeHtml(owner.name)}`
			]
		}),
		[attachment]
	);
}
