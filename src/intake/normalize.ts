/** Deterministic normalization boundary for shelter intake records.
 *
 * Context: ../../CONTEXT.md and ../../docs/adr/2026-08-22-deterministic-intake-core.md
 */
import { createHash } from "node:crypto";

export const INTAKE_SCHEMA_VERSION = "0.1.0" as const;
export const NORMALIZATION_RULESET_VERSION = "0.2.0" as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [field: string]: JsonValue };

export type CanonicalSpecies = "dog" | "cat";

export type CanonicalAgeGroup =
  | "neonate"
  | "weaned"
  | "juvenile"
  | "adult"
  | "senior";

export type CanonicalSex = "male" | "female" | "unknown";

export type CanonicalAlteredStatus = "altered" | "unaltered" | "unknown";

export type CanonicalIntakeType =
  | "stray"
  | "relinquished_by_owner"
  | "seizure_or_confiscate"
  | "transfer_in"
  | "other";

export type RequiredIntakeField =
  | "animalId"
  | "intakeDate"
  | "intakeType"
  | "intakeReasonText"
  | "species"
  | "ageGroup"
  | "sex"
  | "alteredStatus";

export interface NormalizationAliases {
  species?: Record<string, CanonicalSpecies>;
  intakeType?: Record<string, CanonicalIntakeType>;
  ageGroup?: Record<string, CanonicalAgeGroup>;
  sex?: Record<string, CanonicalSex>;
  alteredStatus?: Record<string, CanonicalAlteredStatus>;
}

export interface NormalizationProfile {
  id: string;
  revision: string;
  aliases?: NormalizationAliases;
  requiredFields?: RequiredIntakeField[];
}

export type IntakeDraft = {
  ageGroup?: JsonValue;
  animalId?: JsonValue;
  alteredStatus?: JsonValue;
  intakeDate?: JsonValue;
  intakeReasonText?: JsonValue;
  sex?: JsonValue;
  species?: JsonValue;
  intakeType?: JsonValue;
} & { [field: string]: JsonValue | undefined };

export interface IntakeChange {
  field: string;
  from: unknown;
  to: unknown;
  ruleId: string;
}

export interface IntakeIssue {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

export interface NormalizedIntakeRecord {
  ageGroup?: CanonicalAgeGroup;
  animalId?: string;
  alteredStatus?: CanonicalAlteredStatus;
  intakeDate?: string;
  intakeReasonText?: string;
  sex?: CanonicalSex;
  species?: CanonicalSpecies;
  intakeType?: CanonicalIntakeType;
}

export interface NormalizationProvenance {
  rulesetVersion: string;
  profile: {
    id: string;
    revision: string;
    digest: string;
  } | null;
}

export interface NormalizationResult {
  schemaVersion: typeof INTAKE_SCHEMA_VERSION;
  provenance: NormalizationProvenance;
  rawRecord: IntakeDraft;
  normalizedRecord: NormalizedIntakeRecord;
  changes: IntakeChange[];
  warnings: IntakeIssue[];
  errors: IntakeIssue[];
  needsReview: boolean;
}

export interface RawFreeNormalizationResult {
  schemaVersion: typeof INTAKE_SCHEMA_VERSION;
  provenance: NormalizationProvenance;
  normalizedRecord: NormalizedIntakeRecord;
  changes: Array<Omit<IntakeChange, "from">>;
  warnings: Array<Omit<IntakeIssue, "value">>;
  errors: Array<Omit<IntakeIssue, "value">>;
  needsReview: boolean;
}

interface ControlledValue<T> {
  value: T;
  ruleId: string;
}

const SPECIES: Record<string, ControlledValue<CanonicalSpecies>> = {
  dog: { value: "dog", ruleId: "species.canonical.dog" },
  canine: { value: "dog", ruleId: "species.alias.canine" },
  cat: { value: "cat", ruleId: "species.canonical.cat" },
  feline: { value: "cat", ruleId: "species.alias.feline" },
};

const AGE_GROUPS: Record<string, ControlledValue<CanonicalAgeGroup>> = {
  neonate: { value: "neonate", ruleId: "age-group.canonical.neonate" },
  weaned: { value: "weaned", ruleId: "age-group.canonical.weaned" },
  juvenile: { value: "juvenile", ruleId: "age-group.canonical.juvenile" },
  adult: { value: "adult", ruleId: "age-group.canonical.adult" },
  senior: { value: "senior", ruleId: "age-group.canonical.senior" },
};

const SEXES: Record<string, ControlledValue<CanonicalSex>> = {
  male: { value: "male", ruleId: "sex.canonical.male" },
  m: { value: "male", ruleId: "sex.alias.m" },
  female: { value: "female", ruleId: "sex.canonical.female" },
  f: { value: "female", ruleId: "sex.alias.f" },
  unknown: { value: "unknown", ruleId: "sex.canonical.unknown" },
  u: { value: "unknown", ruleId: "sex.alias.u" },
};

const ALTERED_STATUSES: Record<string, ControlledValue<CanonicalAlteredStatus>> = {
  altered: { value: "altered", ruleId: "altered-status.canonical.altered" },
  spayed: { value: "altered", ruleId: "altered-status.alias.spayed" },
  neutered: { value: "altered", ruleId: "altered-status.alias.neutered" },
  unaltered: { value: "unaltered", ruleId: "altered-status.canonical.unaltered" },
  intact: { value: "unaltered", ruleId: "altered-status.alias.intact" },
  unknown: { value: "unknown", ruleId: "altered-status.canonical.unknown" },
};

const INTAKE_TYPES: Record<string, ControlledValue<CanonicalIntakeType>> = {
  stray: { value: "stray", ruleId: "intake-type.canonical.stray" },
  "relinquished by owner": {
    value: "relinquished_by_owner",
    ruleId: "intake-type.canonical.relinquished-by-owner",
  },
  "owner surrender": {
    value: "relinquished_by_owner",
    ruleId: "intake-type.alias.owner-surrender",
  },
  "seizure confiscate": {
    value: "seizure_or_confiscate",
    ruleId: "intake-type.canonical.seizure-confiscate",
  },
  "seizure or confiscate": {
    value: "seizure_or_confiscate",
    ruleId: "intake-type.canonical.seizure-or-confiscate",
  },
  "transfer in": {
    value: "transfer_in",
    ruleId: "intake-type.canonical.transfer-in",
  },
  "other intakes": {
    value: "other",
    ruleId: "intake-type.canonical.other-intakes",
  },
  other: {
    value: "other",
    ruleId: "intake-type.canonical.other",
  },
};

function lookupKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[_/-]+/g, " ")
    .replaceAll(/\s+/g, " ");
}

