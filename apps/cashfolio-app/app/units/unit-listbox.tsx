import type { ComponentProps } from "react";
import { Unit } from "~/.prisma-client/enums";
import { Listbox, ListboxOption } from "~/platform/forms/listbox";

export function UnitListbox({
  ...props
}: Omit<ComponentProps<typeof Listbox<Unit>>, "children">) {
  return (
    <Listbox<Unit> {...props}>
      <ListboxOption value={Unit.CURRENCY}>Currency</ListboxOption>
      <ListboxOption value={Unit.CRYPTOCURRENCY}>Crypto</ListboxOption>
      <ListboxOption value={Unit.SECURITY}>Security</ListboxOption>
    </Listbox>
  );
}
