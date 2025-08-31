import { useState } from "react";
import { Form, useLoaderData, type ActionFunctionArgs } from "react-router";
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
import { prisma } from "~/prisma.server";
import slugify from "slugify";

export async function loader() {
  return await prisma.account.findMany();
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return new Response(null, { status: 405 });

  const form = await request.formData();
  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.create({
    data: { name: name, slug: slugify(name, { lower: true }) },
  });

  return new Response(null, { status: 201 });
}

export default function Accounts() {
  const [isOpen, setIsOpen] = useState(false);
  const accounts = useLoaderData<typeof loader>();
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>New Account</Button>
      <Dialog open={isOpen} onClose={setIsOpen} size="3xl">
        <Form method="POST" onSubmit={() => setIsOpen(false)}>
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
            <Button type="submit">Create</Button>
          </DialogActions>
        </Form>
      </Dialog>
      <ul>
        {accounts.map((a) => (
          <li key={a.id}>{a.name}</li>
        ))}
      </ul>
    </div>
  );
}
