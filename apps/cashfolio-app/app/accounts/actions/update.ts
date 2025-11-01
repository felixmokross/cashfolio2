import { data, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { EquityAccountSubtype, Unit } from "~/.prisma-client/enums";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const values = await getFormValues(request);
  const errors = validate(values);

  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.account.update({
    where: {
      id_accountBookId: { id: values.id!, accountBookId: link.accountBookId },
    },
    data: {
      name: values.name,
      groupId: values.groupId,
      equityAccountSubtype:
        (values.equityAccountSubtype as EquityAccountSubtype) || null,
      unit: values.unit as Unit,
      currency: values.unit === Unit.CURRENCY ? values.currency : null,
      cryptocurrency:
        values.unit === Unit.CRYPTOCURRENCY ? values.cryptocurrency : null,
      symbol: values.unit === Unit.SECURITY ? values.symbol : null,
      tradeCurrency:
        values.unit === Unit.SECURITY ? values.tradeCurrency : null,
      isActive: values.isActive,
    },
  });

  return data({ success: true });
}
