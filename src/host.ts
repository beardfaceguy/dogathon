export function configuredHost(
  value: string | undefined,
  variableName: string,
): string {
  if (value === undefined) return "localhost";
  if (!value || value.trim() !== value) {
    throw new Error(
      `${variableName} must be a non-empty, trimmed hostname.`,
    );
  }
  return value;
}
