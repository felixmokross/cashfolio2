import type { ComponentPropsWithoutRef } from "react";
import {
  Combobox,
  ComboboxOption,
  ComboboxLabel,
} from "~/platform/forms/combobox";

export function CurrencyCombobox(
  props: Omit<
    ComponentPropsWithoutRef<typeof Combobox<string>>,
    "displayValue" | "options" | "children"
  > & {},
) {
  return (
    <Combobox<string>
      displayValue={(o) => o ?? ""}
      options={["CHF", "EUR", "USD", "GBP", "JPY", "AUD", "CAD", "CNY", "INR"]}
      {...props}
    >
      {(option) => (
        <ComboboxOption value={option}>
          <ComboboxLabel>{option}</ComboboxLabel>
        </ComboboxOption>
      )}
    </Combobox>
  );
}
