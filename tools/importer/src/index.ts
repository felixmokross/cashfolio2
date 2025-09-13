import { program } from "commander";
import { prisma } from "cashfolio-app/app/prisma.server";
import * as TargetModel from "cashfolio-app/node_modules/@prisma/client";
import { MongoClient } from "mongodb";
import "dotenv/config";
import slugify from "slugify";
import { createId } from "@paralleldrive/cuid2";
import * as SourceModel from "./source-model";

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
        data: {
          name: "Assets",
          slug: "assets",
          type: TargetModel.AccountType.ASSET,
        },
      });

      const liabilitiesGroup = await prisma.accountGroup.create({
        data: {
          name: "Liabilities",
          slug: "liabilities",
          type: TargetModel.AccountType.LIABILITY,
        },
      });

      const equityGroup = await prisma.accountGroup.create({
        data: {
          name: "Equity",
          slug: "equity",
          type: TargetModel.AccountType.EQUITY,
        },
      });

      const expensesGroup = await prisma.accountGroup.create({
        data: {
          name: "Expenses",
          slug: "expenses",
          type: TargetModel.AccountType.EQUITY,
          parentGroupId: equityGroup.id,
        },
      });

      const incomeGroup = await prisma.accountGroup.create({
        data: {
          name: "Income",
          slug: "income",
          type: TargetModel.AccountType.EQUITY,
          parentGroupId: equityGroup.id,
        },
      });

      const investmentGainLossAccount = await prisma.account.create({
        data: {
          name: "Investment Gain/Loss",
          slug: "investment-gain-loss",
          type: TargetModel.AccountType.EQUITY,
          groupId: equityGroup.id,
          unit: TargetModel.AccountUnit.CURRENCY,
        },
      });

      const sourceDb = sourceDbClient.db();
      console.log(`connected to DB ${sourceDb.databaseName}`);

      const accountGroupsBySourceAccountCategoryId = Object.fromEntries(
        (
          await sourceDb
            .collection<SourceModel.AccountCategory>("accountCategories")
            .find()
            .toArray()
        ).map((sac) => [
          sac._id.toString(),
          sourceAccountCategoryToTargetAccountGroup(sac),
        ]),
      );

      console.log(
        `Creating ${Object.values(accountGroupsBySourceAccountCategoryId).length} account groups…`,
      );
      await prisma.accountGroup.createMany({
        data: Object.values(accountGroupsBySourceAccountCategoryId),
      });

      const accountsBySourceAccountId = Object.fromEntries(
        (
          await sourceDb
            .collection<SourceModel.Account>("accounts")
            .find()
            .toArray()
        ).map((a) => [a._id.toString(), sourceAccountToTargetAccount(a)]),
      );

      const accountsBySourceExpenseCategoryId = Object.fromEntries(
        (
          await sourceDb
            .collection<SourceModel.ExpenseCategory>("expenseCategories")
            .find()
            .toArray()
        ).map((ec) => [
          ec._id.toString(),
          sourceIncomeExpenseCategoryToTargetAccount(
            ec,
            SourceModel.BookingType.EXPENSE,
          ),
        ]),
      );

      const accountsBySourceIncomeCategoryId = Object.fromEntries(
        (
          await sourceDb
            .collection<SourceModel.IncomeCategory>("incomeCategories")
            .find()
            .toArray()
        ).map((ec) => [
          ec._id.toString(),
          sourceIncomeExpenseCategoryToTargetAccount(
            ec,
            SourceModel.BookingType.INCOME,
          ),
        ]),
      );

      const accounts = [
        ...Object.values(accountsBySourceAccountId),
        ...Object.values(accountsBySourceExpenseCategoryId),
        ...Object.values(accountsBySourceIncomeCategoryId),
      ];

      console.log(`Creating ${accounts.length} accounts…`);
      await prisma.account.createMany({
        data: accounts,
      });

      const transactions = (
        await sourceDb
          .collection<SourceModel.Transaction>("transactions")
          .find()
          .toArray()
      ).map(sourceTransactionToTargetTransaction);
      console.log(`Creating ${transactions.length} transactions…`);
      for (let i = 0; i < transactions.length; i++) {
        await prisma.transaction.create({
          data: transactions[i],
        });

        if ((i + 1) % 1000 === 0) {
          console.log(`  created ${i + 1} transactions`);
        }
      }

      console.log("Done");

      function sourceAccountCategoryToTargetAccountGroup(
        sourceAccountCategory: SourceModel.AccountCategory,
      ): Omit<TargetModel.AccountGroup, "createdAt" | "updatedAt"> {
        const id = createId();
        return {
          id,
          name: sourceAccountCategory.name,
          slug: slugify(sourceAccountCategory.name, { lower: true }) + `-${id}`,
          type:
            sourceAccountCategory.type === "ASSET"
              ? TargetModel.AccountType.ASSET
              : TargetModel.AccountType.LIABILITY,
          parentGroupId:
            sourceAccountCategory.type === "ASSET"
              ? assetsGroup.id
              : liabilitiesGroup.id,
        };
      }

      function sourceAccountToTargetAccount(
        sourceAccount: SourceModel.Account,
      ): Omit<TargetModel.Account, "createdAt" | "updatedAt"> {
        const id = createId();
        return {
          id,
          name: sourceAccount.name,
          slug: slugify(sourceAccount.name, { lower: true }) + `-${id}`,
          type:
            sourceAccount.categoryType === "ASSET"
              ? TargetModel.AccountType.ASSET
              : TargetModel.AccountType.LIABILITY,
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

      function sourceIncomeExpenseCategoryToTargetAccount(
        sourceIncomeExpenseCategory: SourceModel.ExpenseCategory,
        type: SourceModel.BookingType.INCOME | SourceModel.BookingType.EXPENSE,
      ): Omit<TargetModel.Account, "createdAt" | "updatedAt"> {
        const id = createId();
        return {
          id,
          name: sourceIncomeExpenseCategory.name,
          slug:
            slugify(sourceIncomeExpenseCategory.name, { lower: true }) +
            `-${id}`,
          type: TargetModel.AccountType.EQUITY,
          groupId:
            type === SourceModel.BookingType.INCOME
              ? incomeGroup.id
              : expensesGroup.id,
          currency: null,
          unit: TargetModel.AccountUnit.CURRENCY,
        };
      }

      function sourceTransactionToTargetTransaction(
        sourceTransaction: SourceModel.Transaction,
      ): TargetModel.Prisma.TransactionCreateInput {
        return {
          description: sourceTransaction.note ?? "",
          bookings: {
            create: sourceTransaction.bookings
              .filter(
                (
                  b,
                ): b is
                  | ((SourceModel.Deposit | SourceModel.Charge) & {
                      unit: { kind: SourceModel.AccountUnitKind.CURRENCY };
                    })
                  | SourceModel.Appreciation
                  | SourceModel.Depreciation
                  | SourceModel.Expense
                  | SourceModel.Income =>
                  ((b.type === SourceModel.BookingType.CHARGE ||
                    b.type === SourceModel.BookingType.DEPOSIT) &&
                    b.unit.kind === SourceModel.AccountUnitKind.CURRENCY) ||
                  b.type === SourceModel.BookingType.INCOME ||
                  b.type === SourceModel.BookingType.EXPENSE ||
                  b.type === SourceModel.BookingType.APPRECIATION ||
                  b.type === SourceModel.BookingType.DEPRECIATION,
              )
              .map((b) => {
                return {
                  date: sourceTransaction.date,
                  description: "note" in b && b.note ? b.note : "",
                  value: new TargetModel.Prisma.Decimal(b.amount.toString()),
                  account: {
                    connect:
                      b.type === SourceModel.BookingType.DEPOSIT ||
                      b.type === SourceModel.BookingType.CHARGE
                        ? {
                            id: accountsBySourceAccountId[
                              b.accountId.toString()
                            ].id,
                          }
                        : b.type === SourceModel.BookingType.INCOME
                          ? {
                              id: accountsBySourceIncomeCategoryId[
                                b.incomeCategoryId.toString()
                              ].id,
                            }
                          : b.type === SourceModel.BookingType.EXPENSE
                            ? {
                                id: accountsBySourceExpenseCategoryId[
                                  b.expenseCategoryId.toString()
                                ].id,
                              }
                            : {
                                id: investmentGainLossAccount.id,
                              },
                  },
                  currency:
                    b.type === SourceModel.BookingType.DEPOSIT ||
                    b.type === SourceModel.BookingType.CHARGE
                      ? b.unit.currency
                      : b.type === SourceModel.BookingType.EXPENSE ||
                          b.type === SourceModel.BookingType.INCOME
                        ? b.currency
                        : "CHF",
                };
              }),
          },
        };
      }
    } finally {
      sourceDbClient.close();
    }
  })
  .parse();
