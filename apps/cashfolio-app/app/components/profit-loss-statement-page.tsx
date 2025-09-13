import { formatMoney } from "~/formatting";
import { Heading } from "~/platform/heading";
import { Text } from "~/platform/text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import type {
  LoaderData,
  ProfitLossAccountsNode,
} from "~/routes/profit-loss-statement";
import type { Serialize } from "~/serialization";
import clsx from "clsx";
import { WalletIcon } from "@heroicons/react/20/solid";

export function ProfitLossStatementPage({
  loaderData: { rootNode },
}: {
  loaderData: LoaderData;
}) {
  return (
    <>
      <Heading>Profit/Loss</Heading>
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
          <AccountsNodeChildrenTableRows node={rootNode} />
        </TableBody>
      </Table>
    </>
  );
}

function AccountsNodeChildrenTableRows({
  node,
  level = 0,
}: {
  node: Serialize<ProfitLossAccountsNode>;
  level?: number;
  negated?: boolean;
}) {
  return node.children.map((child) => (
    <AccountsNodeTableRow key={child.id} node={child} level={level} />
  ));
}

function AccountsNodeTableRow({
  node,
  level,
}: {
  node: Serialize<ProfitLossAccountsNode>;
  level: number;
}) {
  return (
    <>
      <TableRow
        {...(node.nodeType === "account"
          ? { href: `/accounts/${node.id}` }
          : {})}
      >
        <TableCell>
          <span
            className={clsx({
              "pl-0": level === 0,
              "pl-4": level === 1,
              "pl-8": level === 2,
              "pl-12": level === 3,
              "pl-16": level === 4,
              "pl-20": level === 5,
              "pl-24": level === 6,
              "pl-28": level === 7,
              "pl-32": level === 8,
              "pl-36": level === 9,
              "pl-40": level === 10,
            })}
          >
            {node.nodeType === "account" ? (
              <span className="inline-flex gap-2 items-center">
                <WalletIcon className="size-4" />
                {node.name}
              </span>
            ) : (
              node.name
            )}
          </span>
        </TableCell>
        <TableCell className="text-right">{formatMoney(node.value)}</TableCell>
      </TableRow>
      <AccountsNodeChildrenTableRows node={node} level={level + 1} />
    </>
  );
}
