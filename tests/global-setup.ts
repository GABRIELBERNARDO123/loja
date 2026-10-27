import { spawnSync } from "node:child_process";
import { config } from "dotenv";

export default function globalSetup() {
  config({ path: ".env.test", override: true });
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(`Falha ao aplicar migrations no banco de teste.\n${result.stdout}\n${result.stderr}`);
  }
}
