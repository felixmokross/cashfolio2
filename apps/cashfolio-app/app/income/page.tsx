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
import type { LoaderData } from "~/income/route";
import { IncomeTableRows } from "./table-rows";
import { useAccountBook } from "~/account-books/hooks";

export function Page({ loaderData: { rootNode } }: { loaderData: LoaderData }) {
  const accountBook = useAccountBook();
  return (
    <>
      <Heading>Income</Heading>
      <Text>Reference Currency: {accountBook.referenceCurrency}</Text>

      <Table
        dense
        bleed
        striped
        className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
      >
        <TableHead>
          <TableRow>
            <TableHeader>{rootNode.name}</TableHeader>
            <TableHeader className="text-right w-32">
              {formatMoney(rootNode.value)}
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <IncomeTableRows node={rootNode} />
        </TableBody>
      </Table>
    </>
  );
}
