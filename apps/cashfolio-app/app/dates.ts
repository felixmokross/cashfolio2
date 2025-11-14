export function today() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function endOfQuarterUtc(date: Date) {
  const month = date.getUTCMonth();
  const quarterEndMonth = month - (month % 3) + 2;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterEndMonth + 1, 0));
}

export function endOfYearUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 12, 0));
}
