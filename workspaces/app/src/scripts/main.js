/**
 * main.js — Waneeta Beach application entry point
 *
 * Browser target. Handles initialisation of UI components and page interactions.
 */

const CATFISH_STATES = {
  "normal":       "Normal conditions",
  "water-safety": "Water Safety Statement",
  "flood-outlook":"Flood Outlook",
  "watch":        "Flood Watch",
  "warning":      "Flood Warning",
};

class Main {
  constructor() {}

  async init() {
    this.setupUi();
  }

  setupUi() {
    this.loadWidgets();
  }

  async loadWidgets() {
    const weatherEl = document.getElementById("widget-weather")?.querySelector(".widget-body");
    const garbageEl = document.getElementById("widget-garbage")?.querySelector(".widget-body");
    const catfishEl = document.getElementById("widget-catfish")?.querySelector(".widget-body");

    // All three target elements must exist — we are on the home page
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
      const { temperature, conditions, windspeed } = data.weather;
      weatherEl.textContent = `${temperature}°C · ${conditions} · Wind ${windspeed} km/h`;
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
      catfishEl.textContent = `${label} · ${data.catfish.date}`;
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
