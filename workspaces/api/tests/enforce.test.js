import { test } from "node:test";
import assert from "node:assert/strict";
import { enforce } from "../src/enforce.js";

test("enforce — admin claims returns true", () => {
  assert.equal(enforce({ role: "admin" }, "resource", "read"), true);
});

test("enforce — member claims returns false", () => {
  assert.equal(enforce({ role: "member" }, "resource", "read"), false);
});

test("enforce — null claims returns false", () => {
  assert.equal(enforce(null, "resource", "read"), false);
});
