import { Prisma } from "@prisma/client";
import { formatISODate } from "./formatting";
import { redis } from "~/redis.server";

const fxRateBaseCurrency = "USD";

export async function getExchangeRate(
  sourceCurrency: string,
  targetCurrency: string,
  date: Date,
) {
  if (sourceCurrency === targetCurrency) {
    return new Prisma.Decimal(1);
  }

  const fxRates = await getExchangeRates(date);
  if (!fxRates) return null;

  const baseToTargetRate = new Prisma.Decimal(
    fxRates[`${fxRateBaseCurrency}${targetCurrency}`],
  );
  const baseToSourceRate = new Prisma.Decimal(
    fxRates[`${fxRateBaseCurrency}${sourceCurrency}`],
  );

  if (sourceCurrency === fxRateBaseCurrency) {
    return baseToTargetRate;
  }
  if (targetCurrency === fxRateBaseCurrency) {
    return new Prisma.Decimal(1).dividedBy(baseToSourceRate);
  }

  return baseToTargetRate.dividedBy(baseToSourceRate);
}

async function getExchangeRates(date: Date) {
  const key = formatISODate(date);
  const cacheEntry = await redis.get(key);
  if (!cacheEntry) {
    console.log(`Fetching FX rates for ${key}...`);
    const response = await fetch(
      `https://api.currencylayer.com/historical?access_key=${process.env.CURRENCYLAYER_API_KEY}&date=${formatISODate(date)}`,
    );
    const data = await response.json();
    if (!data.success) {
      console.info(`FX rates fetch failed: ${data.error?.info}`);
      return null;
    }

    await redis.set(key, JSON.stringify(data.quotes));
    return data.quotes as Record<string, number>;
  }

  return JSON.parse(cacheEntry) as Record<string, number>;
}
