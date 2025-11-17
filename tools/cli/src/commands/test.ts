import { program } from "commander";
import { exec } from "../shared";
import { spawn } from "child_process";

program.command("test").action(async () => {
  const testDatabaseUrl =
    "postgresql://postgres:postgres@localhost:5433/cashfolio?schema=public";

  console.log("Setting up test database and Redis…");
  await exec(`docker compose -f ../../test.docker-compose.yml up --build -d`);

  console.log("Migrating test database…");
  await exec(
    `DATABASE_URL='${testDatabaseUrl}' pnpm --filter cashfolio-app exec prisma migrate deploy`,
  );

  console.log("Running tests…");
  const testProcess = spawn("pnpm --filter cashfolio-app test", {
    stdio: "inherit",
    shell: true,
  });

  process.on("SIGINT", () => {
    testProcess.kill("SIGINT");
  });
});
