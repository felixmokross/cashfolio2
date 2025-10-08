import type { Account } from "~/.prisma-client/client";
import { AccountType, Unit } from "~/.prisma-client/enums";
import type { AccountWithBookings } from "./types";
import { createId } from "@paralleldrive/cuid2";

export function buildAccount(values: Partial<Account> = {}): Account {
  return {
    id: createId(),
    name: "My Account",
    groupId: "group_1",
    type: AccountType.ASSET,
    unit: Unit.CURRENCY,
    currency: "CHF",
    cryptocurrency: null,
    symbol: null,
    tradeCurrency: null,
    equityAccountSubtype: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: "account_book_1",
    isActive: true,
    ...values,
  };
}

export function buildAccountWithBookings(
  values: Partial<AccountWithBookings> = {},
): AccountWithBookings {
  return {
    ...buildAccount(values),
    bookings: values.bookings ?? [],
  };
}
