import { AccountType, Unit } from "~/.prisma-client/client";
import { data } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { ensureAuthenticated } from "~/auth/functions.server";

export async function action({ request }: { request: Request }) {
  await ensureAuthenticated(request);

  const values = await getFormValues(request);
  const errors = validate(values);

  if (hasErrors(errors)) {
    return data({ success: false, errors });
  }

  await prisma.account.create({
    data: {
      name: values.name,
      slug: slugify(values.name, { lower: true }),
      groupId: values.groupId,
      type: values.type as AccountType,
      unit: values.unit as Unit,
      currency: values.unit === Unit.CURRENCY ? values.currency : null,
      cryptocurrency:
        values.unit === Unit.CRYPTOCURRENCY ? values.cryptocurrency : null,
      symbol: values.unit === Unit.SECURITY ? values.symbol : null,
      tradeCurrency:
        values.unit === Unit.SECURITY ? values.tradeCurrency : null,
    },
  });

  return data({ success: true });
}
