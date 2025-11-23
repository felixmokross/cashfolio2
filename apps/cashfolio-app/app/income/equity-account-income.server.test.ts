import { expect, test } from "vitest";
import { getEquityAccountIncome } from "./equity-account-income.server";
import { AccountType } from "~/.prisma-client/enums";
import { Decimal } from "@prisma/client/runtime/library";
import { redis } from "~/redis.server";
import { parseISO } from "date-fns";
import { createTestAccount, testAccountBook } from "test-setup";

test("returns the income per equity account", async () => {
  await redis.ts.add(`fx:CHF`, parseISO("2025-11-15").getTime(), 1.1);
  await redis.ts.add(`fx:EUR`, parseISO("2025-11-15").getTime(), 1);

  const salaryAccount = await createTestAccount(
    { type: AccountType.EQUITY },
    {
      date: "2025-11-15",
      currency: "CHF",
      value: 10000,
    },
  );

  const groceriesAccount = await createTestAccount(
    { type: AccountType.EQUITY },
    { date: "2025-11-10", currency: "CHF", value: -200 },
    { date: "2025-11-15", currency: "EUR", value: -150 },
  );

  const rentAccount = await createTestAccount(
    { type: AccountType.EQUITY },
    {
      date: "2025-11-01",
      currency: "CHF",
      value: -2000,
    },
  );

  const result = await getEquityAccountIncome(
    testAccountBook.id,
    parseISO("2025-11-01"),
    parseISO("2025-11-30"),
  );

  expect(result).toEqual({
    accounts: [salaryAccount, groceriesAccount, rentAccount],
    accountGroups: [
      expect.objectContaining({
        type: AccountType.EQUITY,
        parentGroupId: null,
      }),
    ],
    incomeByAccountId: new Map([
      [salaryAccount.id, new Decimal(10000)],
      [groceriesAccount.id, new Decimal(-365)],
      [rentAccount.id, new Decimal(-2000)],
    ]),
  });
});
