import { subDays } from "date-fns";
import invariant from "tiny-invariant";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
  type Account,
  type AccountBook,
} from "~/.prisma-client/client";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import type { BookingWithTransaction } from "~/accounts/detail/types";
import type { AccountWithBookings } from "~/accounts/types";
import { formatISODate } from "~/formatting";
import { getExchangeRate } from "~/fx.server";
import { getAccountUnitInfo, getCurrencyUnitInfo } from "~/units/functions";

export async function generateHoldingBookingsForAccount(
  accountBook: AccountBook,
  holdingAccount: AccountWithBookings,
  fromDate: Date,
  toDate: Date,
): Promise<BookingWithTransaction[]> {
  const initialDate = subDays(fromDate, 1);

  const holdingAccountUnit = getAccountUnitInfo(holdingAccount);
  invariant(holdingAccountUnit, "Holding account must have a unit defined");

  const referenceCurrencyUnit = getCurrencyUnitInfo(
    accountBook.referenceCurrency,
  );

  let balance = await getBalanceCached(
    accountBook.id,
    holdingAccount.id,
    holdingAccountUnit,
    initialDate,
  );

  if (balance.isZero() && holdingAccount.bookings.length === 0) {
    // no balance and no bookings within this period, nothing to do
    return [];
  }

  let holdingUnitRate = await getExchangeRate(
    holdingAccountUnit,
    referenceCurrencyUnit,
    initialDate,
  );

  const bookings = new Array<BookingWithTransaction>(
    holdingAccount.bookings.length + 1,
  );

  for (let i = 0; i < bookings.length; i++) {
    const date = holdingAccount.bookings[i]?.date ?? toDate;
    const newHoldingUnitRate = await getExchangeRate(
      holdingAccountUnit,
      referenceCurrencyUnit,
      date,
    );
    const holdingUnitRateDiff = newHoldingUnitRate.minus(holdingUnitRate);

    bookings[i] = {
      id: `holding-gain-loss-booking-${holdingAccount.id}-${formatISODate(date)}`,
      date,
      accountId: holdingAccount.id,
      value: balance.mul(holdingUnitRateDiff).negated(),
      unit: Unit.CURRENCY,
      currency: accountBook.referenceCurrency,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      description: "",
      transactionId: "transaction-holding-gain-loss",
      accountBookId: accountBook.id,
      transaction: {
        id: "transaction-holding-gain-loss",
        description: `Holding G/L as of ${formatISODate(date)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        bookings: [],
        accountBookId: accountBook.id,
      },
    };

    // TODO test this better, if new balance is set before calculating the FX booking value, it's wrong
    balance = await getBalanceCached(
      accountBook.id,
      holdingAccount.id,
      holdingAccountUnit,
      date,
    );
    holdingUnitRate = newHoldingUnitRate;
  }

  return bookings;
}

export function generateHoldingGainLossAccount(account: Account): Account {
  return {
    id: `holding-gain-loss-${account.id}`,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
    name: `${account.unit === Unit.CURRENCY ? "FX" : account.unit === Unit.CRYPTOCURRENCY ? "Crypto" : "Security"} Holding Gain/Loss for ${account.name}`,
    groupId: `${account.unit === Unit.CURRENCY ? "fx" : account.unit === Unit.CRYPTOCURRENCY ? "crypto" : "security"}-${account.currency || account.cryptocurrency || account.symbol}-accounts`,
    unit: null,
    currency: null,
    cryptocurrency: null,
    symbol: null,
    tradeCurrency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: account.accountBookId,
    isActive: true,
  };
}
