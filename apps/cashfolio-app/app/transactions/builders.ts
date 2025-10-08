import { Decimal } from "@prisma/client/runtime/library";
import type { Booking, Transaction } from "../.prisma-client/client";
import { Unit } from "../.prisma-client/enums";
import type { TransactionWithBookings } from "./types";
import { createId } from "@paralleldrive/cuid2";

export function buildBooking(values: Partial<Booking> = {}): Booking {
  return {
    id: createId(),
    transactionId: createId(),
    accountId: createId(),
    value: new Decimal(100),
    unit: Unit.CURRENCY,
    currency: "CHF",
    symbol: null,
    tradeCurrency: null,
    cryptocurrency: null,
    date: new Date(),
    description: "Test Booking",
    accountBookId: createId(),
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
    accountBookId: "account_book_1",
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
