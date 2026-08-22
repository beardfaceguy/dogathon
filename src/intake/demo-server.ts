import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { ORG } from "../dogs.js";
import { escapeHtml } from "../html.js";
import { configuredHost } from "../host.js";
import { intakeApi } from "./api.js";

function intakePage() {
  return readFileSync(
    resolve(process.cwd(), "public", "intake.html"),
    "utf8",
  )
    .replaceAll("{{ORG}}", escapeHtml(ORG))
    .replace(
      "<!--INTAKE_NAV-->",
      '<nav aria-label="Demo mode"><span class="status ready">Credential-free local demo</span></nav>',
    );
}

export function intakeDemoPort(value: string | undefined): number {
  if (value === undefined) return 4112;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(
      "INTAKE_DEMO_PORT must be an integer from 1024 through 65535.",
    );
  }
  return port;
}

export function intakeDemoHost(value: string | undefined): string {
  return configuredHost(value, "INTAKE_DEMO_HOST");
}

export const intakeDemoApp = new Hono()
  .get("/", (c) => c.redirect("/intake"))
  .get("/intake", (c) => c.html(intakePage()))
  .route("/api/intake", intakeApi);

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const hostname = intakeDemoHost(process.env.INTAKE_DEMO_HOST);
  const port = intakeDemoPort(process.env.INTAKE_DEMO_PORT);
  serve({
    fetch: intakeDemoApp.fetch,
    hostname,
    port,
  }, (info) => {
    console.log(`\n  Intake normalizer → http://${hostname}:${info.port}/intake\n`);
  });
}
