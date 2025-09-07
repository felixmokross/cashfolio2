import type { ComponentPropsWithoutRef } from "react";
import {
  Combobox,
  ComboboxLabel,
  ComboboxOption,
} from "~/platform/forms/combobox";
import type { AccountOption } from "~/types";

export function AccountCombobox({
  accounts,
  ...props
}: Omit<
  ComponentPropsWithoutRef<typeof Combobox<string>>,
  "displayValue" | "options" | "children"
> & {
  accounts: AccountOption[];
}) {
  return (
    <Combobox
      {...props}
      displayValue={(accountId) =>
        accounts.find((a) => a.id === accountId)?.name ?? ""
      }
      options={accounts.map((a) => a.id)}
    >
      {(accountId) => (
        <ComboboxOption value={accountId}>
          <ComboboxLabel>
            {accounts.find((a) => a.id === accountId)?.name}
          </ComboboxLabel>
        </ComboboxOption>
      )}
    </Combobox>
  );
}
