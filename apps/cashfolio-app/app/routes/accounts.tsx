import { useState } from "react";
import { Button } from "~/catalyst/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/catalyst/dialog";
import {
  Description,
  Field,
  FieldGroup,
  Fieldset,
  Label,
} from "~/catalyst/fieldset";
import { Input } from "~/catalyst/input";
import { Radio, RadioField, RadioGroup } from "~/catalyst/radio";
import { Select } from "~/catalyst/select";

export default function Accounts() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <p>
      <Button onClick={() => setIsOpen(true)}>New Account</Button>
      <Dialog open={isOpen} onClose={setIsOpen} size="3xl">
        <DialogTitle>New Account</DialogTitle>
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
                  <Input name="name" />
                </Field>
                <Field>
                  <Label>Group</Label>
                  <Select name="group"></Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
                <Field>
                  <Label>Unit</Label>
                  <RadioGroup name="resale" defaultValue="permit">
                    <RadioField>
                      <Radio value="permit" />
                      <Label>Currency</Label>
                      <Description>
                        Customers can resell or transfer their tickets if they
                        can’t make it to the event.
                      </Description>
                    </RadioField>
                    <RadioField>
                      <Radio value="forbid" />
                      <Label>Security</Label>
                      <Description>
                        Tickets cannot be resold or transferred to another
                        person.
                      </Description>
                    </RadioField>
                  </RadioGroup>
                </Field>
                <Field>
                  <Label>Currency</Label>
                  <Select name="group">
                    <option value="active">CHF</option>
                    <option value="paused">EUR</option>
                    <option value="delayed">USD</option>
                    <option value="canceled">DKK</option>
                  </Select>
                </Field>
              </div>
            </FieldGroup>
          </Fieldset>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsOpen(false)}>Create</Button>
        </DialogActions>
      </Dialog>
    </p>
  );
}
