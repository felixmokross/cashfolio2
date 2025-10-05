import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize, type Serialize } from "~/serialization";
import { getAccountGroupsWithPath } from "~/account-groups/data";
import { getAccountsTree } from "~/account-groups/accounts-tree";
import { Page } from "./page";
import { ensureAuthorized } from "~/account-books/functions.server";
import { getAccounts } from "../data";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(link.accountBookId, { isActive: true }),
    getAccountGroupsWithPath(link.accountBookId, { isActive: true }),
  ]);

  const tree = getAccountsTree(accounts, accountGroups);
  return serialize({ tree, accounts, accountGroups });
}

export type LoaderData = Serialize<Awaited<ReturnType<typeof loader>>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();

  return <Page loaderData={loaderData} />;
}
