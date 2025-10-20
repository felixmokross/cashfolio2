import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize, type Serialize } from "~/serialization";
import { getAccountGroupsWithPath } from "~/account-groups/data";
import { getAccountsTree } from "~/account-groups/accounts-tree";
import { Page } from "./page";
import { ensureAuthorized } from "~/account-books/functions.server";
import { getAccounts } from "../functions.server";
import { prisma } from "~/prisma.server";
import type { Route } from "./+types/route";
import { getPageTitle } from "~/meta";

export const meta: Route.MetaFunction = () => [
  { title: getPageTitle("Accounts") },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const showInactive =
    new URL(request.url).searchParams.get("showInactive") === "true";

  const queryFilter = showInactive ? undefined : { isActive: true };

  const [accountBook, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({ where: { id: link.accountBookId } }),
    getAccountGroupsWithPath(link.accountBookId, queryFilter),
  ]);

  const accounts = await getAccounts(accountBook, accountGroups, queryFilter);

  const tree = getAccountsTree(accounts, accountGroups);
  return serialize({ tree, accounts, accountGroups });
}

export type LoaderData = Serialize<Awaited<ReturnType<typeof loader>>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();

  return <Page loaderData={loaderData} />;
}
