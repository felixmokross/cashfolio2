import { program } from "commander";
import { exec } from "../shared";

program.command("backup-prod").action(async () => {
  console.log("Backing up production database…");

  await exec(`pg_dump -Fc -d "${process.env.BACKUP_DB_URL}" -f ./backup.dump`);

  console.log("Done");
});
