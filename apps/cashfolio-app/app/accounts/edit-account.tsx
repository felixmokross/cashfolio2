import type { AccountType, Account, Unit } from "~/.prisma-client/client";
import { useEffect, useState } from "react";
import {
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
import { CryptocurrencyCombobox } from "~/components/cryptocurrency-combobox";
import {
  CancelButton,
  FormDialog,
  CreateOrSaveButton,
} from "~/platform/forms/form-dialog";
import { useAccountBook } from "~/account-books/hooks";
import { Switch, SwitchField } from "~/platform/forms/switch";

export function useEditAccount() {
  const [isOpen, setIsOpen] = useState(false);
  const [account, setAccount] = useState<Serialize<Account>>();
  return {
    editAccountProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      account,
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
  const [selectedUnit, setSelectedUnit] = useState<Unit>("CURRENCY");
  const [selectedType, setSelectedType] = useState<AccountType>("ASSET");
  useEffect(() => {
    setSelectedUnit(account?.unit ?? "CURRENCY");
    setSelectedType(account?.type ?? "ASSET");
  }, [account?.id]);
  const accountBook = useAccountBook();
  return (
    <FormDialog
      open={isOpen}
      size="xl"
      onClose={onClose}
      entityId={account?.id}
      action={
        account
          ? `/${accountBook.id}/accounts/update`
          : `/${accountBook.id}/accounts/create`
      }
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
            {selectedType === "EQUITY" && (
              <Field>
                <Label>Subtype</Label>
                <RadioGroup
                  name="equityAccountSubtype"
                  defaultValue={account?.equityAccountSubtype || "GAIN_LOSS"}
                >
                  <RadioField>
                    <Radio value="GAIN_LOSS" />
                    <Label>Gain/Loss</Label>
                  </RadioField>
                  <RadioField>
                    <Radio value="INCOME" />
                    <Label>Income</Label>
                  </RadioField>
                  <RadioField>
                    <Radio value="EXPENSE" />
                    <Label>Expense</Label>
                  </RadioField>
                </RadioGroup>
              </Field>
            )}
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
                  onChange={(v) => setSelectedUnit(v as Unit)}
                >
                  <RadioField>
                    <Radio value="CURRENCY" />
                    <Label>Currency</Label>
                  </RadioField>
                  <RadioField>
                    <Radio value="CRYPTOCURRENCY" />
                    <Label>Cryptocurrency</Label>
                  </RadioField>
                  <RadioField>
                    <Radio value="SECURITY" />
                    <Label>Security</Label>
                  </RadioField>
                </RadioGroup>
              </Field>
              {selectedUnit === "CURRENCY" && (
                <Field>
                  <Label>Currency</Label>
                  <CurrencyCombobox
                    name="currency"
                    defaultValue={
                      account?.currency || accountBook.referenceCurrency
                    }
                  />
                </Field>
              )}
              {selectedUnit === "CRYPTOCURRENCY" && (
                <Field>
                  <Label>Cryptocurrency</Label>
                  <CryptocurrencyCombobox
                    name="cryptocurrency"
                    defaultValue={account?.cryptocurrency || ""}
                  />
                </Field>
              )}
              {selectedUnit === "SECURITY" && (
                <FieldGroup>
                  <Field>
                    <Label>Symbol</Label>
                    <Input name="symbol" defaultValue={account?.symbol || ""} />
                  </Field>
                  <Field>
                    <Label>Trade Ccy.</Label>
                    <CurrencyCombobox
                      name="tradeCurrency"
                      defaultValue={account?.tradeCurrency || ""}
                    />
                  </Field>
                </FieldGroup>
              )}
            </div>
            <SwitchField>
              <Label>Is Active</Label>
              <Description>
                Inactive accounts are hidden in most places. Use this if the
                account was closed or is not used anymore actively.
              </Description>
              <Switch
                name="isActive"
                defaultChecked={account?.isActive ?? true}
              />
            </SwitchField>
          </FieldGroup>
        </Fieldset>
      </DialogBody>
      <DialogActions>
        <CancelButton />
        <CreateOrSaveButton />
      </DialogActions>
    </FormDialog>
  );
}
