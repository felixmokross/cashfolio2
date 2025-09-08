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
  return dateFormat.format(date instanceof Date ? date : new Date(date));
}
