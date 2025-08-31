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
import type { Account, AccountGroup } from "@prisma/client";
import slugify from "slugify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/catalyst/table";
import clsx from "clsx";

export async function loader() {
  return {
    accountGroups: await prisma.accountGroup.findMany(),
    accounts: await prisma.account.findMany(),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return new Response(null, { status: 405 });

  const form = await request.formData();
  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }
  const groupId = form.get("groupId");
  if (typeof groupId !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.create({
    data: {
      name,
      slug: slugify(name, { lower: true }),
      groupId,
    },
  });

  return new Response(null, { status: 201 });
}

export default function Accounts() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const { accounts, accountGroups } = useLoaderData<typeof loader>();

  const childrenByParentId: Record<string, Node[]> = {};
  for (const g of accountGroups) {
    if (!g.parentGroupId) continue;
    if (!childrenByParentId[g.parentGroupId]) {
      childrenByParentId[g.parentGroupId] = [];
    }
    childrenByParentId[g.parentGroupId].push({
      ...g,
      nodeType: "accountGroup",
    });
  }
  for (const a of accounts) {
    if (!childrenByParentId[a.groupId]) {
      childrenByParentId[a.groupId] = [];
    }
    childrenByParentId[a.groupId].push({ ...a, nodeType: "account" });
  }

  return (
    <div>
      <div className="flex gap-4">
        <Button onClick={() => setIsOpen(true)}>New Account</Button>
        <Button onClick={() => setIsGroupOpen(true)}>New Group</Button>
      </div>
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
                    <Select name="groupId">
                      {accountGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </Select>
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
      <Dialog open={isGroupOpen} onClose={setIsGroupOpen} size="lg">
        <Form
          method="POST"
          action="/account-groups"
          onSubmit={() => setIsGroupOpen(false)}
        >
          <DialogTitle>New Group</DialogTitle>
          <DialogBody>
            <FieldGroup>
              <Fieldset>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
                  <Field>
                    <Label>Name</Label>
                    <Input name="name" />
                  </Field>
                  <Field>
                    <Label>Parent Group</Label>
                    <Select name="parentGroupId">
                      {accountGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </Fieldset>
            </FieldGroup>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setIsGroupOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogActions>
        </Form>
      </Dialog>
      <Table dense bleed grid striped className="mt-8">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {accountGroups
            .filter((g) => !g.parentGroupId)
            .map((g) => (
              <AccountGroupItem
                nodeType="accountGroup"
                {...g}
                childrenByParentId={childrenByParentId}
                level={0}
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

type Node = AccountGroupNode | AccountNode;

type AccountGroupNode = AccountGroup & { nodeType: "accountGroup" };
type AccountNode = Account & { nodeType: "account" };

function AccountGroupItem({
  id,
  childrenByParentId,
  level,
  ...props
}: AccountGroupNode & {
  childrenByParentId: Record<string, Node[]>;
  level: number;
}) {
  return (
    <>
      <NodeRow {...props} id={id} level={level} />
      {childrenByParentId[id] && (
        <>
          {childrenByParentId[id].map((child) =>
            child.nodeType === "account" ? (
              <NodeRow {...child} key={child.id} level={level + 1} />
            ) : (
              <AccountGroupItem
                {...child}
                childrenByParentId={childrenByParentId}
                level={level + 1}
              />
            ),
          )}
        </>
      )}
    </>
  );
}

function NodeRow({ name, level }: Node & { level: number }) {
  return (
    <TableRow>
      <TableCell>
        <span
          className={clsx({
            "pl-0": level === 0,
            "pl-4": level === 1,
            "pl-8": level === 2,
            "pl-12": level === 3,
            "pl-16": level === 4,
            "pl-20": level === 5,
            "pl-24": level === 6,
            "pl-28": level === 7,
            "pl-32": level === 8,
            "pl-36": level === 9,
            "pl-40": level === 10,
          })}
        >
          {name}
        </span>
      </TableCell>
    </TableRow>
  );
}
