import {
  Outlet,
  redirect,
  useLoaderData,
  useMatch,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { AccountType } from "~/.prisma-client/enums";
import { ensureAuthorized } from "~/account-books/functions.server";
import { useAccountBook } from "~/account-books/hooks";
import {
  getAccountsTree,
  type AccountGroupNode,
} from "~/account-groups/accounts-tree";
import { getAccountGroups } from "~/account-groups/data";
import { getAccounts } from "~/accounts/functions.server";
import { Button } from "~/platform/button";
import { Select } from "~/platform/forms/select";
import { Heading } from "~/platform/heading";
import { ChevronUpIcon } from "~/platform/icons/standard";
import { NavbarSection, NavNavbarItem } from "~/platform/navbar";
import { Text } from "~/platform/text";
import { prisma } from "~/prisma.server";
import { defaultShouldRevalidate } from "~/revalidation";
import { serialize } from "~/serialization";
import { findSubtreeRootNode } from "./functions";
import invariant from "tiny-invariant";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);
  if (!params.nodeId) {
    const equityRootNode = await prisma.accountGroup.findFirstOrThrow({
      where: {
        accountBookId: link.accountBookId,
        type: AccountType.EQUITY,
        parentGroupId: null,
      },
    });
    throw redirect(`./${equityRootNode.id}`);
  }

  const [accountBook, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({
      where: { id: link.accountBookId },
    }),
    getAccountGroups(link.accountBookId),
  ]);

  const accounts = await getAccounts(accountBook, accountGroups);
  const equityRootNode = getAccountsTree(accounts, accountGroups).EQUITY;
  invariant(equityRootNode, "Equity root node not found");

  const netIncomeNode = { ...equityRootNode, name: "Net Income" };
  const node = findSubtreeRootNode(netIncomeNode, params.nodeId);
  if (!node) {
    throw new Response("Not Found", { status: 404 });
  }
  const parentAccountGroupId =
    node.nodeType === "accountGroup" ? node.parentGroupId : node.groupId;

  const parentNode = parentAccountGroupId
    ? (findSubtreeRootNode(
        netIncomeNode,
        parentAccountGroupId,
      ) as AccountGroupNode)
    : undefined;

  return serialize({
    node,
    parentNode,
    siblings: parentNode?.children ?? [node],
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export default function Route() {
  const accountBook = useAccountBook();
  const navigate = useNavigate();
  const { node, parentNode, siblings } = useLoaderData<typeof loader>();
  const match = useMatch("/:accountBookId/income/:nodeId/*");
  return (
    <>
      <div className="flex justify-between items-center gap-8">
        <div className="shrink-0">
          <Heading>Income</Heading>
          <Text>Reference Currency: {accountBook.referenceCurrency}</Text>
        </div>
        <div className="flex items-center gap-4 max-w-xl">
          {parentNode && (
            <Button
              hierarchy="secondary"
              href={`/${accountBook.id}/income/${parentNode.id}/${match?.params["*"]}`}
            >
              <ChevronUpIcon />
              Up
            </Button>
          )}
          <Select
            value={node.id}
            disabled={siblings.length <= 1}
            onChange={(e) => {
              navigate(
                `/${accountBook.id}/income/${e.target.value}/${match?.params["*"]}`,
              );
            }}
          >
            {siblings.map((sibling) => (
              <option key={sibling.id} value={sibling.id}>
                {sibling.name}
              </option>
            ))}
          </Select>
          {node.nodeType === "accountGroup" && (
            <Select
              value=""
              onChange={(e) => {
                navigate(
                  `/${accountBook.id}/income/${e.target.value}/${match?.params["*"]}`,
                );
              }}
            >
              <option value="" disabled>
                [Drill down…]
              </option>
              {node.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="grow-0">
          <NavbarSection className="-mx-2">
            <NavNavbarItem
              href={`/${accountBook.id}/income/${node.id}/breakdown`}
            >
              Breakdown
            </NavNavbarItem>
            <NavNavbarItem
              href={`/${accountBook.id}/income/${node.id}/timeline`}
            >
              Timeline
            </NavNavbarItem>
          </NavbarSection>
        </div>
      </div>
      <Outlet />
    </>
  );
}
