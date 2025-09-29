import { getMonth, getYear, subDays } from "date-fns";
import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { firstDate } from "~/config";
import { today } from "~/dates";
import { formatISODate } from "~/formatting";
import { commitSession, getSession } from "~/sessions.server";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();

  const granularity = form.get("granularity");
  const year = form.get("year");
  invariant(typeof granularity === "string", "granularity must be a string");
  invariant(typeof year === "string", "year must be a string");

  let fromDate: Date;
  let toDate: Date;
  if (granularity === "month") {
    const month = form.get("month");
    invariant(typeof month === "string", "month must be a string");

    fromDate = new Date(Date.UTC(Number(year), Number(month), 1));
    toDate =
      Number(year) === getYear(today()) && Number(month) === getMonth(today())
        ? subDays(today(), 1)
        : new Date(Date.UTC(Number(year), Number(month) + 1, 0)); // last day of selected month
  } else if (granularity === "year") {
    fromDate = new Date(
      Date.UTC(
        Number(year),
        Number(year) === getYear(firstDate) ? getMonth(firstDate) : 0,
        1,
      ),
    );
    toDate =
      Number(year) === getYear(today())
        ? subDays(today(), 1)
        : new Date(Date.UTC(Number(year), 11, 31));
  } else {
    return data(
      { success: false, error: "Invalid granularity" },
      { status: 400 },
    );
  }
  console.log(fromDate, toDate);

  const session = await getSession(request.headers.get("Cookie"));
  session.set("from", formatISODate(fromDate));
  session.set("to", formatISODate(toDate));

  return data(
    {
      success: true,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    },
  );
}
