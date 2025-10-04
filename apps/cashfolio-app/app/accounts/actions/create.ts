import { data, type ActionFunctionArgs } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Unit, type AccountType } from "~/.prisma-client/enums";
import invariant from "tiny-invariant";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

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
      accountBookId: params.accountBookId,
    },
  });

  return data({ success: true });
}
