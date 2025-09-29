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

export function Page({ loaderData: { rootNode } }: { loaderData: LoaderData }) {
  return (
    <>
      <Heading>Income</Heading>
      <Text>Reference Currency: CHF</Text>

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
