import { data, type ActionFunctionArgs } from "react-router";
import { getFormValues, hasErrors, validate } from "./shared";
import { prisma } from "~/prisma.server";
import { ensureAuthorizedForUserAndAccountBookId } from "../functions.server";
import { ensureUser } from "~/users/functions.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await ensureUser(request);

  const values = await getFormValues(request);
  const errors = validate(values);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  const link = await ensureAuthorizedForUserAndAccountBookId(user, values.id!);

  await prisma.accountBook.update({
    where: { id: link.accountBookId },
    data: {
      name: values.name,
      referenceCurrency: values.referenceCurrency,
      securityHoldingGainLossAccountGroupId:
        values.securityHoldingGainLossAccountGroupId ?? null,
      cryptoHoldingGainLossAccountGroupId:
        values.cryptoHoldingGainLossAccountGroupId ?? null,
      fxHoldingGainLossAccountGroupId:
        values.fxHoldingGainLossAccountGroupId ?? null,
    },
  });

  return { success: true };
}
