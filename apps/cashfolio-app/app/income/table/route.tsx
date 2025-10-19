import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { IncomeTableRows } from "./table-rows";
import { formatMoney } from "~/formatting";
import { useRouteLoaderData } from "react-router";
import type { LoaderData as IncomeLoaderData } from "../route";

export default function Route() {
  const loaderData = useRouteLoaderData<IncomeLoaderData>("income/route");
  return (
    <Table
      dense
      bleed
      striped
      className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
    >
      <TableHead>
        <TableRow>
          <TableHeader>{loaderData!.rootNode.name}</TableHeader>
          <TableHeader className="text-right w-32">
            {formatMoney(loaderData!.rootNode.value)}
          </TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        <IncomeTableRows node={loaderData!.rootNode} />
      </TableBody>
    </Table>
  );
}
