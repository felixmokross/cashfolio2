import { program } from "commander";
import { prisma } from "cashfolio-app/app/prisma.server";
import {
  AccountGroup,
  Account,
  AccountType,
} from "cashfolio-app/node_modules/@prisma/client";
import { MongoClient } from "mongodb";
import "dotenv/config";
import slugify from "slugify";
import { createId } from "@paralleldrive/cuid2";

program
  .name("importer")
  .action(async () => {
    console.log(`Importing data…`);

    const sourceDbClient = await MongoClient.connect(
      process.env.SOURCE_DATABASE_URI!,
    );
    try {
      // clear existing data in target DB
      await prisma.transaction.deleteMany();
      await prisma.account.deleteMany();
      await prisma.accountGroup.deleteMany();

      const assetsGroup = await prisma.accountGroup.create({
        data: { name: "Assets", slug: "assets", type: AccountType.ASSET },
      });

      const liabilitiesGroup = await prisma.accountGroup.create({
        data: {
          name: "Liabilities",
          slug: "liabilities",
          type: AccountType.LIABILITY,
        },
      });

      const sourceDb = sourceDbClient.db();
      console.log(`connected to DB ${sourceDb.databaseName}`);

      const accountGroupsBySourceAccountCategoryId = Object.fromEntries(
        (await sourceDb.collection("accountCategories").find().toArray()).map(
          (sac) => [
            sac._id.toString(),
            sourceAccountCategoryToTargetAccountGroup(sac),
          ],
        ),
      );

      console.log(
        `Creating ${Object.values(accountGroupsBySourceAccountCategoryId).length} account groups…`,
      );
      await prisma.accountGroup.createMany({
        data: Object.values(accountGroupsBySourceAccountCategoryId),
      });

      const accounts = (
        await sourceDb.collection("accounts").find().toArray()
      ).map(sourceAccountToTargetAccount);
      console.log(`Creating ${accounts.length} accounts…`);
      await prisma.account.createMany({
        data: accounts,
      });

      function sourceAccountCategoryToTargetAccountGroup(
        category: any,
      ): Omit<AccountGroup, "createdAt" | "updatedAt"> {
        return {
          id: createId(),
          name: category.name,
          slug: slugify(category.name, { lower: true }),
          type:
            category.type === "ASSET"
              ? AccountType.ASSET
              : AccountType.LIABILITY,
          parentGroupId:
            category.type === "ASSET" ? assetsGroup.id : liabilitiesGroup.id,
        };
      }

      function sourceAccountToTargetAccount(
        sourceAccount: any,
      ): Omit<Account, "createdAt" | "updatedAt"> {
        const id = createId();
        return {
          id,
          name: sourceAccount.name,
          slug: slugify(sourceAccount.name, { lower: true }) + `-${id}`,
          type:
            sourceAccount.categoryType === "ASSET"
              ? AccountType.ASSET
              : AccountType.LIABILITY,
          groupId:
            accountGroupsBySourceAccountCategoryId[
              sourceAccount.categoryId.toString()
            ].id,
          currency:
            sourceAccount.unit.kind === "CURRENCY"
              ? sourceAccount.unit.currency
              : null,
          unit:
            sourceAccount.unit.kind === "CURRENCY" ? "CURRENCY" : "SECURITY",
        };
      }
    } finally {
      sourceDbClient.close();
    }
  })
  .parse();
