import assert from "node:assert/strict";
import test from "node:test";

import { escapeHtml } from "./html.js";

test("escapes branding before inserting it into HTML", () => {
  assert.equal(
    escapeHtml(`<Dog & "Cat's">`),
    "&lt;Dog &amp; &quot;Cat&#39;s&quot;&gt;",
  );
});
