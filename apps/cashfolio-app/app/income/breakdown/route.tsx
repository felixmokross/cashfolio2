import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/breakdown/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getPeriodDateRangeFromPeriod } from "~/period/functions.server";
import { ensureAuthorized } from "~/account-books/functions.server";
import type { IncomeAccountsNode } from "../types";
import { defaultShouldRevalidate } from "~/revalidation";
import { findSubtreeRootNode } from "../functions";
import type { Route } from "./+types/route";
import type { AccountGroupNode } from "~/types";
import { getMonth, getQuarter, getYear } from "date-fns";
import { today } from "~/dates";
import type { Period } from "~/period/types";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  if (!params.periodOrPeriodSpecifier) {
    return redirect("./mtd");
  }

  const yearPeriodResult = /^[\d]{4}$/.exec(params.periodOrPeriodSpecifier);
  const quarterPeriodResult = /^([\d]{4})-?q([1-4])$/i.exec(
    params.periodOrPeriodSpecifier,
  );
  const monthPeriodResult = /^([\d]{4})-?([\d]{1,2})$/.exec(
    params.periodOrPeriodSpecifier,
  );

  const {
    _min: { date: minBookingDate },
  } = await prisma.booking.aggregate({
    _min: { date: true },
    where: { accountBookId: link.accountBookId },
  });
  if (!minBookingDate) {
    throw new Error("No bookings found");
  }

  const periodSpecifier = yearPeriodResult
    ? "year"
    : quarterPeriodResult
      ? "quarter"
      : monthPeriodResult
        ? "month"
        : params.periodOrPeriodSpecifier;

  const period: Period | undefined =
    periodSpecifier === "year"
      ? { granularity: "year", year: Number(yearPeriodResult![0]) }
      : periodSpecifier === "quarter"
        ? {
            granularity: "quarter",
            year: Number(quarterPeriodResult![1]),
            quarter: Number(quarterPeriodResult![2]),
          }
        : periodSpecifier === "month"
          ? {
              granularity: "month",
              year: Number(monthPeriodResult![1]),
              month: Number(monthPeriodResult![2]) - 1,
            }
          : periodSpecifier === "mtd"
            ? {
                granularity: "month",
                year: getYear(today()),
                month: getMonth(today()),
              }
            : periodSpecifier === "last-month"
              ? {
                  granularity: "month",
                  year: getYear(today()),
                  month: getMonth(today()) - 1,
                }
              : periodSpecifier === "qtd"
                ? {
                    granularity: "quarter",
                    year: getYear(today()),
                    quarter: getQuarter(today()),
                  }
                : periodSpecifier === "last-quarter"
                  ? {
                      granularity: "quarter",
                      year: getYear(today()),
                      quarter: getQuarter(today()) - 1,
                    }
                  : periodSpecifier === "ytd"
                    ? {
                        granularity: "year",
                        year: getYear(today()),
                      }
                    : periodSpecifier === "last-year"
                      ? {
                          granularity: "year",
                          year: getYear(today()) - 1,
                        }
                      : undefined;
  if (!period) {
    throw new Response("Not Found", { status: 404 });
  }

  const { from, to } = await getPeriodDateRangeFromPeriod(
    period,
    link.accountBookId,
  );

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
          where: { date: { gte: from, lte: to } },
        },
      },
    }),
    getAccountGroups(link.accountBookId),
  ]);

  const incomeStatementTree = await getIncomeStatement(
    accountBook,
    accounts,
    accountGroups,
    from,
    to,
  );

  let rootNode: IncomeAccountsNode;
  if (params.nodeId) {
    const subtreeRootNode = findSubtreeRootNode(
      incomeStatementTree,
      params.nodeId,
    );
    if (!subtreeRootNode) {
      throw new Response("Not Found", { status: 404 });
    }
    rootNode = subtreeRootNode as IncomeAccountsNode & AccountGroupNode;
  } else {
    rootNode = incomeStatementTree;
  }

  return serialize({
    rootNode,
    period,
    periodSpecifier,
    minBookingDate,
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<typeof loader>();
  return <Page loaderData={loaderData} />;
}
