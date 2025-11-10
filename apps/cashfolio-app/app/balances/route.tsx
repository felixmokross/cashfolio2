import { Outlet } from "react-router";
import { getPageTitle } from "~/meta";
import type { Route } from "./+types/route";
import { Heading } from "~/platform/heading";
import { Text } from "~/platform/text";
import { useAccountBook } from "~/account-books/hooks";
import { NavbarSection, NavNavbarItem } from "~/platform/navbar";
import { saveViewPreference, viewKey } from "~/view-preferences/functions";

export const meta: Route.MetaFunction = () => [
  { title: getPageTitle("Balances") },
];

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
            <NavNavbarItem
              href={`/${accountBook.id}/balances/breakdown`}
              onClick={() =>
                saveViewPreference(viewKey(accountBook.id), "breakdown")
              }
            >
              Breakdown
            </NavNavbarItem>
            <NavNavbarItem
              href={`/${accountBook.id}/balances/timeline`}
              onClick={() =>
                saveViewPreference(viewKey(accountBook.id), "timeline")
              }
            >
              Timeline
            </NavNavbarItem>
          </NavbarSection>
        </div>
      </div>
      <Outlet />
    </>
  );
}
