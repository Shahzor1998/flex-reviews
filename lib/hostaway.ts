import fs from "fs/promises";
import path from "path";
import { NormalizedReview, normalizeHostaway } from "./normalize";

type HostawayPayload = {
  status?: string;
  result?: unknown[];
};

const HOSTAWAY_BASE_URL =
  process.env.HOSTAWAY_BASE_URL?.replace(/\/$/, "") ??
  "https://api.hostaway.com/v1";

export async function loadMockHostawayPayload(): Promise<HostawayPayload> {
  const rawPath = path.join(
    process.cwd(),
    "data",
    "hostaway_mock_reviews.json",
  );
  const contents = await fs.readFile(rawPath, "utf-8");
  return JSON.parse(contents) as HostawayPayload;
}

export async function fetchHostawayPayloadFromApi(): Promise<HostawayPayload> {
  const accountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const apiKey = process.env.HOSTAWAY_API_KEY;

  if (!accountId || !apiKey) {
    throw new Error("Hostaway credentials are not configured.");
  }

  const url = `${HOSTAWAY_BASE_URL}/reviews?accountId=${accountId}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Hostaway API request failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  return (await response.json()) as HostawayPayload;
}

export async function normalizeFromSource(
  source: "api" | "mock",
): Promise<{
  reviews: NormalizedReview[];
  source: "api" | "mock";
}> {
  if (source === "api") {
    const payload = await fetchHostawayPayloadFromApi();
    return {
      reviews: normalizeHostaway(payload),
      source,
    };
  }

  const payload = await loadMockHostawayPayload();
  return {
    reviews: normalizeHostaway(payload),
    source: "mock",
  };
}

