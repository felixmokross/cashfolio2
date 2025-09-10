import type { AccountGroup, AccountType } from "@prisma/client";
import { useState } from "react";
import { Form } from "react-router";
import { Button } from "~/platform/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "~/platform/dialog";
import { Field, FieldGroup, Label } from "~/platform/forms/fieldset";
import { Input } from "~/platform/forms/input";
import { Radio, RadioField, RadioGroup } from "~/platform/forms/radio";
import type { Serialize } from "~/serialization";
import { AccountGroupCombobox } from "./account-group-combobox";
import type { AccountGroupOption } from "~/types";

export function useEditAccountGroup({
  accountGroups,
}: {
  accountGroups: Serialize<AccountGroupOption>[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [accountGroup, setAccountGroup] = useState<Serialize<AccountGroup>>();
  return {
    editAccountGroupProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      accountGroup,
      accountGroups,
    },
    onNewAccountGroup() {
      setAccountGroup(undefined);
      setIsOpen(true);
    },
    onEditAccountGroup(accountGroup: Serialize<AccountGroup>) {
      setAccountGroup(accountGroup);
      setIsOpen(true);
    },
  };
}

export function EditAccountGroup({
  isOpen,
  onClose,
  accountGroup,
  accountGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountGroup?: Serialize<AccountGroup>;
  accountGroups: Serialize<AccountGroupOption>[];
}) {
  const [selectedType, setSelectedType] = useState<AccountType>(
    accountGroup?.type ?? "ASSET",
  );
  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <Form
        method={accountGroup ? "PUT" : "POST"}
        action="/account-groups"
        className="contents"
        onSubmit={() => onClose()}
      >
        {!!accountGroup && (
          <input type="hidden" name="id" value={accountGroup.id} />
        )}
        <DialogTitle>
          {accountGroup ? `Edit ${accountGroup.name}` : "New Group"}
        </DialogTitle>
        <DialogBody>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
              <Field>
                <Label>Name</Label>
                <Input name="name" defaultValue={accountGroup?.name} />
              </Field>
              <Field disabled={!!accountGroup}>
                <Label>Type</Label>
                <RadioGroup
                  name="type"
                  defaultValue={accountGroup?.type ?? "ASSET"}
                  onChange={(value) => setSelectedType(value as AccountType)}
                >
                  <RadioField>
                    <Radio value="ASSET" />
                    <Label>Asset</Label>
                  </RadioField>
                  <RadioField>
                    <Radio value="LIABILITY" />
                    <Label>Liability</Label>
                  </RadioField>
                  <RadioField>
                    <Radio value="EQUITY" />
                    <Label>Equity</Label>
                  </RadioField>
                </RadioGroup>
              </Field>
            </div>
            <Field>
              <Label>Parent Group</Label>
              <AccountGroupCombobox
                accountGroups={accountGroups.filter(
                  (g) => g.type === selectedType && g.id !== accountGroup?.id,
                )}
                defaultValue={accountGroup?.parentGroupId ?? ""}
                name="parentGroupId"
              />
            </Field>
          </FieldGroup>
        </DialogBody>
        <DialogActions>
          <Button hierarchy="tertiary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button type="submit">{accountGroup ? "Save" : "Create"}</Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
