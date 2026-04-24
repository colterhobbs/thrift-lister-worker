// Worker environment bindings — injected by Cloudflare at runtime.
// This type is used throughout the app instead of process.env.
export type WorkerEnv = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OWNER_OPEN_ID: string;
  BUILT_IN_FORGE_API_URL: string;
  BUILT_IN_FORGE_API_KEY: string;
  EBAY_CLIENT_ID: string;
  EBAY_CLIENT_SECRET: string;
  EBAY_DEV_ID: string;
  EBAY_REDIRECT_URI: string;
  ETSY_API_KEY: string;
  ETSY_SHARED_SECRET: string;
  NODE_ENV?: string;
};
