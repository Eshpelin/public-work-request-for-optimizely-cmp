import { createServer } from "http";
import { parse } from "url";
import next from "next";
import cron from "node-cron";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const INTERNAL_SECRET = process.env.JWT_SECRET;

async function callInternalEndpoint(path: string): Promise<void> {
  try {
    const response = await fetch(`http://localhost:${port}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INTERNAL_SECRET}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Internal endpoint ${path} failed. Status ${response.status}. ${text}`);
    } else {
      const data = await response.json();
      console.log(`Internal endpoint ${path} completed.`, data);
    }
  } catch (error) {
    console.error(`Failed to call internal endpoint ${path}.`, error);
  }
}

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);

    // Retry failed submissions every 2 minutes
    cron.schedule("*/2 * * * *", () => {
      console.log("[cron] Running submission retry job...");
      callInternalEndpoint("/api/v1/internal/retry-submissions");
    });

    // Cleanup expired URLs and old audit logs every 24 hours (at 3 AM)
    cron.schedule("0 3 * * *", () => {
      console.log("[cron] Running cleanup job...");
      callInternalEndpoint("/api/v1/internal/cleanup");
    });

    console.log("[cron] Background jobs scheduled.");
  });
});
