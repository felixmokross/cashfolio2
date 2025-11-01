import { Outlet } from "react-router";
import { useAccountBook } from "~/account-books/hooks";
import { Heading } from "~/platform/heading";
import { NavbarSection, NavNavbarItem } from "~/platform/navbar";
import { Text } from "~/platform/text";

export default function Route() {
  const accountBook = useAccountBook();
  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <Heading>Profit/Loss</Heading>
          <Text>Reference Currency: {accountBook.referenceCurrency}</Text>
        </div>
        <div className="grow-0">
          <NavbarSection className="-mx-2">
            <NavNavbarItem href={`/${accountBook.id}/income/breakdown`}>
              Breakdown
            </NavNavbarItem>
            <NavNavbarItem href={`/${accountBook.id}/income/timeline`}>
              Timeline
            </NavNavbarItem>
          </NavbarSection>
        </div>
      </div>
      <Outlet />
    </>
  );
}
