import { Unit } from "~/.prisma-client/enums";

export type UnitInfo = CurrencyUnit | CryptocurrencyUnit | SecurityUnit;

export type CurrencyUnit = {
  unit: typeof Unit.CURRENCY;
  currency: string;
};

export type CryptocurrencyUnit = {
  unit: typeof Unit.CRYPTOCURRENCY;
  cryptocurrency: string;
};

export type SecurityUnit = {
  unit: typeof Unit.SECURITY;
  symbol: string;
  tradeCurrency: string;
};
