import { test } from "node:test";
import assert from "node:assert/strict";
import { camera, ride, timeline, WORLD } from "../lib/ride";

test("ride timeline moves forward only and holds at each act's stop", () => {
  const { stops } = ride();
  assert.deepEqual(
    [...stops].sort((a, b) => a - b),
    stops,
  );
  let last = -1;
  for (let p = 0; p <= 4; p += 0.01) {
    const { t } = timeline(p);
    assert.ok(t >= last - 1e-9, `rewinds at p=${p.toFixed(2)}`);
    last = t;
  }
  // The end of every act is a hold on that act's stop.
  for (const act of [1, 2, 3, 4]) {
    const hold = timeline(act);
    assert.equal(hold.holding, act);
    assert.equal(hold.t, stops[act]);
  }
  assert.equal(timeline(0.5).holding, -1);
  assert.equal(timeline(-1).t, 0);
  assert.equal(timeline(9).t, 1);
});

test("ride camera stays inside the world", () => {
  for (const narrow of [false, true]) {
    const [viewW, viewH] = narrow ? [470, 620] : [1216, 760];
    for (let p = 0; p <= 4; p += 0.05) {
      const v = camera(timeline(p).t, viewW, viewH, narrow);
      assert.ok(v.x >= 0 && v.x + viewW / v.zoom <= WORLD.w + 1e-6);
      assert.ok(v.y >= 0 && v.y + viewH / v.zoom <= WORLD.h + 1e-6);
    }
  }
});
