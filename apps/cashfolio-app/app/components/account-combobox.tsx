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
  ComponentPropsWithoutRef<typeof Combobox<AccountOption>>,
  "displayValue" | "options" | "children"
> & {
  accounts: AccountOption[];
}) {
  return (
    <Combobox
      {...props}
      displayValue={(a) => a?.name ?? ""}
      placeholder="Account"
      options={accounts}
    >
      {(account) => (
        <ComboboxOption value={account}>
          <ComboboxLabel>{account.name}</ComboboxLabel>
        </ComboboxOption>
      )}
    </Combobox>
  );
}