function lookup<T>(
  input: unknown,
  values: Record<string, ControlledValue<T>>,
): ControlledValue<T> | undefined {
  if (typeof input !== "string") return undefined;
  return values[lookupKey(input)];
}

function isValidIsoDate(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const parsed = new Date(`${input}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(input);
}

function withProfileAliases<T>(
  values: Record<string, ControlledValue<T>>,
  aliases: Record<string, T> | undefined,
  profileId: string | undefined,
  field: string,
): Record<string, ControlledValue<T>> {
  if (!aliases || !profileId) return values;

  const merged = { ...values };
  const profileSlug = profileId.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  for (const [alias, value] of Object.entries(aliases)) {
    const key = lookupKey(alias);
    if (merged[key]) continue;
    const aliasSlug = key.replaceAll(" ", "-");
    merged[key] = {
      value,
      ruleId: `profile.${profileSlug}.${field}.${aliasSlug}`,
    };
  }
  return merged;
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function profileProvenance(
  profile: NormalizationProfile | undefined,
): NormalizationProvenance["profile"] {
  if (!profile) return null;
  if (!profile.id || profile.id.trim() !== profile.id) {
    throw new Error("Normalization profile id must be a non-empty, trimmed string.");
  }
  if (!profile.revision || profile.revision.trim() !== profile.revision) {
    throw new Error("Normalization profile revision must be a non-empty, trimmed string.");
  }
  for (const [field, aliases] of Object.entries(profile.aliases ?? {})) {
    if (!aliases) continue;
    const canonicalAliases = new Set<string>();
    for (const alias of Object.keys(aliases)) {
      const canonicalAlias = lookupKey(alias);
      if (canonicalAliases.has(canonicalAlias)) {
        throw new Error(
          `Normalization profile aliases collide after canonicalization: ${field}.${canonicalAlias}`,
        );
      }
      canonicalAliases.add(canonicalAlias);
    }
  }

  const definition = {
    id: profile.id,
    revision: profile.revision,
    aliases: profile.aliases ?? null,
    requiredFields: profile.requiredFields ?? [],
  } as unknown as JsonValue;
  const digest = createHash("sha256")
    .update(canonicalJson(definition))
    .digest("hex");

  return {
    id: profile.id,
    revision: profile.revision,
    digest: `sha256:${digest}`,
  };
}

const FIELD_LABELS: Record<RequiredIntakeField, string> = {
  animalId: "Animal ID",
  intakeDate: "Intake date",
  intakeType: "Intake type",
  intakeReasonText: "Intake reason text",
  species: "Species",
  ageGroup: "Age group",
  sex: "Sex",
  alteredStatus: "Altered status",
};

export function normalizeIntake(
  draft: IntakeDraft | NormalizedIntakeRecord,
  profile?: NormalizationProfile,
): NormalizationResult {
  const appliedProfile = profileProvenance(profile);
  const rawRecord = structuredClone(draft) as IntakeDraft;
  const normalizedRecord: NormalizedIntakeRecord = {};
  const changes: IntakeChange[] = [];
  const warnings: IntakeIssue[] = [];
  const errors: IntakeIssue[] = [];

  const applyControlled = <T>(
    field: string,
    label: string,
    input: unknown,
    values: Record<string, ControlledValue<T>>,
    apply: (value: T) => void,
  ) => {
    const match = lookup(input, values);
    if (match) {
      apply(match.value);
      if (input !== match.value) {
        changes.push({
          field,
          from: input,
          to: match.value,
          ruleId: match.ruleId,
        });
      }
    } else if (input !== undefined) {
      warnings.push({
        field,
        code: "unrecognized_value",
        message: `${label} is not in the supported vocabulary.`,
        value: input,
      });
    }
  };

  applyControlled(
    "species",
    "Species",
    draft.species,
    withProfileAliases(
      SPECIES,
      profile?.aliases?.species,
      profile?.id,
      "species",
    ),
    (value) => {
      normalizedRecord.species = value;
    },
  );
  applyControlled(
    "intakeType",
    "Intake type",
    draft.intakeType,
    withProfileAliases(
      INTAKE_TYPES,
      profile?.aliases?.intakeType,
      profile?.id,
      "intake-type",
    ),
    (value) => {
      normalizedRecord.intakeType = value;
    },
  );
  applyControlled(
    "ageGroup",
    "Age group",
    draft.ageGroup,
    withProfileAliases(
      AGE_GROUPS,
      profile?.aliases?.ageGroup,
      profile?.id,
      "age-group",
    ),
    (value) => {
      normalizedRecord.ageGroup = value;
    },
  );
  applyControlled(
    "sex",
    "Sex",
    draft.sex,
    withProfileAliases(SEXES, profile?.aliases?.sex, profile?.id, "sex"),
    (value) => {
      normalizedRecord.sex = value;
    },
  );
  applyControlled(
    "alteredStatus",
    "Altered status",
    draft.alteredStatus,
    withProfileAliases(
      ALTERED_STATUSES,
      profile?.aliases?.alteredStatus,
      profile?.id,
      "altered-status",
    ),
    (value) => {
      normalizedRecord.alteredStatus = value;
    },
  );

  const applyText = (
    field: string,
    label: string,
    input: unknown,
    apply: (value: string) => void,
  ) => {
    if (input === undefined) return;
    if (typeof input !== "string") {
      warnings.push({
        field,
        code: "invalid_type",
        message: `${label} must be a string.`,
        value: input,
      });
      return;
    }
    const trimmed = input.trim();
    apply(trimmed);
    if (input !== trimmed) {
      changes.push({
        field,
        from: input,
        to: trimmed,
        ruleId: "text.trim",
      });
    }
  };

  applyText("animalId", "Animal ID", draft.animalId, (value) => {
    normalizedRecord.animalId = value;
  });
  applyText(
    "intakeReasonText",
    "Intake reason text",
    draft.intakeReasonText,
    (value) => {
      normalizedRecord.intakeReasonText = value;
    },
  );

  if (draft.intakeDate !== undefined) {
    const input = draft.intakeDate;
    let normalizedDate: string | undefined;
    let ruleId = "date.iso";

    if (typeof input === "string" && isValidIsoDate(input)) {
      normalizedDate = input;
    } else if (
      typeof input === "string"
      && isValidIsoDate(input.slice(0, 10))
      && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(input)
    ) {
      const parsed = new Date(input);
      if (Number.isFinite(parsed.getTime())) {
        normalizedDate = parsed.toISOString();
        ruleId = "date.rfc3339-to-utc";
      }
    }

    if (normalizedDate) {
      normalizedRecord.intakeDate = normalizedDate;
      if (input !== normalizedDate) {
        changes.push({
          field: "intakeDate",
          from: input,
          to: normalizedDate,
          ruleId,
        });
      }
    } else {
      warnings.push({
        field: "intakeDate",
        code: "invalid_date",
        message:
          "Intake date must be an ISO date or supported RFC 3339 timestamp with seconds 00 through 59.",
        value: input,
      });
    }
  }

  for (const field of new Set(profile?.requiredFields ?? [])) {
    const value = normalizedRecord[field];
    if (value !== undefined && value !== "") continue;
    errors.push({
      field,
      code: "required",
      message: `${FIELD_LABELS[field]} is required by profile ${profile?.id}.`,
    });
  }

  return structuredClone({
    schemaVersion: INTAKE_SCHEMA_VERSION,
    provenance: {
      rulesetVersion: NORMALIZATION_RULESET_VERSION,
      profile: appliedProfile,
    },
    rawRecord,
    normalizedRecord,
    changes,
    warnings,
    errors,
    needsReview: warnings.length > 0 || errors.length > 0,
  });
}

export function toRawFreeProjection(
  result: NormalizationResult,
): RawFreeNormalizationResult {
  return structuredClone({
    schemaVersion: result.schemaVersion,
    provenance: result.provenance,
    normalizedRecord: result.normalizedRecord,
    changes: result.changes.map(({ field, to, ruleId }) => ({
      field,
      to,
      ruleId,
    })),
    warnings: result.warnings.map(({ field, code, message }) => ({
      field,
      code,
      message,
    })),
    errors: result.errors.map(({ field, code, message }) => ({
      field,
      code,
      message,
    })),
    needsReview: result.needsReview,
  });
}
