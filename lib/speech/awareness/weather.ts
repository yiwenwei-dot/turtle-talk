/**
 * Weather awareness for Shelly: fetch current conditions from Open-Meteo (free, no API key).
 * Used when building the system prompt so Shelly can reference weather naturally.
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/** WMO weather code → short child-friendly description */
const WEATHER_LABELS: Record<number, string> = {
  0: 'clear',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'foggy',
  51: 'drizzly',
  53: 'drizzly',
  55: 'drizzly',
  61: 'rainy',
  63: 'rainy',
  65: 'rainy',
  71: 'snowy',
  73: 'snowy',
  75: 'snowy',
  80: 'light rain',
  81: 'rainy',
  82: 'rainy',
  85: 'snowy',
  86: 'snowy',
  95: 'stormy',
  96: 'stormy',
  99: 'stormy',
};

function weatherCodeToLabel(code: number): string {
  return WEATHER_LABELS[code] ?? 'clear';
}

/**
 * Fetch current weather for the given coordinates. Returns a short sentence for the prompt.
 */
export async function getWeatherDescription(latitude: number, longitude: number): Promise<string> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
  });
  const url = `${OPEN_METEO_URL}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) return '';

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      weather_code?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
    };
  };
  const cur = data?.current;
  if (!cur) return '';

  const temp = cur.temperature_2m;
  const code = cur.weather_code ?? 0;
  const label = weatherCodeToLabel(code);
  const tempF = temp != null ? Math.round((temp * 9) / 5 + 32) : null;

  const parts: string[] = [];
  if (label) parts.push(label);
  if (tempF != null) parts.push(`${tempF}°F`);
  if (cur.wind_speed_10m != null && cur.wind_speed_10m > 15) {
    parts.push('breezy');
  }
  return parts.join(', ');
}
