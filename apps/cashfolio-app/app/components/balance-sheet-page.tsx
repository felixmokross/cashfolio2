import { WalletIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { formatMoney } from "~/formatting";
import { Heading } from "~/platform/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import type { loader } from "~/routes/balance-sheet";
import type { Serialize } from "~/serialization";
import type { AccountsNode } from "~/types";

type LoaderData = Awaited<ReturnType<typeof loader>>;

export function BalanceSheetPage({
  loaderData: { balanceSheet },
}: {
  loaderData: LoaderData;
}) {
  return (
    <>
      <Heading>Balances</Heading>
      <div className="grid grid-cols-2 gap-12 mt-8">
        <Table dense bleed striped>
          <TableHead>
            <TableRow>
              <TableHeader>{balanceSheet.assets.name}</TableHeader>
              <TableHeader align="right" className="w-32">
                {formatMoney(balanceSheet.assets.balance)}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <AccountsNodeChildrenTableRows node={balanceSheet.assets} />
          </TableBody>
        </Table>
        <div className="space-y-12">
          <Table bleed dense striped>
            <TableHead>
              <TableRow>
                <TableHeader>{balanceSheet.liabilities.name}</TableHeader>
                <TableHeader align="right" className="w-32">
                  {formatMoney(-balanceSheet.liabilities.balance)}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <AccountsNodeChildrenTableRows
                node={balanceSheet.liabilities}
                negated={true}
              />
            </TableBody>
          </Table>
          <Table dense bleed grid striped>
            <TableHead>
              <TableRow>
                <TableHeader>Net Worth</TableHeader>
                <TableHeader align="right">
                  {formatMoney(balanceSheet.netWorth)}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Opening Balance</TableCell>
                <TableCell align="right">
                  {formatMoney(balanceSheet.openingBalance)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Profit/Loss</TableCell>
                <TableCell align="right">
                  {formatMoney(balanceSheet.profitAndLoss)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

function AccountsNodeChildrenTableRows({
  node,
  level = 0,
  negated,
}: {
  node: Serialize<AccountsNode>;
  level?: number;
  negated?: boolean;
}) {
  return node.children.map((child) => (
    <AccountsNodeTableRow
      key={child.id}
      node={child}
      level={level}
      negated={negated}
    />
  ));
}

function AccountsNodeTableRow({
  node,
  level,
  negated,
}: {
  node: Serialize<AccountsNode>;
  level: number;
  negated?: boolean;
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
        <TableCell align="right">
          {formatMoney(negated ? -node.balance : node.balance)}
        </TableCell>
      </TableRow>
      <AccountsNodeChildrenTableRows node={node} level={level + 1} />
    </>
  );
}
