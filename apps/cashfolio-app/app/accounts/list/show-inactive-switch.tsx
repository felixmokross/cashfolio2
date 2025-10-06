import { useSearchParams } from "react-router";
import { Switch } from "~/platform/forms/switch";
import * as Headless from "@headlessui/react";
import { Label } from "~/platform/forms/fieldset";

export function ShowInactiveSwitch() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Headless.Field className="flex items-center gap-4">
      <Switch
        name="showInactive"
        onChange={(value) => {
          setSearchParams((params) => {
            if (value) {
              params.set("showInactive", "true");
            } else {
              params.delete("showInactive");
            }
            return params;
          });
        }}
        checked={searchParams.get("showInactive") === "true"}
        variant="destructive"
      />
      <Label>Show Inactive</Label>
    </Headless.Field>
  );
}
