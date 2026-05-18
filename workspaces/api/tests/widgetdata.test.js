import { test } from "node:test";
import assert from "node:assert/strict";
import { nextGarbageDay, fetchWeather, fetchCatfish, fetchPower, fetchWidgetData } from "../src/widgetdata.js";
import schedule from "../malahide-waste-schedule.2026.monday.json" with { type: "json" };

// ── nextGarbageDay ────────────────────────────────────────────────────────────

test("nextGarbageDay — today is a pickup day returns that day", () => {
  const result = nextGarbageDay(schedule, "2026-05-18");
  assert.deepEqual(result, { date: "2026-05-18", type: "paper/cardboard" });
});

test("nextGarbageDay — mid-week returns next Monday pickup", () => {
  const result = nextGarbageDay(schedule, "2026-05-19");
  assert.deepEqual(result, { date: "2026-05-25", type: "bluebox" });
});

test("nextGarbageDay — past last schedule entry returns null", () => {
  const result = nextGarbageDay(schedule, "2026-12-29");
  assert.equal(result, null);
});

// ── fetchWeather ──────────────────────────────────────────────────────────────

test("fetchWeather — success returns { temperature, conditions, windspeed }", async () => {
  const mockFetch = async () =>
    Response.json({
      current: { temperature_2m: 18.4, weathercode: 2, windspeed_10m: 12.1 },
    });
  const result = await fetchWeather(mockFetch);
  assert.equal(typeof result.temperature, "number");
  assert.equal(typeof result.conditions, "string");
  assert.equal(typeof result.windspeed, "number");
});

test("fetchWeather — upstream throws returns { error: 'unavailable' }", async () => {
  const mockFetch = async () => { throw new Error("network"); };
  const result = await fetchWeather(mockFetch);
  assert.deepEqual(result, { error: "unavailable" });
});

// ── fetchCatfish ──────────────────────────────────────────────────────────────

test("fetchCatfish — success returns { title, date, link, state, image }", async () => {
  const mockFetch = async () =>
    Response.json([
      {
        title: { rendered: "WATER SAFETY WATERSHED CONDITIONS STATEMENT &#8211; March 2, 2026" },
        date: "2026-03-02T08:52:00",
        link: "https://www.catfishcreek.ca/water-safety-watershed-conditions-statement-march-2-2026/",
        content: { rendered: '<img src="https://www.catfishcreek.ca/wp-content/uploads/2016/10/Flood-Status-Water-Safety.png">' },
      },
    ]);
  const result = await fetchCatfish(mockFetch);
  assert.equal(typeof result.title, "string");
  assert.equal(typeof result.date, "string");
  assert.equal(typeof result.link, "string");
  assert.equal(result.state, "water-safety");
  assert.ok(result.image.includes("Flood-Status-Water-Safety.png"));
});

test("fetchCatfish — post without status image defaults to normal", async () => {
  const mockFetch = async () =>
    Response.json([
      {
        title: { rendered: "Administrative Boundary Update" },
        date: "2026-02-23T12:50:22",
        link: "https://www.catfishcreek.ca/admin-boundary/",
        content: { rendered: "<p>No status image in this post.</p>" },
      },
    ]);
  const result = await fetchCatfish(mockFetch);
  assert.equal(result.state, "normal");
  assert.ok(result.image.includes("Flood-Status-Normal.png"));
});

test("fetchCatfish — post with expired expiry date defaults to normal", async () => {
  const mockFetch = async () =>
    Response.json([
      {
        title: { rendered: "FLOOD OUTLOOK &#8211; January 5, 2026" },
        date: "2026-01-05T08:00:00",
        link: "https://www.catfishcreek.ca/flood-outlook-jan-5/",
        content: {
          rendered:
            '<img src="https://www.catfishcreek.ca/wp-content/uploads/2016/10/Flood-Status-Flood-Outlook.png">' +
            " This statement is in effect until <strong>12</strong><strong>:00</strong> <strong>p.m., Monday January 12,</strong> and will be adjusted.",
        },
      },
    ]);
  const result = await fetchCatfish(mockFetch);
  assert.equal(result.state, "normal");
  assert.ok(result.image.includes("Flood-Status-Normal.png"));
});

test("fetchCatfish — upstream throws returns { error: 'unavailable' }", async () => {
  const mockFetch = async () => { throw new Error("network"); };
  const result = await fetchCatfish(mockFetch);
  assert.deepEqual(result, { error: "unavailable" });
});

// ── fetchPower ────────────────────────────────────────────────────────────────

test("fetchPower — success returns { on: true }", async () => {
  const mockFetch = async () => Response.json({ on: true });
  const result = await fetchPower(mockFetch, "https://power.example.com/api/power");
  assert.deepEqual(result, { on: true });
});

test("fetchPower — upstream throws returns { error: 'unavailable' }", async () => {
  const mockFetch = async () => { throw new Error("network"); };
  const result = await fetchPower(mockFetch, "https://power.example.com/api/power");
  assert.deepEqual(result, { error: "unavailable" });
});

test("fetchPower — no url configured returns { error: 'unavailable' }", async () => {
  const result = await fetchPower(fetch, undefined);
  assert.deepEqual(result, { error: "unavailable" });
});

// ── fetchWidgetData ───────────────────────────────────────────────────────────

test("fetchWidgetData — one source fails, other three still populated", async () => {
  const mockFetch = async (url) => {
    if (url.includes("open-meteo")) throw new Error("weather down");
    if (url.includes("catfishcreek"))
      return Response.json([
        {
          title: { rendered: "Normal Conditions" },
          date: "2026-02-23T09:49:30",
          link: "https://www.catfishcreek.ca/",
          content: { rendered: '<img src="https://www.catfishcreek.ca/wp-content/uploads/2016/10/Flood-Status-Normal.png">' },
        },
      ]);
    if (url.includes("power")) return Response.json({ on: true });
    throw new Error("unexpected url");
  };
  const result = await fetchWidgetData(mockFetch, "https://power.example.com/api/power");
  assert.deepEqual(result.weather, { error: "unavailable" });
  assert.ok(result.garbage);
  assert.ok(result.catfish.title);
  assert.deepEqual(result.power, { on: true });
});
