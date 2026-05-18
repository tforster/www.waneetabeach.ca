import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

// Build once before all tests in this file
before(() => {
  execSync("node devops/build.js", { stdio: "pipe" });
});

const html = () => readFileSync("workspaces/app/dist/index.html", "utf8");
const css = () => readFileSync("workspaces/app/dist/main.css", "utf8");

test("dist/index.html is produced by the build", () => {
  assert.ok(existsSync("workspaces/app/dist/index.html"));
});

test("dist/index.html has lang=en", () => {
  assert.ok(html().includes('lang="en"'));
});

test("dist/index.html references Pico CSS", () => {
  assert.ok(html().includes("pico"), "Pico CSS not referenced");
});

test("dist/index.html has semantic landmark elements", () => {
  const page = html();
  assert.ok(page.includes("<header"), "missing <header>");
  assert.ok(page.includes("<nav"),    "missing <nav>");
  assert.ok(page.includes("<main"),   "missing <main>");
  assert.ok(page.includes("<footer"), "missing <footer>");
});

test("dist/index.html has a single h1", () => {
  const matches = html().match(/<h1/g) ?? [];
  assert.equal(matches.length, 1, `expected 1 <h1>, found ${matches.length}`);
});

test("dist/index.html includes the entrance sign image", () => {
  assert.ok(html().includes("entrance-sign"), "missing entrance sign image");
});

test("dist/index.html has contained hero with rounded image wrapper", () => {
  assert.ok(html().includes("hero-image-wrapper"), "missing hero-image-wrapper");
});

test("dist/index.html includes the speed limit notice", () => {
  assert.ok(html().includes("15"), "missing 15 km/h notice");
});

test("dist/main.css defines core design tokens", () => {
  const sheet = css();
  assert.ok(sheet.includes("--color-primary"),  "missing --color-primary");
  assert.ok(sheet.includes("--font-serif"),      "missing --font-serif");
  assert.ok(sheet.includes("--shadow-sm"),       "missing --shadow-sm");
});

// Forum page
const forum = () => readFileSync("workspaces/app/dist/forum/index.html", "utf8");

test("dist/forum/index.html is produced by the build", () => {
  assert.ok(existsSync("workspaces/app/dist/forum/index.html"));
});

test("dist/forum/index.html has a single h1", () => {
  assert.equal((forum().match(/<h1/g) ?? []).length, 1);
});

test("dist/forum/index.html has thread-list container", () => {
  assert.ok(forum().includes("id=\"thread-list\""));
});

test("dist/forum/index.html has new-thread form", () => {
  assert.ok(forum().includes("id=\"new-thread-form\""));
});

test("dist/forum/index.html has reply form", () => {
  assert.ok(forum().includes("id=\"reply-form\""));
});

// Login page
const login = () => readFileSync("workspaces/app/dist/login/index.html", "utf8");

test("dist/login/index.html is produced by the build", () => {
  assert.ok(existsSync("workspaces/app/dist/login/index.html"));
});

test("dist/login/index.html has login form", () => {
  assert.ok(login().includes("id=\"login-form\""));
});

test("dist/login/index.html has error element", () => {
  assert.ok(login().includes("id=\"login-error\""));
});

test("dist/login/index.html references login.js", () => {
  assert.ok(login().includes("/login.js"));
});
