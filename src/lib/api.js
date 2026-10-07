// Fetch wrapper for the Node studio API.
// Extracted from App.jsx.

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error || "request_failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
