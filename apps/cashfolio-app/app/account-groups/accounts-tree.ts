import {
  AccountType,
  type Account,
  type AccountGroup,
} from "~/.prisma-client/client";

export function getAccountsTree<TAccount extends Account = Account>(
  accounts: TAccount[],
  accountGroups: AccountGroup[],
): { [K in AccountType]?: AccountsNode<TAccount> } {
  const childrenByParentId: Record<string, AccountsNode<TAccount>[]> = {};
  for (const g of accountGroups) {
    if (!g.parentGroupId) continue;
    if (!childrenByParentId[g.parentGroupId]) {
      childrenByParentId[g.parentGroupId] = [];
    }
    childrenByParentId[g.parentGroupId].push({
      ...g,
      nodeType: "accountGroup",
      children: [],
    });
  }

  for (const a of accounts) {
    if (!childrenByParentId[a.groupId]) {
      childrenByParentId[a.groupId] = [];
    }
    childrenByParentId[a.groupId].push({
      ...a,
      nodeType: "account",
    });
  }

  function getRootNode(type: AccountType) {
    const rootGroup = accountGroups.find(
      (g) => !g.parentGroupId && g.type === type,
    );
    if (!rootGroup) return undefined;
    return getNodeWithChildren({
      ...rootGroup,
      nodeType: "accountGroup",
      children: [],
    });
  }

  function getNodeWithChildren(node: AccountsNode): AccountsNode {
    return node.nodeType === "account"
      ? node
      : {
          ...node,
          children: childrenByParentId[node.id]
            ? childrenByParentId[node.id].map(getNodeWithChildren)
            : [],
        };
  }

  return {
    ASSET: getRootNode(AccountType.ASSET),
    LIABILITY: getRootNode(AccountType.LIABILITY),
    EQUITY: getRootNode(AccountType.EQUITY),
  };
}

export type AccountsNode<TAccount extends Account = Account, TData = {}> =
  | AccountGroupNode<TAccount, TData>
  | AccountNode<TAccount, TData>;

export type AccountGroupNode<
  TAccount extends Account = Account,
  TData = {},
> = TData &
  AccountGroup & {
    nodeType: "accountGroup";
    children: AccountsNode<TAccount, TData>[];
  };

export type AccountNode<
  TAccount extends Account = Account,
  TData = {},
> = TData &
  TAccount & {
    nodeType: "account";
  };
