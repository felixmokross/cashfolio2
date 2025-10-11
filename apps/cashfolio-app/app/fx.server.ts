import { Unit as UnitEnum } from "./.prisma-client/enums";
import { formatISODate } from "./formatting";
import { redis } from "~/redis.server";
import { subDays } from "date-fns";
import { Decimal } from "@prisma/client/runtime/library";
import { getUnitLabel, isSameUnit } from "./units/functions";
import type { UnitInfo } from "./units/types";

const baseCurrency = "USD";
const baseUnitInfo: UnitInfo = {
  unit: UnitEnum.CURRENCY,
  currency: baseCurrency,
};

export async function convert(
  value: Decimal,
  sourceUnitInfo: UnitInfo,
  targetUnitInfo: UnitInfo,
  date: Date,
) {
  if (value.isZero()) {
    return new Decimal(0);
  }

  const rate = await getExchangeRate(sourceUnitInfo, targetUnitInfo, date);
  if (!rate) {
    throw new Error(
      `No FX rate for ${getUnitLabel(sourceUnitInfo)} to ${getUnitLabel(targetUnitInfo)} on ${date}`,
    );
  }
  return rate.mul(value);
}

export async function getExchangeRate(
  sourceUnitInfo: UnitInfo,
  targetUnitInfo: UnitInfo,
  date: Date,
) {
  if (isSameUnit(sourceUnitInfo, targetUnitInfo)) {
    return new Decimal(1);
  }

  const baseToTargetRate = await getBaseRate(date, targetUnitInfo);
  const baseToSourceRate = await getBaseRate(date, sourceUnitInfo);

  return baseToTargetRate.dividedBy(baseToSourceRate);
}

async function getBaseRate(date: Date, unitInfo: UnitInfo): Promise<Decimal> {
  if (isSameUnit(unitInfo, baseUnitInfo)) {
    return new Decimal(1);
  }

  switch (unitInfo.unit) {
    case UnitEnum.CURRENCY:
      const fxRates = await getFxExchangeRates(date);
      return new Decimal(fxRates[`${baseCurrency}${unitInfo.currency}`]);
    case UnitEnum.CRYPTOCURRENCY:
      const cryptoPrices = await getCryptocurrencyPrices(date);
      return new Decimal(1).dividedBy(cryptoPrices[unitInfo.cryptocurrency]);
    case UnitEnum.SECURITY:
      return new Decimal(1).dividedBy(
        await convert(
          await getSecurityPrice(date, unitInfo.symbol),
          { unit: UnitEnum.CURRENCY, currency: unitInfo.tradeCurrency },
          baseUnitInfo,
          date,
        ),
      );
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

async function getSecurityPrice(
  date: Date,
  symbol: string,
  backtrackCount = 0,
): Promise<Decimal> {
  const key = `security:${symbol}:${formatISODate(date)}`;
  const cacheEntry = await redis.get(key);
  if (!cacheEntry) {
    console.log(`Fetching security price for ${key}...`);
    const response = await fetch(
      `http://api.marketstack.com/v2/eod/${formatISODate(date)}?access_key=${process.env.MARKETSTACK_API_KEY}&symbols=${symbol}`,
    );
    if (!response.ok) {
      throw new Error(
        `Security price fetch failed for ${symbol} on ${formatISODate(date)}`,
      );
    }
    const data = await response.json();
    if (!data || !data.data || !data.data.length) {
      if (backtrackCount >= 15) {
        throw new Error(
          `No security price data for ${symbol} on ${formatISODate(date)} after ${backtrackCount} attempts`,
        );
      }
      const backtrackedPrice = await getSecurityPrice(
        subDays(date, 1),
        symbol,
        backtrackCount + 1,
      );

      // cache the backtracked price only until the next day
      await redis.set(key, backtrackedPrice.toString(), {
        expiration: {
          type: "EX",
          value:
            // 24 hours
            86400,
        },
      });

      return backtrackedPrice;
    }

    const price = data.data[0].close as number;
    await redis.set(key, price.toString());

    return new Decimal(price);
  }

  return new Decimal(cacheEntry);
}
