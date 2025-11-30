import { formatISO, parseISO } from "date-fns";

const locale = "en-CH";

const moneyFormat = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return moneyFormat.format(value);
}

const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

export function formatDate(date: string | Date) {
  return dateFormat.format(date instanceof Date ? date : parseISO(date));
}

export function formatISODate(date: Date) {
  return formatISO(date, { representation: "date" });
}

export const percentageNumberFormat = new Intl.NumberFormat(locale, {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
