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

export function Page({
  loaderData: { balanceSheet },
}: {
  loaderData: LoaderData;
}) {
  return (
    <>
      <Heading>Balances</Heading>
      <Text>Reference Currency: CHF</Text>
      <div className="grid grid-cols-2 gap-12 mt-8">
        <Table dense bleed striped>
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
          <Table bleed dense striped>
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
          <Table dense bleed grid striped>
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
