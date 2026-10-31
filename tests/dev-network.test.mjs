import assert from "node:assert/strict";
import { test } from "node:test";
import { developmentLookup } from "../scripts/dev-network.mjs";

test("WSL: 外部APIの名前解決をIPv4に限定し、allオプションとコールバックを維持する", () => {
  const callback = () => {};
  const calls = [];
  const lookup = developmentLookup((...args) => calls.push(args), true);
  lookup("project.supabase.co", { all: true }, callback);
  assert.deepEqual(calls[0], ["project.supabase.co", { all: true, family: 4 }, callback]);
  lookup("api.themoviedb.org", callback);
  assert.deepEqual(calls[1], ["api.themoviedb.org", { family: 4 }, callback]);
});

test("WSL: localhost・無関係なホスト・明示的なIPv6は変更しない", () => {
  const callback = () => {};
  for (const [hostname, options] of [["localhost", { all: true }], ["example.com", 0], ["project.supabase.co.evil.invalid", {}], ["project.supabase.co", { family: 6 }]]) {
    developmentLookup((...args) => assert.deepEqual(args, [hostname, options, callback]), true)(hostname, options, callback);
  }
  developmentLookup((...args) => assert.deepEqual(args, ["project.supabase.co", {}, callback]), false)("project.supabase.co", {}, callback);
});
