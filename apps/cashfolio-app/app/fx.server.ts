import type { Prisma } from "@prisma/client";
import { formatISODate } from "./formatting";
import { redis } from "~/redis.server";
import { subDays } from "date-fns";

export const refCurrency = "CHF";

export async function convertToRefCurrency(
  value: Prisma.Decimal,
  currency: string,
) {
  return await convertToCurrency(value, currency, refCurrency);
}

export async function convertToCurrency(
  value: Prisma.Decimal,
  sourceCurrency: string,
  targetCurrency: string,
) {
  if (sourceCurrency === targetCurrency) return value;

  const today = new Date();
  const date = formatISODate(today);

  let rate = await getExchangeRate(sourceCurrency, targetCurrency, today);
  if (rate === null) {
    rate = await getExchangeRate(
      sourceCurrency,
      targetCurrency,
      subDays(today, 1),
    );
  }

  if (!rate) {
    throw new Error(
      `Could not get FX rate for ${sourceCurrency} to ${targetCurrency} on ${date}`,
    );
  }

  return value.mul(rate);
}
const fxRateBaseCurrency = "USD";

async function getExchangeRate(
  sourceCurrency: string,
  targetCurrency: string,
  date: Date,
) {
  const fxRates = await getExchangeRates(date);
  if (!fxRates) return null;

  const baseToTargetRate = fxRates[`${fxRateBaseCurrency}${targetCurrency}`];
  const baseToSourceRate = fxRates[`${fxRateBaseCurrency}${sourceCurrency}`];

  if (sourceCurrency === fxRateBaseCurrency) {
    return baseToTargetRate;
  }
  if (targetCurrency === fxRateBaseCurrency) {
    return 1 / baseToSourceRate;
  }

  return baseToTargetRate / baseToSourceRate;
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
    return data.quotes;
  }

  return JSON.parse(cacheEntry);
}
