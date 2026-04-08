/**
 * Time awareness for Shelly: format current date/time for the child's location.
 * Used when building the system prompt so Shelly can reference time of day naturally.
 */

/**
 * Format a human-readable current date and time for the prompt.
 * Prefer clientLocalTime (ISO string) so we don't need timezone math on the server.
 */
export function getTimeDescription(options: {
  timezone?: string | null;
  clientLocalTime?: string | null;
}): string {
  const { timezone, clientLocalTime } = options;
  let date: Date;

  if (clientLocalTime) {
    const parsed = new Date(clientLocalTime);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
    else date = new Date();
  } else {
    date = new Date();
  }

  const locale = 'en-US';
  let timeStr: string;
  let dateStr: string;

  if (timezone) {
    try {
      timeStr = date.toLocaleTimeString(locale, {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      dateStr = date.toLocaleDateString(locale, {
        timeZone: timezone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      timeStr = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
      dateStr = date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  } else {
    timeStr = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
    dateStr = date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return `${dateStr}, ${timeStr}`;
}
