import type { Serialize } from "~/serialization";
import { TableCell, TableRow } from "~/platform/table";
import clsx from "clsx";
import type { AccountsNode } from "./accounts-tree";
import type { Account } from "@prisma/client";
import type { ReactNode } from "react";
import { WalletIcon } from "~/platform/icons/standard";

export function AccountsNodeChildrenTableRows<TData = {}>({
  node,
  level = 0,
  children,
}: {
  node: Serialize<AccountsNode<Account, TData>>;
  level?: number;
  negated?: boolean;
  children?: (node: Serialize<AccountsNode<Account, TData>>) => ReactNode;
}) {
  if (node.nodeType === "account") {
    return null;
  }
  return node.children.map((child) => (
    <AccountsNodeTableRow
      key={child.id}
      node={child}
      level={level}
      children={children}
    />
  ));
}

export function AccountsNodeTableRow<TData = {}>({
  node,
  level,
  children,
}: {
  node: Serialize<AccountsNode<Account, TData>>;
  level: number;
  children?: (node: Serialize<AccountsNode<Account, TData>>) => ReactNode;
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
        {children?.(node)}
      </TableRow>

      <AccountsNodeChildrenTableRows
        node={node}
        level={level + 1}
        children={children}
      />
    </>
  );
}
