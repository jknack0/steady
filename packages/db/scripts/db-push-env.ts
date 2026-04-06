import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: tsx scripts/db-push-env.ts <dev|prod>");
  process.exit(1);
}

const envPath = resolve(__dirname, `../.env.${target}`);
const envContent = readFileSync(envPath, "utf-8");

const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

execSync("prisma db push", {
  stdio: "inherit",
  cwd: resolve(__dirname, ".."),
  env: { ...process.env, ...env },
});
