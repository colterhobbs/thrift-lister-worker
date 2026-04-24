import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { exchangeCodeForToken, upsertEbayToken } from "../ebay";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // eBay OAuth callback — must be under /api/ so the Manus gateway routes it to Express
  app.get("/api/ebay/callback", async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    if (!code) {
      return res.redirect("/listings?ebay_error=no_code");
    }
    try {
      // Decode userId from state
      let userId: number | null = null;
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());
        userId = decoded.userId;
      } catch {}

      if (!userId) {
        return res.redirect("/listings?ebay_error=invalid_state");
      }

      const tokens = await exchangeCodeForToken(code);
      await upsertEbayToken(
        userId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.accessTokenExpiresAt,
        tokens.refreshTokenExpiresAt,
      );
      return res.redirect("/listings?ebay_connected=1");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[eBay OAuth] Callback error:", msg);
      const encoded = encodeURIComponent(msg.slice(0, 300));
      return res.redirect(`/listings?ebay_error=${encoded}`);
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
