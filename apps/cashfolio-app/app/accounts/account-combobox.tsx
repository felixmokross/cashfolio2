import type { ComponentPropsWithoutRef } from "react";
import {
  Combobox,
  ComboboxDescription,
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
  function getLabel(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    return account?.name ?? "";
  }

  function getDescription(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    return account?.groupPath ?? "";
  }

  return (
    <Combobox
      {...props}
      displayValue={(accountId) =>
        accountId ? `${getLabel(accountId)} (${getDescription(accountId)})` : ""
      }
      options={accounts.map((a) => a.id)}
    >
      {(accountId) => (
        <ComboboxOption value={accountId}>
          <ComboboxLabel>{getLabel(accountId)}</ComboboxLabel>
          <ComboboxDescription>{getDescription(accountId)}</ComboboxDescription>
        </ComboboxOption>
      )}
    </Combobox>
  );
}
