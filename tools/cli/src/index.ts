import * as child_process from "child_process";
import { promisify } from "util";
import { program } from "commander";
import "dotenv/config";

const exec = promisify(child_process.exec);

program.name("cli");

program.command("backup-prod").action(async () => {
  console.log("Backing up production database…");

  await exec(
    `pg_dump -Fc --no-owner --no-privileges -d "${process.env.BACKUP_DB_URL}" -f ./backup.dump`,
  );

  console.log("Done");
});

program.command("restore-local").action(async () => {
  console.log("Restoring local database from backup…");

  await exec(
    `pg_restore --clean --no-owner -d "${process.env.RESTORE_DB_URL}" ./backup.dump`,
  );

  console.log("Done");
});

program.parse();
