import { Unit } from "~/.prisma-client/enums";
import type {
  CryptocurrencyUnit,
  CurrencyUnit,
  SecurityUnit,
  UnitInfo,
} from "./types";
import type { Account } from "~/.prisma-client/client";

type WithUnit = {
  unit: Unit;
  currency?: string | null;
  cryptocurrency?: string | null;
  symbol?: string | null;
  tradeCurrency?: string | null;
};

export function getAccountUnitInfo(
  account: Pick<
    Account,
    "unit" | "currency" | "cryptocurrency" | "symbol" | "tradeCurrency"
  >,
): UnitInfo | undefined {
  if (!account.unit) return undefined;
  return getUnitInfo({ ...account, unit: account.unit! });
}

export function getUnitInfo({
  unit,
  currency,
  cryptocurrency,
  symbol,
  tradeCurrency,
}: WithUnit): UnitInfo {
  switch (unit) {
    case Unit.CURRENCY:
      if (!currency) throw new Error("Currency is required for unit CURRENCY");
      return { unit, currency };

    case Unit.CRYPTOCURRENCY:
      if (!cryptocurrency)
        throw new Error("Cryptocurrency is required for unit CRYPTOCURRENCY");
      return { unit, cryptocurrency };

    case Unit.SECURITY:
      if (!symbol || !tradeCurrency)
        throw new Error(
          "Symbol and tradeCurrency are required for unit SECURITY",
        );
      return { unit, symbol, tradeCurrency };

    default:
      throw new Error("Invalid unit");
  }
}

export function getCurrencyUnitInfo(currency: string): CurrencyUnit {
  return { unit: Unit.CURRENCY, currency };
}

export function getUnitLabel(unitInfo: UnitInfo) {
  switch (unitInfo.unit) {
    case Unit.CURRENCY:
      return unitInfo.currency;
    case Unit.CRYPTOCURRENCY:
      return unitInfo.cryptocurrency;
    case Unit.SECURITY:
      return unitInfo.symbol;
  }
}

export function isSameUnit(unitInfoA: UnitInfo, unitInfoB: UnitInfo) {
  if (unitInfoA.unit !== unitInfoB.unit) return false;

  switch (unitInfoA.unit) {
    case Unit.CURRENCY:
      return unitInfoA.currency === (unitInfoB as CurrencyUnit).currency;

    case Unit.CRYPTOCURRENCY:
      return (
        unitInfoA.cryptocurrency ===
        (unitInfoB as CryptocurrencyUnit).cryptocurrency
      );

    case Unit.SECURITY:
      return unitInfoA.symbol === (unitInfoB as SecurityUnit).symbol;
  }
}
