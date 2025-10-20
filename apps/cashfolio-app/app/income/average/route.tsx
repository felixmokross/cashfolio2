import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";
import { getPeriodDateRange } from "~/period/functions";
import { isSameDay, lastDayOfMonth, subDays, subMonths } from "date-fns";
import { startOfMonthUtc, today } from "~/dates";
import { serialize } from "~/serialization";
import { formatMoney } from "~/formatting";
import { prisma } from "~/prisma.server";
import { getAccountGroups } from "~/account-groups/data";
import { getIncomeStatement } from "../calculation.server";
import invariant from "tiny-invariant";
import type { AccountsNode } from "~/account-groups/accounts-tree";
import { Link } from "~/platform/link";
import { useAccountBook } from "~/account-books/hooks";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);
  const period = await getPeriodDateRange(request, link.accountBookId);

  const yesterday = subDays(today(), 1);
  const averageTo = isSameDay(yesterday, period.to)
    ? lastDayOfMonth(subMonths(yesterday, 1))
    : period.to;

  const numberOfMonths = 24;
  const averageFrom = startOfMonthUtc(subMonths(averageTo, numberOfMonths - 1));

  const [accountBook, accounts, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({
      where: { id: link.accountBookId },
    }),
    prisma.account.findMany({
      where: { accountBookId: link.accountBookId },
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { date: "asc" },
          where: { date: { gte: averageFrom, lte: averageTo } },
        },
      },
    }),
    getAccountGroups(link.accountBookId),
  ]);

  const incomeStatement = await getIncomeStatement(
    accountBook,
    accounts,
    accountGroups,
    averageFrom,
    averageTo,
  );

  return serialize({
    numberOfMonths,
    averageFrom,
    averageTo,
    incomeStatement: params.nodeId
      ? findSubtreeRootNode(incomeStatement, params.nodeId)!
      : incomeStatement,
  });
}

export default function Route() {
  const accountBook = useAccountBook();
  const loaderData = useLoaderData<typeof loader>();
  invariant(
    loaderData.incomeStatement.nodeType === "accountGroup",
    "Root node must be an account group",
  );
  return (
    <table>
      {loaderData.incomeStatement.children.map((child) => (
        <tr key={child.id}>
          <th>
            <Link href={`/${accountBook.id}/income/average/${child.id}`}>
              {child.name}
            </Link>
          </th>
          <td className="text-right">
            {formatMoney(child.value / loaderData.numberOfMonths)}
          </td>
        </tr>
      ))}
    </table>
  );
}

function findSubtreeRootNode<T extends AccountsNode>(
  node: T,
  nodeId: string,
): T | undefined {
  if (node.id === nodeId) {
    return node;
  }

  if (node.nodeType === "accountGroup") {
    for (const child of node.children) {
      const result = findSubtreeRootNode(child as T, nodeId);
      if (result) {
        return result;
      }
    }
  }
}
