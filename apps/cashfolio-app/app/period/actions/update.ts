import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { commitSession, getSession } from "~/sessions.server";
import type { Period, QuarterPeriod } from "../types";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();

  const granularity = form.get("granularity");
  const year = form.get("year");
  invariant(typeof granularity === "string", "granularity must be a string");
  invariant(typeof year === "string", "year must be a string");

  let period: Period;
  if (granularity === "month") {
    const month = form.get("month");
    invariant(typeof month === "string", "month must be a string");
    period = {
      granularity: "month",
      year: Number(year),
      month: Number(month),
    };
  } else if (granularity === "quarter") {
    const quarter = form.get("quarter");
    invariant(typeof quarter === "string", "quarter must be a string");
    period = {
      granularity: "quarter",
      year: Number(year),
      quarter: Number(quarter) as QuarterPeriod["quarter"],
    };
  } else if (granularity === "year") {
    period = {
      granularity: "year",
      year: Number(year),
    };
  } else {
    return data(
      {
        success: false,
        error: "Invalid granularity",
      },
      { status: 400 },
    );
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("period", period);

  return data(
    { success: true },
    { headers: { "Set-Cookie": await commitSession(session) } },
  );
}
