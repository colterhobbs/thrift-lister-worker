import type { WorkerEnv } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  env: WorkerEnv,
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  if (!env.BUILT_IN_FORGE_API_URL) throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  if (!env.BUILT_IN_FORGE_API_KEY) throw new Error("BUILT_IN_FORGE_API_KEY is not configured");

  const baseUrl = env.BUILT_IN_FORGE_API_URL.endsWith("/") ? env.BUILT_IN_FORGE_API_URL : `${env.BUILT_IN_FORGE_API_URL}/`;
  const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${env.BUILT_IN_FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      apiId,
      query: options.query,
      body: options.body,
      path_params: options.pathParams,
      multipart_form_data: options.formData,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`);
  }

  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === "object" && "jsonData" in payload) {
    try {
      return JSON.parse((payload as Record<string, string>).jsonData ?? "{}");
    } catch {
      return (payload as Record<string, unknown>).jsonData;
    }
  }
  return payload;
}
