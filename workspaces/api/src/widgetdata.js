import schedule from "../malahide-waste-schedule.2026.monday.json" with { type: "json" };

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=42.655895370745334&longitude=-81.0088825336432" +
  "&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=celsius";

const CATFISH_URL =
  "https://www.catfishcreek.ca/wp-json/wp/v2/posts" +
  "?categories=22&per_page=1&_fields=id,date,title,link,content";

const NORMAL_IMAGE =
  "https://www.catfishcreek.ca/wp-content/uploads/2016/10/Flood-Status-Normal.png";

const MONTHS = {
  January:1, February:2, March:3, April:4, May:5, June:6,
  July:7, August:8, September:9, October:10, November:11, December:12,
};

/**
 * Parse an "in effect until" expiry string into an ISO date (YYYY-MM-DD).
 * Returns null when no parseable date is found.
 *
 * @param {string} text  - Plain text of post content
 * @param {string} postDate - Post date as YYYY-MM-DD (used to infer the year)
 * @returns {string | null}
 */
function parseExpiryDate(text, postDate) {
  const m = text.match(
    /in effect until\s+\d{1,2}\s*:\s*\d{2}\s+[ap]\.m\..*?\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i
  );
  if (!m) return null;

  const month = MONTHS[m[1]];
  const day = parseInt(m[2]);
  const postYear = parseInt(postDate.slice(0, 4));
  const postMonth = parseInt(postDate.slice(5, 7));
  const year = m[3] ? parseInt(m[3]) : (month < postMonth ? postYear + 1 : postYear);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** WMO weather code → human-readable description. Covers codes used by Open-Meteo. */
const WMO = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Rain showers", 82: "Violent rain showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
};

/**
 * Return the next garbage pickup on or after today.
 *
 * @param {Record<string,string>} sched - ISO date → collection type map
 * @param {string} today - ISO date string (YYYY-MM-DD)
 * @returns {{ date: string, type: string } | null}
 */
export function nextGarbageDay(sched, today) {
  const entry = Object.entries(sched).find(([date]) => date >= today);
  return entry ? { date: entry[0], type: entry[1] } : null;
}

/**
 * @param {typeof fetch} fetchFn
 * @returns {Promise<{ temperature: number, conditions: string, windspeed: number } | { error: string }>}
 */
export async function fetchWeather(fetchFn) {
  try {
    const res = await fetchFn(WEATHER_URL);
    const { current } = await res.json();
    return {
      temperature: current.temperature_2m,
      conditions: WMO[current.weathercode] ?? "Unknown",
      windspeed: current.windspeed_10m,
    };
  } catch {
    return { error: "unavailable" };
  }
}

/**
 * @param {typeof fetch} fetchFn
 * @returns {Promise<{ title: string, date: string, link: string, state: string, image: string } | { error: string }>}
 */
export async function fetchCatfish(fetchFn) {
  try {
    const res = await fetchFn(CATFISH_URL);
    const [post] = await res.json();
    const html = post.content.rendered;
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const title = post.title.rendered.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
    const base = { title, date: post.date.slice(0, 10), link: post.link };

    const imgMatch = html.match(/(https:\/\/[^"]*Flood-Status-([^"./]+)\.png)/);
    if (!imgMatch) return { ...base, state: "normal", image: NORMAL_IMAGE };

    const expiryDate = parseExpiryDate(plain, post.date.slice(0, 10));
    const today = new Date().toISOString().slice(0, 10);
    if (expiryDate !== null && expiryDate < today) {
      return { ...base, state: "normal", image: NORMAL_IMAGE };
    }

    return { ...base, state: imgMatch[2].toLowerCase(), image: imgMatch[1] };
  } catch {
    return { error: "unavailable" };
  }
}

/**
 * @param {typeof fetch} fetchFn
 * @param {string | undefined} url - Power API endpoint; undefined → unavailable
 * @returns {Promise<{ on: boolean } | { error: string }>}
 */
export async function fetchPower(fetchFn, url) {
  if (!url) return { error: "unavailable" };
  try {
    const res = await fetchFn(url);
    return await res.json();
  } catch {
    return { error: "unavailable" };
  }
}

/**
 * Fan out to all four upstream sources concurrently.
 *
 * @param {typeof fetch} fetchFn
 * @param {string | undefined} powerUrl
 * @returns {Promise<{ weather, garbage, catfish, power }>}
 */
export async function fetchWidgetData(fetchFn, powerUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const [weather, catfish, power] = await Promise.all([
    fetchWeather(fetchFn),
    fetchCatfish(fetchFn),
    fetchPower(fetchFn, powerUrl),
  ]);
  return { weather, garbage: nextGarbageDay(schedule, today), catfish, power };
}
