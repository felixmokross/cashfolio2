import { Decimal } from "@prisma/client/runtime/library";
import { AccountType, Unit } from "~/.prisma-client/enums";
import { cryptocurrencies } from "~/cryptocurrencies";
import { currencies } from "~/currencies";

export async function getFormValues(request: Request) {
  const form = await request.formData();
  return {
    id: form.get("id")?.toString(),
    name: form.get("name")?.toString() ?? "",
    type: form.get("type")?.toString() ?? "",
    groupId: form.get("groupId")?.toString() ?? "",
    openingBalance: form.get("openingBalance")?.toString(),
    unit: form.get("unit")?.toString() ?? "",
    currency: form.get("currency")?.toString(),
    cryptocurrency: form.get("cryptocurrency")?.toString(),
    symbol: form.get("symbol")?.toString(),
    tradeCurrency: form.get("tradeCurrency")?.toString(),
  } as FormValues;
}

export function validate(values: FormValues) {
  const errors: FormErrors = {};

  if (!values.name) {
    errors.name = "Name is required";
  }
  if (!values.id) {
    if (!values.type) {
      errors.type = "Type is required";
    } else if (
      !Object.values(AccountType).includes(values.type as AccountType)
    ) {
      errors.type = "Invalid type";
    }
  }

  if (!values.groupId) {
    errors.groupId = "Group is required";
  }

  if (values.openingBalance) {
    try {
      new Decimal(values.openingBalance); // will throw if invalid
    } catch {
      errors.openingBalance = "Opening balance must be a valid number";
    }
  }

  if (!values.unit) {
    errors.unit = "Unit is required";
  } else if (!Object.values(Unit).includes(values.unit as Unit)) {
    errors.unit = "Invalid unit";
  }

  if (values.unit === Unit.CURRENCY) {
    if (!values.currency) {
      errors.currency = "Currency is required";
    } else if (!Object.keys(currencies).includes(values.currency)) {
      errors.currency = "Invalid currency";
    }
  }
  if (values.unit === Unit.CRYPTOCURRENCY) {
    if (!values.cryptocurrency) {
      errors.cryptocurrency = "Cryptocurrency is required";
    } else if (!Object.keys(cryptocurrencies).includes(values.cryptocurrency)) {
      errors.cryptocurrency = "Invalid cryptocurrency";
    }
  }
  if (values.unit === Unit.SECURITY) {
    if (!values.symbol) {
      errors.symbol = "Symbol is required";
    }

    if (!values.tradeCurrency) {
      errors.tradeCurrency = "Trade currency is required";
    } else if (!Object.keys(currencies).includes(values.tradeCurrency)) {
      errors.tradeCurrency = "Invalid trade currency";
    }
  }

  return errors;
}

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}

export type FormValues = {
  id?: string;
  name: string;
  type: string;
  groupId: string;
  openingBalance?: string;
  unit: string;
  currency?: string;
  cryptocurrency?: string;
  symbol?: string;
  tradeCurrency?: string;
};

export type FormErrors = { form?: string } & Partial<
  Record<keyof FormValues, string>
>;
