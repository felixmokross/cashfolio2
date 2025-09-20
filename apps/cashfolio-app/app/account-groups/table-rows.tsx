import type { Serialize } from "~/serialization";
import { TableCell, TableRow } from "~/platform/table";
import clsx from "clsx";
import type { AccountsNode } from "./accounts-tree";
import type { Account } from "@prisma/client";
import { useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  WalletIcon,
} from "~/platform/icons/standard";

export function AccountsNodeChildrenTableRows<TData = {}>({
  node,
  level = 0,
  children,
  viewPrefix,
}: {
  node: Serialize<AccountsNode<Account, TData>>;
  level?: number;
  negated?: boolean;
  children?: (node: Serialize<AccountsNode<Account, TData>>) => ReactNode;
  viewPrefix: string;
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
      viewPrefix={viewPrefix}
    />
  ));
}

export function AccountsNodeTableRow<TData = {}>({
  node,
  level,
  children,
  viewPrefix,
}: {
  node: Serialize<AccountsNode<Account, TData>>;
  level: number;
  children?: (node: Serialize<AccountsNode<Account, TData>>) => ReactNode;
  viewPrefix: string;
}) {
  const expandedStateKey = `${viewPrefix}-account-group-${node.id}-expanded`;
  const [isExpanded, setIsExpanded] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(expandedStateKey) === "true",
  );

  const ExpandCollapseIcon = isExpanded ? ChevronDownIcon : ChevronRightIcon;

  function toggleExpanded() {
    const newValue = !isExpanded;
    sessionStorage.setItem(expandedStateKey, newValue ? "true" : "false");
    setIsExpanded(newValue);
  }
  return (
    <>
      <TableRow
        {...(node.nodeType === "account"
          ? { href: `/accounts/${node.id}` }
          : {})}
      >
        <TableCell>
          <div
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
            <div className="flex gap-2 items-center">
              {node.nodeType === "account" ? (
                <WalletIcon className="size-4 shrink-0" />
              ) : (
                <ExpandCollapseIcon
                  className="size-4 shrink-0"
                  onClick={() => toggleExpanded()}
                />
              )}
              <span className="truncate">{node.name}</span>
            </div>
          </div>
        </TableCell>
        {children?.(node)}
      </TableRow>

      {isExpanded && (
        <AccountsNodeChildrenTableRows
          node={node}
          level={level + 1}
          children={children}
          viewPrefix={viewPrefix}
        />
      )}
    </>
  );
}
