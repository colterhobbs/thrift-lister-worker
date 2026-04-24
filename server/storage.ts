import type { WorkerEnv } from "./_core/env";

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  env: WorkerEnv,
  relKey: string,
  data: Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!env.BUILT_IN_FORGE_API_URL || !env.BUILT_IN_FORGE_API_KEY) {
    throw new Error("Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
  }

  const key = normalizeKey(relKey);
  const baseUrl = env.BUILT_IN_FORGE_API_URL.replace(/\/+$/, "");
  const uploadUrl = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  uploadUrl.searchParams.set("path", key);

  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([data], { type: contentType });

  const formData = new FormData();
  formData.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(env.BUILT_IN_FORGE_API_KEY),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status} ${response.statusText}): ${message}`);
  }

  const result = await response.json() as { url: string };
  return { key, url: result.url };
}

export async function storageGet(env: WorkerEnv, relKey: string): Promise<{ key: string; url: string }> {
  if (!env.BUILT_IN_FORGE_API_URL || !env.BUILT_IN_FORGE_API_KEY) {
    throw new Error("Storage proxy credentials missing");
  }

  const key = normalizeKey(relKey);
  const baseUrl = env.BUILT_IN_FORGE_API_URL.replace(/\/+$/, "");
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", key);

  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(env.BUILT_IN_FORGE_API_KEY),
  });

  const result = await response.json() as { url: string };
  return { key, url: result.url };
}
