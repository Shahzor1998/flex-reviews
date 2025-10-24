export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function safeJsonRecord(
  input: unknown,
): Record<string, number | null> | null {
  if (!input || typeof input !== "object") return null;
  const record: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "number") {
      record[key] = value;
    } else if (value === null) {
      record[key] = null;
    } else if (typeof value === "string") {
      const parsed = Number(value);
      record[key] = Number.isFinite(parsed) ? parsed : null;
    }
  }
  return Object.keys(record).length ? record : null;
}

