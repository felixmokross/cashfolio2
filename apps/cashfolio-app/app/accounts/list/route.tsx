import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize, type Serialize } from "~/serialization";
import { getAccountGroupPath } from "~/utils";
import { getAccounts } from "../data";
import { getAccountGroups } from "~/account-groups/data";
import { getAccountsTree } from "~/account-groups/accounts-tree";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Page } from "./page";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);
  const [accounts, accountGroups] = await Promise.all([
    getAccounts(),
    getAccountGroups(),
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
