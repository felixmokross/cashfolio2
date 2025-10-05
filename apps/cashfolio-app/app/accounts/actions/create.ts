import { data, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { Unit, type AccountType } from "~/.prisma-client/enums";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const values = await getFormValues(request);
  const errors = validate(values);

  if (hasErrors(errors)) {
    return data({ success: false, errors });
  }

  await prisma.account.create({
    data: {
      name: values.name,
      groupId: values.groupId,
      type: values.type as AccountType,
      unit: values.unit as Unit,
      currency: values.unit === Unit.CURRENCY ? values.currency : null,
      cryptocurrency:
        values.unit === Unit.CRYPTOCURRENCY ? values.cryptocurrency : null,
      symbol: values.unit === Unit.SECURITY ? values.symbol : null,
      tradeCurrency:
        values.unit === Unit.SECURITY ? values.tradeCurrency : null,
      accountBookId: link.accountBookId,
      isActive: values.isActive,
    },
  });

  return data({ success: true });
}
