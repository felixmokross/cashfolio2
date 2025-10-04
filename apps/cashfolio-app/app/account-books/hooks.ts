import { useRouteLoaderData } from "react-router";
import type { loader as accountBookLoader } from "~/account-books/route";

export function useAccountBookLoaderData() {
  const accountBookLoaderData = useRouteLoaderData<typeof accountBookLoader>(
    "account-books/route",
  );
  if (!accountBookLoaderData) {
    throw new Error("accountBookLoaderData not found");
  }

  return accountBookLoaderData;
}

export function usePeriod() {
  const { period } = useAccountBookLoaderData();
  return period;
}

export function useAccountBook() {
  const { accountBook } = useAccountBookLoaderData();
  return accountBook;
}

export function useFirstBookingDate() {
  const { firstBookingDate } = useAccountBookLoaderData();
  return firstBookingDate ? new Date(firstBookingDate) : undefined;
}
