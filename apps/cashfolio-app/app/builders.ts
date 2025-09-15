import {
  AccountType,
  Prisma,
  Unit,
  type Account,
  type AccountGroup,
  type Booking,
  type Transaction,
} from "@prisma/client";
import type { AccountWithBookings } from "./accounts/types";
import type { TransactionWithBookings } from "./transactions/types";

export function buildAccountGroup(
  values: Partial<AccountGroup> = {},
): AccountGroup {
  return {
    id: "group_1",
    name: "My Account Group",
    slug: "my-account-group",

    parentGroupId: null,
    type: AccountType.ASSET,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...values,
  };
}

export function buildAccount(values: Partial<Account> = {}): Account {
  return {
    id: "account_1",
    name: "My Account",
    slug: "my-account",
    groupId: "group_1",
    type: AccountType.ASSET,
    unit: Unit.CURRENCY,
    currency: "CHF",
    cryptocurrency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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

export function buildBooking(values: Partial<Booking> = {}): Booking {
  return {
    id: "booking_1",
    transactionId: "transaction_1",
    accountId: "account_1",
    value: new Prisma.Decimal(100),
    unit: Unit.CURRENCY,
    currency: "CHF",
    cryptocurrency: null,
    date: new Date(),
    description: "Test Booking",
    ...values,
  };
}

export function buildTransaction(
  values: Partial<Transaction> = {},
): Transaction {
  return {
    id: "transaction_1",
    description: "Test Transaction",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...values,
  };
}

export function buildTransactionWithBookings(
  values: Partial<TransactionWithBookings> = {},
): TransactionWithBookings {
  return {
    ...buildTransaction(values),
    bookings: values.bookings ?? [],
  };
}
