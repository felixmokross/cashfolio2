import { program } from "commander";
import { prisma } from "cashfolio-app/app/prisma.server";
import { MongoClient } from "mongodb";

program
  .name("importer")
  .action(async () => {
    console.log(`Importing data…`);

    console.log(process.env.DATABASE_URL);

    const sourceDbClient = await MongoClient.connect(
      process.env.SOURCE_DATABASE_URI!,
    );
    const sourceDb = sourceDbClient.db();
    console.log(`connected to DB ${sourceDb.databaseName}`);

    console.log(sourceDb.collection("accounts").find().toArray());

    console.log((await prisma.account.findMany()).map((a) => a.name));
  })
  .parse();
