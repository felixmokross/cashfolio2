import type { AccountGroup } from "@prisma/client";
import type { ComponentPropsWithoutRef } from "react";
import {
  Combobox,
  ComboboxLabel,
  ComboboxOption,
} from "~/platform/forms/combobox";
import type { AccountOption } from "~/types";

export function AccountCombobox({
  accounts,
  accountGroups,
  ...props
}: Omit<
  ComponentPropsWithoutRef<typeof Combobox<string>>,
  "displayValue" | "options" | "children"
> & {
  accounts: AccountOption[];
  accountGroups: AccountGroup[];
}) {
  function getDisplayValue(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    return account?.path ?? "";
  }

  return (
    <Combobox
      {...props}
      displayValue={(accountId) =>
        accountId ? getDisplayValue(accountId) : ""
      }
      options={accounts.map((a) => a.id)}
    >
      {(accountId) => (
        <ComboboxOption value={accountId}>
          <ComboboxLabel>{getDisplayValue(accountId)}</ComboboxLabel>
        </ComboboxOption>
      )}
    </Combobox>
  );
}
