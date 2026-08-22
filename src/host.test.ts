import assert from "node:assert/strict";
import test from "node:test";

import { configuredHost } from "./host.js";

test("server hosts default locally and reject accidental empty exposure", () => {
  assert.equal(configuredHost(undefined, "HOST"), "localhost");
  assert.equal(configuredHost("0.0.0.0", "HOST"), "0.0.0.0");
  for (const value of ["", " ", " host "]) {
    assert.throws(
      () => configuredHost(value, "HOST"),
      /HOST must be a non-empty, trimmed hostname/,
    );
  }
});
