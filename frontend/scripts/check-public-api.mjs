import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false);

const allowMissing = process.env.ALLOW_MISSING_PUBLIC_API === "true";
const apiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

if (!allowMissing) {
  for (const path of ["/settings/navigation", "/home-page"]) {
    const url = `${apiBaseUrl}${path}`;
    let response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw new Error(
        `Required public API check failed: could not reach ${url}. Set API_BASE_URL in .env.production and verify the Laravel API is available.`,
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new Error(`Required public API check failed: ${url} returned ${response.status}.`);
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload)) {
      throw new Error(`Required public API check failed: ${url} returned an invalid envelope.`);
    }
  }

  console.log("Required public API checks passed.");
}
