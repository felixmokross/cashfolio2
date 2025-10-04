import type { Unit as UnitEnum } from "~/.prisma-client/enums";

export function isSameUnit(unitA: Unit, unitB: Unit) {
  if (unitA.unit !== unitB.unit) return false;

  switch (unitA.unit) {
    case "CURRENCY":
      return unitA.currency === (unitB as CurrencyUnit).currency;
    case "CRYPTOCURRENCY":
      return (
        unitA.cryptocurrency === (unitB as CryptocurrencyUnit).cryptocurrency
      );
    case "SECURITY":
      return unitA.symbol === (unitB as SecurityUnit).symbol;
  }
}
export type Unit = CurrencyUnit | CryptocurrencyUnit | SecurityUnit;

type CurrencyUnit = {
  unit: typeof UnitEnum.CURRENCY;
  currency: string;
};

type CryptocurrencyUnit = {
  unit: typeof UnitEnum.CRYPTOCURRENCY;
  cryptocurrency: string;
};

type SecurityUnit = {
  unit: typeof UnitEnum.SECURITY;
  symbol: string;
  tradeCurrency: string;
};
