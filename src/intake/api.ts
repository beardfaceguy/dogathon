import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

import {
  normalizeIntake,
  toRawFreeProjection,
  type IntakeDraft,
  type NormalizedIntakeRecord,
} from "./normalize.js";

const MAX_INTAKE_BYTES = 100_000;

export const INTAKE_CORE_FIELDS = [
  { id: "animalId", label: "Animal ID" },
  { id: "intakeDate", label: "Intake date" },
  { id: "intakeType", label: "Intake type" },
  { id: "intakeReasonText", label: "Intake reason" },
  { id: "species", label: "Species" },
  { id: "ageGroup", label: "Age group" },
  { id: "sex", label: "Sex" },
  { id: "alteredStatus", label: "Altered status" },
] as const satisfies ReadonlyArray<{
  id: keyof NormalizedIntakeRecord;
  label: string;
}>;

const EXAMPLE_FILES = [
  {
    id: "emergency",
    label: "Emergency housing",
    file: "emergency-intake.json",
  },
  {
    id: "ambiguous",
    label: "Ambiguous intake",
    file: "malformed-ambiguous-intake.json",
  },
  {
    id: "owner-surrender",
    label: "Owner surrender",
    file: "owner-surrender-intake.json",
  },
  {
    id: "stray",
    label: "Municipal stray",
    file: "stray-intake.json",
  },
] as const;

function exampleDraft(file: string): IntakeDraft {
  const path = fileURLToPath(
    new URL(`../../test-data/intake-records/${file}`, import.meta.url),
  );
  return JSON.parse(readFileSync(path, "utf8")) as IntakeDraft;
}

const EXAMPLES = EXAMPLE_FILES.map(({ id, label, file }) => ({
  id,
  label,
  draft: exampleDraft(file),
}));

function acceptsJson(contentType: string | undefined): boolean {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json"
    || /^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(mediaType ?? "");
}

async function limitedBody(
  request: Request,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength
    && /^\d+$/.test(declaredLength)
    && Number(declaredLength) > MAX_INTAKE_BYTES
  ) {
    await request.body?.cancel();
    return { ok: false };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_INTAKE_BYTES) {
        await reader.cancel();
        return { ok: false };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: true, text: "" };
  }
}

function exceedsDepth(value: unknown, maximum: number): boolean {
  const pending: Array<{ value: unknown; depth: number }> = [
    { value, depth: 0 },
  ];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || current.value === null || typeof current.value !== "object") {
      continue;
    }
    if (current.depth > maximum) return true;
    const children = Array.isArray(current.value)
      ? current.value
      : Object.values(current.value);
    for (const child of children) {
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
  return false;
}

export const intakeApi = new Hono()
  .get("/examples", (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({
      examples: EXAMPLES,
      coreFields: INTAKE_CORE_FIELDS,
    });
  })
  .post("/normalize", async (c) => {
    c.header("Cache-Control", "no-store");
    if (!acceptsJson(c.req.header("content-type"))) {
      return c.json({
        ok: false,
        error: "Content-Type must be application/json.",
      }, 415);
    }
    const body = await limitedBody(c.req.raw);
    if (!body.ok) {
      return c.json({
        ok: false,
        error: "Intake record exceeds the 100 KB demo limit.",
      }, 413);
    }

    let draft: unknown;
    try {
      draft = JSON.parse(body.text);
    } catch {
      draft = null;
    }
    if (typeof draft !== "object" || draft === null || Array.isArray(draft)) {
      return c.json({
        ok: false,
        error: "Intake record must be a JSON object.",
      }, 400);
    }
    if (exceedsDepth(draft, 64)) {
      return c.json({
        ok: false,
        error: "Intake record exceeds the 64-level nesting limit.",
      }, 400);
    }

    return c.json({
      ok: true,
      result: toRawFreeProjection(normalizeIntake(draft as IntakeDraft)),
    });
  });
