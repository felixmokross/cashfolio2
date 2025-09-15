import { Prisma, Unit as UnitEnum } from "@prisma/client";
import { formatISODate } from "./formatting";
import { redis } from "~/redis.server";

const baseCurrency = "USD";
const baseUnit: Unit = { unit: UnitEnum.CURRENCY, currency: baseCurrency };

export async function convert(
  value: Prisma.Decimal,
  sourceUnit: Unit,
  targetUnit: Unit,
  date: Date,
) {
  const rate = await getExchangeRate(sourceUnit, targetUnit, date);
  if (!rate) {
    throw new Error(
      `No FX rate for ${unitToString(sourceUnit)} to ${unitToString(targetUnit)} on ${date}`,
    );
  }
  return rate.mul(value);
}

export async function getExchangeRate(
  sourceUnit: Unit,
  targetUnit: Unit,
  date: Date,
) {
  if (isSameUnit(sourceUnit, targetUnit)) {
    return new Prisma.Decimal(1);
  }

  const baseToTargetRate = await getBaseRate(date, targetUnit);
  const baseToSourceRate = await getBaseRate(date, sourceUnit);

  return baseToTargetRate.dividedBy(baseToSourceRate);
}

async function getBaseRate(date: Date, unit: Unit) {
  if (isSameUnit(unit, baseUnit)) {
    return new Prisma.Decimal(1);
  }

  switch (unit.unit) {
    case UnitEnum.CURRENCY:
      const fxRates = await getFxExchangeRates(date);
      return new Prisma.Decimal(fxRates[`${baseCurrency}${unit.currency}`]);
    case UnitEnum.CRYPTOCURRENCY:
      const cryptoPrices = await getCryptocurrencyPrices(date);
      return new Prisma.Decimal(1).dividedBy(cryptoPrices[unit.cryptocurrency]);
  }
}

async function getFxExchangeRates(date: Date) {
  const key = formatISODate(date);
  const cacheEntry = await redis.get(key);
  if (!cacheEntry) {
    console.log(`Fetching FX rates for ${key}...`);
    const response = await fetch(
      `https://api.currencylayer.com/historical?access_key=${process.env.CURRENCYLAYER_API_KEY}&date=${formatISODate(date)}`,
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(`FX rates fetch failed: ${data.error?.info}`);
    }

    await redis.set(key, JSON.stringify(data.quotes));
    return data.quotes as Record<string, number>;
  }

  return JSON.parse(cacheEntry) as Record<string, number>;
}

async function getCryptocurrencyPrices(date: Date) {
  const key = `crypto-${formatISODate(date)}`;
  const cacheEntry = await redis.get(key);
  if (!cacheEntry) {
    console.log(`Fetching cryptocurrency prices for ${key}...`);
    const response = await fetch(
      `http://api.coinlayer.com/${formatISODate(date)}?access_key=${process.env.COINLAYER_API_KEY}&target=${baseCurrency}`,
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Cryptocurrency rates fetch failed: ${data.error?.info}`);
    }

    await redis.set(key, JSON.stringify(data.rates));
    return data.rates as Record<string, number>;
  }

  return JSON.parse(cacheEntry) as Record<string, number>;
}

export type Unit = CurrencyUnit | CryptocurrencyUnit;

type CurrencyUnit = {
  unit: typeof UnitEnum.CURRENCY;
  currency: string;
};

type CryptocurrencyUnit = {
  unit: typeof UnitEnum.CRYPTOCURRENCY;
  cryptocurrency: string;
};

function unitToString(unit: Unit) {
  switch (unit.unit) {
    case UnitEnum.CURRENCY:
      return unit.currency;
    case UnitEnum.CRYPTOCURRENCY:
      return `${unit.cryptocurrency} (crypto)`;
  }
}

function isSameUnit(unitA: Unit, unitB: Unit) {
  if (unitA.unit !== unitB.unit) return false;

  switch (unitA.unit) {
    case UnitEnum.CURRENCY:
      return unitA.currency === (unitB as CurrencyUnit).currency;
    case UnitEnum.CRYPTOCURRENCY:
      return (
        unitA.cryptocurrency === (unitB as CryptocurrencyUnit).cryptocurrency
      );
  }
}
