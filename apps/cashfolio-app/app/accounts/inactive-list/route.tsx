import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";
import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";
import { serialize, type Serialize } from "~/serialization";
import { Page } from "./page";
import { getAccountGroupsWithPath } from "~/account-groups/data";
import { getAccounts } from "../data";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(link.accountBookId, { isActive: false }),
    getAccountGroupsWithPath(link.accountBookId),
  ]);

  const tree = filterAccountsTree(getAccountsTree(accounts, accountGroups));
  return serialize({ tree, accounts, accountGroups });
}

function filterAccountsTree(tree: ReturnType<typeof getAccountsTree>) {
  return Object.fromEntries(
    Object.entries(tree)
      .filter(([, node]) => hasInactive(node))
      .map(([key, node]) => [
        key,
        {
          ...node,
          children: node.children.filter((c) => hasInactive(c)),
        },
      ]),
  );
}

function hasInactive(node: AccountsNode): boolean {
  return (
    node.isActive === false ||
    (node.nodeType === "accountGroup" &&
      node.children.some((c) => hasInactive(c)))
  );
}

export type LoaderData = Serialize<Awaited<ReturnType<typeof loader>>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();

  return <Page loaderData={loaderData} />;
}
