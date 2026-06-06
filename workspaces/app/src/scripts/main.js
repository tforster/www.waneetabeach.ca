/**
 * main.js — Waneeta Beach application entry point
 *
 * Browser target. Handles initialisation of UI components and page interactions.
 */

/**
 * Catfish Creek advisory state labels.
 * @type {Record<string, string>}
 */
const CATFISH_STATES = {
  normal: "Normal conditions",
  "water-safety": "Water Safety Statement",
  "flood-outlook": "Flood Outlook",
  watch: "Flood Watch",
  warning: "Flood Warning",
};

/**
 * WMO weather interpretation code → Material Symbol icon name.
 * Codes sourced from Open-Meteo / WMO standard (0–99).
 * @type {Record<number, string>}
 */
const WEATHER_ICONS = {
  0: "clear_day",
  1: "clear_day",
  2: "partly_cloudy_day",
  3: "cloud",
  45: "foggy",
  48: "foggy",
  51: "grain",
  53: "grain",
  55: "grain",
  61: "rainy",
  63: "rainy",
  65: "rainy",
  71: "ac_unit",
  73: "ac_unit",
  75: "ac_unit",
  77: "ac_unit",
  80: "rainy",
  81: "rainy",
  82: "rainy",
  85: "ac_unit",
  86: "ac_unit",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
};

/**
 * Convert a wind bearing (0–360°) to an 8-point compass label.
 * @param {number} deg
 * @returns {string}
 */
function degreesToCompass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

class Main {
  constructor() {}

  /**
   * Initialises the Main application.
   *
   * @returns {Promise<void>}
   */
  async init() {
    this.setupUi();
  }

  /**
   * Sets up UI components and widget loading.
   *
   * @returns {void}
   */
  setupUi() {
    this.setupAuthNav();
    this.loadWidgets();
  }

  /**
   * Check session state and render the correct auth UI everywhere in the page.
   * Runs async in the background — does not block widget loading.
   *
   * @returns {Promise<void>}
   */
  async setupAuthNav() {
    let loggedIn = false;
    try {
      const res = await fetch("/api/auth/session");
      loggedIn = res.ok;
    } catch {
      // Network error — stay in logged-out state
    }

    document.querySelectorAll(".nav-auth-in").forEach((el) => {
      /** @type {HTMLElement} */ (el).hidden = !loggedIn;
    });
    document.querySelectorAll(".nav-auth-out").forEach((el) => {
      /** @type {HTMLElement} */ (el).hidden = loggedIn;
    });

    if (!loggedIn) return;

    document.querySelectorAll(".nav-logout-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await fetch("/api/auth/sign-out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
        } finally {
          window.location.replace("/");
        }
      });
    });
  }

  /**
   * Loads and renders widget data for weather, garbage, and Catfish Creek.
   *
   * @returns {Promise<void>}
   */
  async loadWidgets() {
    const weatherEl = document.getElementById("widget-weather")?.querySelector(".widget-body");
    const garbageEl = document.getElementById("widget-garbage")?.querySelector(".widget-body");
    const catfishEl = document.getElementById("widget-catfish")?.querySelector(".widget-body");
    const catfishDateEl = document.getElementById("widget-catfish-date");

    // All three primary target elements must exist — we are on the home page
    if (!weatherEl || !garbageEl || !catfishEl) return;

    let data;
    try {
      const res = await fetch("/api/widgetdata");
      data = await res.json();
    } catch {
      [weatherEl, garbageEl, catfishEl].forEach((el) => (el.textContent = "Unavailable"));
      return;
    }

    // Weather
    if (data.weather?.error) {
      weatherEl.textContent = "Weather data unavailable";
    } else {
      const { temperature, conditions, windspeed, weathercode, windDirection } = data.weather;
      const iconEl = document.getElementById("widget-weather-icon");
      if (iconEl) iconEl.textContent = WEATHER_ICONS[weathercode] ?? "partly_cloudy_day";
      const compass = degreesToCompass(windDirection);
      weatherEl.textContent = `${temperature}\u00b0C \u00b7 ${conditions} \u00b7 Wind ${windspeed} km/h ${compass}`;
    }

    // Garbage
    if (!data.garbage) {
      garbageEl.textContent = "No upcoming pickups scheduled";
    } else {
      const typeLabel = data.garbage.type === "bluebox" ? "Blue Box" : "Paper & Cardboard";
      garbageEl.textContent = `${data.garbage.date} · ${typeLabel}`;
    }

    // Catfish Creek
    if (data.catfish?.error) {
      catfishEl.textContent = "Advisory data unavailable";
    } else {
      const label = CATFISH_STATES[data.catfish.state] ?? "Conditions statement";
      catfishEl.textContent = label;
      if (catfishDateEl) catfishDateEl.textContent = `Last updated: ${data.catfish.date}`;
      // Point the link at the specific statement
      const link = /** @type {HTMLAnchorElement|null} */ (document.getElementById("widget-catfish-link"));
      if (link && data.catfish.link) link.href = data.catfish.link;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const main = new Main();
  await main.init();
});
