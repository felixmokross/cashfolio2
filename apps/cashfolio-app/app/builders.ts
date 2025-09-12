import {
  AccountType,
  AccountUnit,
  Prisma,
  type Account,
  type Booking,
} from "@prisma/client";

export function buildAccount(values: Partial<Account> = {}): Account {
  return {
    id: "account_1",
    name: "My Account",
    slug: "my-account",
    groupId: "group_1",
    type: AccountType.ASSET,
    unit: AccountUnit.CURRENCY,
    currency: "CHF",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...values,
  };
}

export function buildBooking(values: Partial<Booking> = {}): Booking {
  return {
    id: "booking_1",
    transactionId: "transaction_1",
    accountId: "account_1",
    value: new Prisma.Decimal(100),
    currency: "CHF",
    date: new Date(),
    description: "Test Booking",
    ...values,
  };
}
