import { useRouteLoaderData } from "react-router";
import type { loader as accountBookLoader } from "~/account-books/route";

export function useAccountBook() {
  const accountBookLoaderData = useRouteLoaderData<typeof accountBookLoader>(
    "account-books/route",
  );
  if (!accountBookLoaderData) {
    throw new Error("accountBookLoaderData not found");
  }
  const { accountBook } = accountBookLoaderData;
  return accountBook;
}
