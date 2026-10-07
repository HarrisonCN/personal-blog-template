import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./server/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env (documented in README / .env.example) without an extra dependency.
// Real environment variables always win over values in the file.
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    console.warn(`[studio] Could not read .env: ${error.message}`);
  }
}

const PORT = Number(process.env.PORT || 8787);
const app = createApp();

app.locals.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Template server running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("[studio] Failed to start:", error);
    process.exit(1);
  });
