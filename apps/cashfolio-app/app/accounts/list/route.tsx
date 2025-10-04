import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize, type Serialize } from "~/serialization";
import { getAccountGroupPath } from "~/utils";
import { getAccounts } from "../data";
import { getAccountGroups } from "~/account-groups/data";
import { getAccountsTree } from "~/account-groups/accounts-tree";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Page } from "./page";
import invariant from "tiny-invariant";
import { prisma } from "~/prisma.server";
import { getUserOrThrow } from "~/users/data";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userContext = await ensureAuthenticated(request);
  const user = await getUserOrThrow(userContext);
  invariant(params.accountBookId, "accountBookId not found");

  const userAccountBookLink = await prisma.userAccountBookLink.findUnique({
    where: {
      userId_accountBookId: {
        userId: user.id,
        accountBookId: params.accountBookId,
      },
    },
  });

  if (!userAccountBookLink) {
    return new Response(null, { status: 404 });
  }

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(userAccountBookLink.accountBookId),
    getAccountGroups(userAccountBookLink.accountBookId),
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
