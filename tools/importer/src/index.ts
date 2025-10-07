import { program } from "commander";
import * as TargetModel from "cashfolio-app/app/.prisma-client/client";
import { MongoClient } from "mongodb";
import "dotenv/config";
import { createId } from "@paralleldrive/cuid2";
import * as SourceModel from "./source-model";
import { PrismaClient } from "cashfolio-app/app/.prisma-client/client";

async function clearAccountBook(
  targetDbClient: PrismaClient,
  accountBookId: string,
) {
  console.log("Clearing account book");
  await targetDbClient.transaction.deleteMany({ where: { accountBookId } });
  await targetDbClient.account.deleteMany({ where: { accountBookId } });
  await targetDbClient.accountGroup.deleteMany({ where: { accountBookId } });
}

async function connectToTargetDb() {
  const targetDbClient = new PrismaClient({
    datasources: { db: { url: process.env.TARGET_DATABASE_URL } },
  });
  // connect eagerly
  await targetDbClient.$connect();
  return targetDbClient;
}

async function ensureAccountBookExists(
  targetDbClient: PrismaClient,
  accountBookId: string,
) {
  const accountBook = await targetDbClient.accountBook.findUnique({
    where: { id: accountBookId },
  });
  if (!accountBook) {
    throw new Error(`Account book with ID ${accountBookId} not found`);
  }
}

program
  .command("clear")
  .argument("<account-book-id>", "ID of the account book to clear")
  .action(async (accountBookId) => {
    const targetDbClient = await connectToTargetDb();
    await ensureAccountBookExists(targetDbClient, accountBookId);
    await clearAccountBook(targetDbClient, accountBookId);
    console.log("Done");
  });

