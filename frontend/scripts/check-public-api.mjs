const allowMissing = process.env.ALLOW_MISSING_PUBLIC_API === "true";
const apiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

if (!allowMissing) {
  for (const path of ["/settings/navigation", "/home-page"]) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Required public API check failed: ${path} returned ${response.status}.`);
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload)) {
      throw new Error(`Required public API check failed: ${path} returned an invalid envelope.`);
    }
  }

  console.log("Required public API checks passed.");
}
