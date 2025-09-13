import type { Account, AccountType, AccountUnit } from "@prisma/client";
import { useState } from "react";
import { Form } from "react-router";
import { Button } from "~/platform/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/platform/dialog";
import {
  Description,
  Field,
  FieldGroup,
  Fieldset,
  Label,
} from "~/platform/forms/fieldset";
import { Input } from "~/platform/forms/input";
import { Radio, RadioField, RadioGroup } from "~/platform/forms/radio";
import type { Serialize } from "~/serialization";
import { AccountGroupCombobox } from "~/account-groups/account-group-combobox";
import type { AccountGroupOption } from "~/types";
import { CurrencyCombobox } from "~/components/currency-combobox";

export function useEditAccount({
  accountGroups,
}: {
  accountGroups: Serialize<AccountGroupOption>[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [account, setAccount] = useState<Serialize<Account>>();
  return {
    editAccountProps: {
      key: account?.id ?? "new",
      isOpen,
      onClose: () => setIsOpen(false),
      account,
      accountGroups,
    },
    onNewAccount() {
      setAccount(undefined);
      setIsOpen(true);
    },
    onEditAccount(account: Serialize<Account>) {
      setAccount(account);
      setIsOpen(true);
    },
  };
}

export function EditAccount({
  isOpen,
  onClose,
  account,
  accountGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  account?: Serialize<Account>;
  accountGroups: Serialize<AccountGroupOption>[];
}) {
  const [selectedUnit, setSelectedUnit] = useState<AccountUnit>(
    account?.unit ?? "CURRENCY",
  );
  const [selectedType, setSelectedType] = useState<AccountType>(
    account?.type ?? "ASSET",
  );
  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <Form
        onSubmit={() => onClose()}
        className="contents"
        action={account ? "/accounts/update" : "/accounts/create"}
        method="POST"
      >
        {!!account && <input type="hidden" name="id" value={account.id} />}
        <DialogTitle>
          {account ? `Edit ${account.name}` : "New Account"}
        </DialogTitle>
        <DialogDescription>
          The refund will be reflected in the customer’s bank account 2 to 3
          business days after processing.
        </DialogDescription>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
                <Field>
                  <Label>Name</Label>
                  <Input name="name" defaultValue={account?.name} />
                </Field>
                <Field disabled={!!account}>
                  <Label>Type</Label>
                  <RadioGroup
                    name="type"
                    defaultValue={account?.type || "ASSET"}
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
                <Label>Group</Label>
                <AccountGroupCombobox
                  name="groupId"
                  defaultValue={account?.groupId}
                  accountGroups={accountGroups.filter(
                    (g) => g.type === selectedType,
                  )}
                />
              </Field>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
                <Field>
                  <Label>Unit</Label>
                  <RadioGroup
                    name="unit"
                    defaultValue={account?.unit || "CURRENCY"}
                    onChange={(v) => setSelectedUnit(v as AccountUnit)}
                  >
                    <RadioField>
                      <Radio value="CURRENCY" />
                      <Label>Currency</Label>
                      <Description>
                        Customers can resell or transfer their tickets if they
                        can’t make it to the event.
                      </Description>
                    </RadioField>
                    <RadioField>
                      <Radio value="SECURITY" />
                      <Label>Security</Label>
                      <Description>
                        Tickets cannot be resold or transferred to another
                        person.
                      </Description>
                    </RadioField>
                  </RadioGroup>
                </Field>
                {selectedUnit === "CURRENCY" && (
                  <Field>
                    <Label>Currency</Label>
                    <CurrencyCombobox
                      name="currency"
                      defaultValue={account?.currency || "CHF"}
                    />
                  </Field>
                )}
              </div>
            </FieldGroup>
          </Fieldset>
        </DialogBody>
        <DialogActions>
          <Button hierarchy="tertiary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button type="submit">{account ? "Save" : "Create"}</Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
