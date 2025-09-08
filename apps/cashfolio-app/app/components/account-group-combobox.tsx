import type { ComponentPropsWithoutRef } from "react";
import {
  Combobox,
  ComboboxLabel,
  ComboboxOption,
} from "~/platform/forms/combobox";
import type { AccountGroupOption } from "~/types";

export function AccountGroupCombobox({
  accountGroups,
  ...props
}: Omit<
  ComponentPropsWithoutRef<typeof Combobox<string>>,
  "displayValue" | "options" | "children"
> & {
  accountGroups: AccountGroupOption[];
}) {
  function getDisplayValue(accountGroupId: string) {
    const accountGroup = accountGroups.find((a) => a.id === accountGroupId);
    return accountGroup?.path ?? "";
  }

  return (
    <Combobox
      {...props}
      displayValue={(accountGroupId) =>
        accountGroupId ? getDisplayValue(accountGroupId) : ""
      }
      options={accountGroups.map((g) => g.id)}
    >
      {(accountGroupId) => (
        <ComboboxOption value={accountGroupId}>
          <ComboboxLabel>{getDisplayValue(accountGroupId)}</ComboboxLabel>
        </ComboboxOption>
      )}
    </Combobox>
  );
}
