import * as child_process from "child_process";
import { promisify } from "util";
import { program } from "commander";
import "dotenv/config";
import { createClient } from "redis";

const exec = promisify(child_process.exec);

program.name("cli");

program.command("backup-prod").action(async () => {
  console.log("Backing up production database…");

  await exec(`pg_dump -Fc -d "${process.env.BACKUP_DB_URL}" -f ./backup.dump`);

  console.log("Done");
});

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

program.command("proxy-redis-staging").action(async () => {
  console.log("Proxying to cashfolio-redis-staging…");

  await exec(`fly proxy 6382:6379 --app cashfolio-redis-staging`);
});

program.parse();
