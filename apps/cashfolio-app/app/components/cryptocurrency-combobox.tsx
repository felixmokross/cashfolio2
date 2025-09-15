import type { ComponentPropsWithoutRef } from "react";
import { cryptocurrencies } from "~/cryptocurrencies";
import {
  Combobox,
  ComboboxOption,
  ComboboxLabel,
} from "~/platform/forms/combobox";

export function CryptocurrencyCombobox(
  props: Omit<
    ComponentPropsWithoutRef<typeof Combobox<string>>,
    "displayValue" | "options" | "children"
  > & {},
) {
  return (
    <Combobox<string>
      displayValue={(o) => o ?? ""}
      options={Object.keys(cryptocurrencies)}
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
