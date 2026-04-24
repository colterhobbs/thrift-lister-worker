import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../../drizzle/schema";
import type { WorkerEnv } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: Request;
  env: WorkerEnv;
  user: User | null;
  // For setting response headers (cookies)
  responseHeaders: Headers;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
  env: WorkerEnv,
  responseHeaders: Headers
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(env, opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    env,
    user,
    responseHeaders,
  };
}
