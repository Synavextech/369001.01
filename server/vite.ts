import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

// Only import vite in development
let createViteServer: typeof import('vite').createServer | undefined;
let createLogger: typeof import('vite').createLogger | undefined;
let viteConfig: any;
let nanoid: typeof import('nanoid').nanoid | undefined;

if (process.env.NODE_ENV === "development") {
  ({ createServer: createViteServer, createLogger } = await import("vite"));
  viteConfig = (await import("../vite.config")).default;
  ({ nanoid } = await import("nanoid"));
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Only run in development
  if (process.env.NODE_ENV !== "development" || !createViteServer || !createLogger || !viteConfig || !nanoid) {
    return;
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, serve from dist directory
  const distPath = path.resolve(import.meta.dirname, '../dist');

  if (process.env.NODE_ENV !== "development") {
    if (!fs.existsSync(distPath)) {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }

    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    // In development, serve from client/public
    const publicPath = path.resolve(import.meta.dirname, "..", "client", "public");
    
    if (!fs.existsSync(publicPath)) {
      throw new Error(
        `Could not find the public directory: ${publicPath}`,
      );
    }

    app.use(express.static(publicPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(publicPath, "index.html"));
    });
  }
}
