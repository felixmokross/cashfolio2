import { formatMoney } from "~/formatting";
import { Heading } from "~/platform/heading";
import { Text } from "~/platform/text";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import type { LoaderData } from "~/balances/route";
import { BalancesTableRows } from "./table-rows";
import { useAccountBook } from "~/account-books/hooks";

export function Page({
  loaderData: { balanceSheet },
}: {
  loaderData: LoaderData;
}) {
  const accountBook = useAccountBook();
  return (
    <>
      <Heading>Balances</Heading>
      <Text>Reference Currency: {accountBook.referenceCurrency}</Text>

      <div className="xl:grid grid-cols-2 gap-12 mt-8">
        <Table dense bleed striped fixedLayout>
          <TableHead>
            <TableRow>
              <TableHeader>{balanceSheet.assets.name}</TableHeader>
              <TableHeader className="text-right w-32">
                <span className="sr-only">Balance in Original Currency</span>
              </TableHeader>
              <TableHeader className="text-right w-32">
                {formatMoney(balanceSheet.assets.balance)}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <BalancesTableRows node={balanceSheet.assets} />
          </TableBody>
        </Table>
        <div className="space-y-12">
          <Table bleed dense striped fixedLayout>
            <TableHead>
              <TableRow>
                <TableHeader>{balanceSheet.liabilities.name}</TableHeader>
                <TableHeader className="text-right w-32">
                  <span className="sr-only">Balance in Original Currency</span>
                </TableHeader>
                <TableHeader className="text-right w-32">
                  {formatMoney(-balanceSheet.liabilities.balance)}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <BalancesTableRows
                node={balanceSheet.liabilities}
                negated={true}
              />
            </TableBody>
          </Table>
          <Table dense bleed striped fixedLayout>
            <TableBody>
              <TableRow>
                <TableHeader>Equity</TableHeader>
                <TableHeader className="text-right">
                  {formatMoney(balanceSheet.equity)}
                </TableHeader>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
