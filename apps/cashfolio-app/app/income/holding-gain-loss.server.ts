import { subDays } from "date-fns";
import invariant from "tiny-invariant";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
  type Account,
  type AccountBook,
  type AccountGroup,
} from "~/.prisma-client/client";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import type { BookingWithTransaction } from "~/accounts/detail/types";
import type { AccountWithBookings } from "~/accounts/types";
import { formatISODate } from "~/formatting";
import { getExchangeRate } from "~/fx.server";
import { prisma } from "~/prisma.server";
import {
  getAccountUnitInfo,
  getCurrencyUnitInfo,
  getUnitKey,
  getUnitLabel,
} from "~/units/functions";

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

export function generateHoldingGainLossAccount(
  account: Account,
  groupId?: string,
): Account {
  const unitInfo = getAccountUnitInfo(account);
  invariant(unitInfo, "Holding account must have a unit defined");
  return {
    id: `holding-gain-loss-${account.id}`,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
    name: `${account.unit === Unit.CURRENCY ? "FX" : account.unit === Unit.CRYPTOCURRENCY ? "Crypto" : "Security"} Holding Gain/Loss for ${account.name}`,
    groupId: groupId ?? `holding-gain-loss-${getUnitKey(unitInfo)}-accounts`,
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

export async function getHoldingAccounts(accountBookId: string) {
  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: accountBookId },
  });
  return await prisma.account.findMany({
    where: {
      accountBookId: accountBook.id,
      type: { in: [AccountType.ASSET, AccountType.LIABILITY] },
      NOT: {
        unit: Unit.CURRENCY,
        currency: accountBook.referenceCurrency,
      },
    },
  });
}

export async function generateHoldingGainLossAccountGroups(
  accountBookId: string,
  holdingAccounts: Account[],
) {
  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: accountBookId },
  });
  const holdingGainLossAccountGroups: AccountGroup[] = [];

  for (const holdingAccount of holdingAccounts) {
    const unitInfo = getAccountUnitInfo(holdingAccount);
    invariant(unitInfo, "Holding account must have a unit defined");

    const unitKey = getUnitKey(unitInfo);
    const groupId = `holding-gain-loss-${unitKey}-accounts`;
    let holdingGainLossAccountGroup = holdingGainLossAccountGroups.find(
      (g) => g.id === groupId,
    );
    if (!holdingGainLossAccountGroup) {
      holdingGainLossAccountGroup = {
        id: groupId,
        name: getUnitLabel(unitInfo),
        parentGroupId:
          // TODO currently always placing into account book groups, add auto-generation of groups if not set
          holdingAccount.unit === Unit.CURRENCY
            ? accountBook.fxHoldingGainLossAccountGroupId
            : holdingAccount.unit === Unit.CRYPTOCURRENCY
              ? accountBook.cryptoHoldingGainLossAccountGroupId
              : accountBook.securityHoldingGainLossAccountGroupId,
        type: AccountType.EQUITY,
        accountBookId: accountBook.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        sortOrder: Infinity,
      };

      invariant(
        holdingGainLossAccountGroup.parentGroupId,
        "Auto-generation of holding gain/loss account groups not yet implemented",
      );

      holdingGainLossAccountGroups.push(holdingGainLossAccountGroup);
    }
  }

  return holdingGainLossAccountGroups;
}
