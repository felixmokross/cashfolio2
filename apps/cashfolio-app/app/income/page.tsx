import { Heading } from "~/platform/heading";
import { Text } from "~/platform/text";
import { useAccountBook } from "~/account-books/hooks";
import { NavbarSection, NavNavbarItem } from "~/platform/navbar";
import { Outlet } from "react-router";
import type { LoaderData } from "./route";

export function Page({ loaderData }: { loaderData: LoaderData }) {
  const accountBook = useAccountBook();
  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <Heading>Income / {loaderData.rootNode.name}</Heading>
          <Text>Reference Currency: {accountBook.referenceCurrency}</Text>
        </div>
        <div className="grow-0">
          <NavbarSection className="-mx-2">
            <NavNavbarItem href={`/${accountBook.id}/income/table`}>
              Table
            </NavNavbarItem>
            <NavNavbarItem href={`/${accountBook.id}/income/chart`}>
              Chart
            </NavNavbarItem>
            <NavNavbarItem href={`/${accountBook.id}/income/average`}>
              Average
            </NavNavbarItem>
          </NavbarSection>
        </div>
      </div>

      <Outlet />
    </>
  );
}
