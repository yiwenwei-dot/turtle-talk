/**
 * Location awareness for Shelly: short description of where the child is.
 * Used in the system prompt so Shelly can reference place when relevant (e.g. "sunny where you are").
 */

import type { AwarenessLocation } from '../types';

export function getLocationDescription(location: AwarenessLocation | undefined | null): string {
  if (!location) return '';

  const parts: string[] = [];
  if (location.city?.trim()) parts.push(location.city.trim());
  if (location.region?.trim()) parts.push(location.region.trim());
  if (location.country?.trim()) parts.push(location.country.trim());

  if (parts.length === 0) return '';
  return parts.join(', ');
}
