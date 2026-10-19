import { execSync } from "node:child_process";

export default function globalSetup() {
  // Reset the local D1 database so cloud-mode tests start from a clean slate.
  execSync("npx wrangler d1 migrations apply glasstask-db --local", { stdio: "inherit" });
  execSync('npx wrangler d1 execute glasstask-db --local --command "DELETE FROM tasks; DELETE FROM sessions;"', {
    stdio: "inherit",
  });
}
