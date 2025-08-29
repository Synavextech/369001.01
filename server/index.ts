if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_PROD_TEST === 'true') {
  const dotenv = await import('dotenv');
  dotenv.config({ quiet: true });
}
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import path from 'path';
import { fileURLToPath } from 'node:url';
// Polyfill for __dirname in ESM (if needed for paths)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
(async () => {
  let log = console.log;  // Default to console.log (prod-safe, no 'vite' needed)
  
  // Create the HTTP server first
  const server = await registerRoutes(app);
  
  // Serve static files and handle client-side routing after API routes
  if (process.env.NODE_ENV === "development") {
    // Dev: Dynamically import vite.ts for setupVite and log (avoids prod bundling)
    const viteModule = await import("./vite");
    log = viteModule.log;  // Override log with vite's version in dev
    const { setupVite } = viteModule;
    await setupVite(app, server);
  } else {
    // Prod: Serve static files from Vite build (dist/)
    // If serveStatic is custom in ./vite, import and use it here; otherwise use express.static
    try {
      const { serveStatic } = await import("./vite");  // Dynamic for prod if custom
      serveStatic(app);
    } catch {
      // Fallback to standard if serveStatic not available
      app.use(express.static(path.join(__dirname, '../dist')));
    }
    // Only serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  // Now define the logging middleware after log is set
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        log(logLine);
      }
    });
    next();
  });
  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);  // Exit with failure code
  });
  // Use PORT from environment variable or default to 5000
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(
    {
      port,
      host: "127.0.0.1",
    },
    () => {
      log(`serving on http://127.0.0.1:${port}`);
    },
  );
})();