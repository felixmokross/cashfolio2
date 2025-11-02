import { Outlet, type LoaderFunctionArgs } from "react-router";
import { getPageTitle } from "~/meta";
import type { Route } from "./+types/route";
import { Heading } from "~/platform/heading";
import { Text } from "~/platform/text";
import { useAccountBook } from "~/account-books/hooks";
import { ensureAuthorized } from "~/account-books/functions.server";
import { getPeriodDateRange } from "~/period/functions.server";
import { getBalanceSheet } from "./functions.server";
import { serialize } from "~/serialization";
import { defaultShouldRevalidate } from "~/revalidation";
import { NavbarSection, NavNavbarItem } from "~/platform/navbar";

export const meta: Route.MetaFunction = () => [
  { title: getPageTitle("Balances") },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const { to: date } = await getPeriodDateRange(request, link.accountBookId);

  const balanceSheet = await getBalanceSheet(link.accountBookId, date);
  return serialize({
    balanceSheet,
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const accountBook = useAccountBook();
  return (
    <>
      <div className="flex justify-between items-center gap-8">
        <div className="shrink-0">
          <Heading>Balances</Heading>
          <Text>Reference Currency: {accountBook.referenceCurrency}</Text>
        </div>
        <div className="grow-0">
          <NavbarSection className="-mx-2">
            <NavNavbarItem href={`/${accountBook.id}/balances/breakdown`}>
              Breakdown
            </NavNavbarItem>
            <NavNavbarItem href={`/${accountBook.id}/balances/timeline`}>
              Timeline
            </NavNavbarItem>
          </NavbarSection>
        </div>
      </div>
      <Outlet />
    </>
  );
}
