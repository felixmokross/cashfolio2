import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize, type Serialize } from "~/serialization";
import { getAccountGroupPath } from "~/utils";
import { getAccounts } from "../data";
import { getAccountGroups } from "~/account-groups/data";
import { getAccountsTree } from "~/account-groups/accounts-tree";
import { Page } from "./page";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(link.accountBookId),
    getAccountGroups(link.accountBookId),
  ]);
  const accountGroupsWithPath = accountGroups.map((ag) => ({
    ...ag,
    path: getAccountGroupPath(ag.id, accountGroups),
  }));
  const tree = getAccountsTree(accounts, accountGroupsWithPath);
  return serialize({ tree, accounts, accountGroups: accountGroupsWithPath });
}

export type LoaderData = Serialize<Awaited<ReturnType<typeof loader>>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();

  return <Page loaderData={loaderData} />;
}
