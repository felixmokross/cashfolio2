import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize, type Serialize } from "~/serialization";
import { getAccountGroupPath } from "~/utils";
import { getAccounts } from "../data";
import { getAccountGroups } from "~/account-groups/data";
import { getAccountsTree } from "~/account-groups/accounts-tree";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Page } from "./page";
import invariant from "tiny-invariant";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(params.accountBookId),
    getAccountGroups(params.accountBookId),
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