program
  .name("importer")
  .argument("<account-book-id>", "ID of the account book to import into")
  .action(async (accountBookId: string) => {
    const sourceDbClient = await MongoClient.connect(
      process.env.SOURCE_DATABASE_URI!,
    );

    const targetDbClient = await connectToTargetDb();

    await ensureAccountBookExists(targetDbClient, accountBookId);

    try {
      // clear existing data in target DB
      await clearAccountBook(targetDbClient, accountBookId);

      console.log(`Importing data…`);

      const assetsGroup = await targetDbClient.accountGroup.create({
        data: {
          name: "Assets",
          type: TargetModel.AccountType.ASSET,
          accountBookId,
        },
      });

      const liabilitiesGroup = await targetDbClient.accountGroup.create({
        data: {
          name: "Liabilities",
          type: TargetModel.AccountType.LIABILITY,
          accountBookId,
        },
      });

      const equityGroup = await targetDbClient.accountGroup.create({
        data: {
          name: "Equity",
          type: TargetModel.AccountType.EQUITY,
          accountBookId,
        },
      });

      const expensesGroup = await targetDbClient.accountGroup.create({
        data: {
          name: "Expenses",
          type: TargetModel.AccountType.EQUITY,
          parentGroupId: equityGroup.id,
          accountBookId,
        },
      });

      const incomeGroup = await targetDbClient.accountGroup.create({
        data: {
          name: "Income",
          type: TargetModel.AccountType.EQUITY,
          parentGroupId: equityGroup.id,
          accountBookId,
        },
      });

      const investmentGainLossAccount = await targetDbClient.account.create({
        data: {
          name: "Investment Gain/Loss",
          type: TargetModel.AccountType.EQUITY,
          equityAccountSubtype: TargetModel.EquityAccountSubtype.GAIN_LOSS,
          groupId: equityGroup.id,
          accountBookId,
        },
      });

      const sourceDb = sourceDbClient.db();
      console.log(`connected to DB ${sourceDb.databaseName}`);

      const accountGroupsBySourceAccountCategoryId = Object.fromEntries(
        (
          await sourceDb
            .collection<SourceModel.AccountCategory>("accountCategories")
            .find({ type: SourceModel.AccountCategoryType.ASSET })
            .toArray()
        ).map((sac) => [
          sac._id.toString(),
          sourceAccountCategoryToTargetAccountGroup(sac),
        ]),
      );

      console.log(
        `Creating ${Object.values(accountGroupsBySourceAccountCategoryId).length} account groups…`,
      );
      await targetDbClient.accountGroup.createMany({
        data: Object.values(accountGroupsBySourceAccountCategoryId),
      });

      const sourceAccounts = await sourceDb
        .collection<SourceModel.Account>("accounts")
        .find()
        .toArray();

      const sourceStocksById = Object.fromEntries(
        (
          await sourceDb
            .collection<SourceModel.Stock>("stocks")
            .find()
            .toArray()
        ).map((s) => [s._id!.toString(), s]),
      );

      const accountsBySourceAccountId = Object.fromEntries(
        sourceAccounts.map((a) => [
          a._id.toString(),
          sourceAccountToTargetAccount(a),
        ]),
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
      await targetDbClient.account.createMany({
        data: accounts,
      });

      // opening balances
      const openingBalancesAccount = await targetDbClient.account.create({
        data: {
          name: "Opening Balances",
          type: TargetModel.AccountType.EQUITY,
          equityAccountSubtype: TargetModel.EquityAccountSubtype.GAIN_LOSS,
          groupId: equityGroup.id,
          accountBookId,
        },
      });

      for (const sourceAccount of sourceAccounts.filter(
        (sa) =>
          !!sa.openingBalance && Number(sa.openingBalance.toString()) !== 0,
      )) {
        const openingBalance = new TargetModel.Prisma.Decimal(
          sourceAccount.openingBalance!.toString(),
        );
        const currency = (sourceAccount.unit as SourceModel.CurrencyAccountUnit)
          .currency;
        const openingBalanceTransaction: TargetModel.Prisma.TransactionCreateInput =
          {
            description: "Opening Balance",
            accountBook: { connect: { id: accountBookId } },
            bookings: {
              create: [
                {
                  date: new Date("2017-12-31"),
                  description: "",
                  value: openingBalance,
                  accountId:
                    accountsBySourceAccountId[sourceAccount._id.toString()].id,
                  unit: TargetModel.Unit.CURRENCY,
                  currency,
                },
                {
                  date: new Date("2017-12-31"),
                  description: "",
                  value: openingBalance.negated(),
                  accountId: openingBalancesAccount.id,
                  unit: TargetModel.Unit.CURRENCY,
                  currency,
                },
              ],
            },
          };

        await targetDbClient.transaction.create({
          data: openingBalanceTransaction,
        });
      }

      const transactions = (
        await sourceDb
          .collection<SourceModel.Transaction>("transactions")
          .find()
          .toArray()
      ).map(sourceTransactionToTargetTransaction);

      console.log(`Creating ${transactions.length} transactions…`);
      for (let i = 0; i < transactions.length; i++) {
        await targetDbClient.transaction.create({
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
          type:
            sourceAccountCategory.type === "ASSET"
              ? TargetModel.AccountType.ASSET
              : TargetModel.AccountType.LIABILITY,
          parentGroupId:
            sourceAccountCategory.type === "ASSET"
              ? assetsGroup.id
              : liabilitiesGroup.id,
          accountBookId,
          isActive: true,
          sortOrder: sourceAccountCategory.order,
        };
      }

      function sourceAccountToTargetAccount(
        sourceAccount: SourceModel.Account,
      ): Omit<TargetModel.Account, "createdAt" | "updatedAt"> {
        const id = createId();
        return {
          id,
          name: sourceAccount.name,
          type:
            sourceAccount.categoryType === "ASSET"
              ? TargetModel.AccountType.ASSET
              : TargetModel.AccountType.LIABILITY,
          equityAccountSubtype: null,
          groupId:
            sourceAccount.categoryType === "LIABILITY"
              ? liabilitiesGroup.id
              : accountGroupsBySourceAccountCategoryId[
                  sourceAccount.categoryId.toString()
                ].id,
          unit:
            sourceAccount.unit.kind === SourceModel.AccountUnitKind.CURRENCY
              ? isCryptocurrency(sourceAccount.unit.currency)
                ? TargetModel.Unit.CRYPTOCURRENCY
                : TargetModel.Unit.CURRENCY
              : TargetModel.Unit.SECURITY,
          currency:
            sourceAccount.unit.kind === SourceModel.AccountUnitKind.CURRENCY &&
            !isCryptocurrency(sourceAccount.unit.currency)
              ? sourceAccount.unit.currency
              : null,
          cryptocurrency:
            sourceAccount.unit.kind === SourceModel.AccountUnitKind.CURRENCY &&
            isCryptocurrency(sourceAccount.unit.currency)
              ? sourceAccount.unit.currency
              : null,
          symbol:
            sourceAccount.unit.kind === SourceModel.AccountUnitKind.STOCK
              ? getSymbol(sourceAccount.unit.stockId.toString())
              : null,
          tradeCurrency:
            sourceAccount.unit.kind === SourceModel.AccountUnitKind.STOCK
              ? sourceStocksById[sourceAccount.unit.stockId.toString()]
                  .tradingCurrency
              : null,
          accountBookId,
          isActive: !sourceAccount.closingDate,
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
          type: TargetModel.AccountType.EQUITY,
          equityAccountSubtype:
            type === SourceModel.BookingType.INCOME
              ? TargetModel.EquityAccountSubtype.INCOME
              : TargetModel.EquityAccountSubtype.EXPENSE,
          groupId:
            type === SourceModel.BookingType.INCOME
              ? incomeGroup.id
              : expensesGroup.id,
          unit: null,
          currency: null,
          cryptocurrency: null,
          symbol: null,
          tradeCurrency: null,
          accountBookId,
          isActive: true,
        };
      }

      function sourceTransactionToTargetTransaction(
        sourceTransaction: SourceModel.Transaction,
      ): TargetModel.Prisma.TransactionCreateInput {
        return {
          description: sourceTransaction.note ?? "",
          bookings: {
            create: sourceTransaction.bookings.map((b) => {
              const isCrypto =
                b.type === SourceModel.BookingType.CHARGE ||
                b.type === SourceModel.BookingType.DEPOSIT
                  ? b.unit.kind === SourceModel.AccountUnitKind.CURRENCY &&
                    isCryptocurrency(b.unit.currency)
                  : b.type === SourceModel.BookingType.INCOME ||
                      b.type === SourceModel.BookingType.EXPENSE
                    ? isCryptocurrency(b.currency)
                    : false;
              return {
                date: sourceTransaction.date,
                description: "note" in b && b.note ? b.note : "",
                value: new TargetModel.Prisma.Decimal(b.amount.toString()).mul(
                  b.type === SourceModel.BookingType.CHARGE ||
                    b.type === SourceModel.BookingType.INCOME ||
                    b.type === SourceModel.BookingType.APPRECIATION
                    ? -1
                    : 1,
                ),
                account: {
                  connect: {
                    id_accountBookId: {
                      id:
                        b.type === SourceModel.BookingType.DEPOSIT ||
                        b.type === SourceModel.BookingType.CHARGE
                          ? accountsBySourceAccountId[b.accountId.toString()].id
                          : b.type === SourceModel.BookingType.INCOME
                            ? accountsBySourceIncomeCategoryId[
                                b.incomeCategoryId.toString()
                              ].id
                            : b.type === SourceModel.BookingType.EXPENSE
                              ? accountsBySourceExpenseCategoryId[
                                  b.expenseCategoryId.toString()
                                ].id
                              : investmentGainLossAccount.id,
                      accountBookId,
                    },
                  },
                },
                unit: isCrypto
                  ? TargetModel.Unit.CRYPTOCURRENCY
                  : (b.type === SourceModel.BookingType.CHARGE ||
                        b.type === SourceModel.BookingType.DEPOSIT) &&
                      b.unit.kind === SourceModel.AccountUnitKind.STOCK
                    ? TargetModel.Unit.SECURITY
                    : TargetModel.Unit.CURRENCY,
                currency: !isCrypto
                  ? b.type === SourceModel.BookingType.DEPOSIT ||
                    b.type === SourceModel.BookingType.CHARGE
                    ? b.unit.kind === SourceModel.AccountUnitKind.CURRENCY
                      ? b.unit.currency
                      : null
                    : b.type === SourceModel.BookingType.EXPENSE ||
                        b.type === SourceModel.BookingType.INCOME
                      ? b.currency
                      : "CHF"
                  : null,
                cryptocurrency: isCrypto
                  ? b.type === SourceModel.BookingType.DEPOSIT ||
                    b.type === SourceModel.BookingType.CHARGE
                    ? b.unit.kind === SourceModel.AccountUnitKind.CURRENCY
                      ? b.unit.currency
                      : null
                    : b.type === SourceModel.BookingType.EXPENSE ||
                        b.type === SourceModel.BookingType.INCOME
                      ? b.currency
                      : null
                  : null,
                symbol:
                  b.type === SourceModel.BookingType.DEPOSIT ||
                  b.type === SourceModel.BookingType.CHARGE
                    ? b.unit.kind === SourceModel.AccountUnitKind.STOCK
                      ? getSymbol(b.unit.stockId.toString())
                      : null
                    : null,
                tradeCurrency:
                  b.type === SourceModel.BookingType.DEPOSIT ||
                  b.type === SourceModel.BookingType.CHARGE
                    ? b.unit.kind === SourceModel.AccountUnitKind.STOCK
                      ? sourceStocksById[b.unit.stockId.toString()]
                          .tradingCurrency
                      : null
                    : null,
                accountBook: { connect: { id: accountBookId } },
              };
            }),
          },
          accountBook: { connect: { id: accountBookId } },
        };
      }

      function getSymbol(stockId: string) {
        const symbol = sourceStocksById[stockId]?.symbol;
        const mappedSymbol =
          symbolMapping[symbol as keyof typeof symbolMapping] ?? symbol;
        return mappedSymbol;
      }
    } finally {
      sourceDbClient.close();
    }
  })
  .parse();

function isCryptocurrency(currency: string) {
  return ["ADA", "BCH", "BTC", "ETH"].includes(currency);
}

const symbolMapping = {
  "IUSN-GY": "IUSN.DE",
  "IWDA-NA": "IWDA.AS",
  "AEEM-FP": "AEEM.PA",
  "EMIM-NA": "EMIM.AS",
  "VWCE.XETRA": "VWCE.DE",
  "FWRA.XSWX": "FWRA.L",
};
