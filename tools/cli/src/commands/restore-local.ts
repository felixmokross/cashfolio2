import { program } from "commander";
import { exec } from "../shared";
import { createClient } from "redis";

program.command("restore-local").action(async () => {
  console.log("Restoring local database from backup…");

  await exec(
    `pg_restore --clean --no-owner --no-privileges -d "${process.env.RESTORE_DB_URL}" ./backup.dump`,
  );

  console.log("Purging local Redis…");

  const redis = createClient({ url: process.env.RESTORE_REDIS_URL });
  await redis.connect();
  await redis.flushAll();
  await redis.close();

  console.log("Done");
});
