import { useState } from "react";
import {
  Form,
  redirect,
  useLoaderData,
  type ActionFunctionArgs,
} from "react-router";
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
import { Select } from "~/platform/forms/select";
import { prisma } from "~/prisma.server";
import {
  AccountType,
  AccountUnit,
  Prisma,
  type Account,
  type AccountGroup,
} from "@prisma/client";
import slugify from "slugify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import clsx from "clsx";
import {
  PencilSquareIcon,
  TrashIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import {
  Combobox,
  ComboboxLabel,
  ComboboxOption,
} from "~/platform/forms/combobox";
import { Link } from "~/platform/link";

export async function loader() {
  return {
    accountGroups: await prisma.accountGroup.findMany(),
    accounts: (await prisma.account.findMany()).map((a) => ({
      ...a,
      openingBalance: a.openingBalance ? a.openingBalance.toString() : null,
    })),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST":
      return createAccount({ request });
    case "PUT":
      return updateAccount({ request });
    case "DELETE":
      return deleteAccount({ request });
    default:
      return new Response(null, { status: 405 });
  }
}

async function createAccount({ request }: { request: Request }) {
  const form = await request.formData();
  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }
  const type = form.get("type");
  if (typeof type !== "string") {
    return new Response(null, { status: 400 });
  }
  const groupId = form.get("groupId");
  if (typeof groupId !== "string") {
    return new Response(null, { status: 400 });
  }
  const openingBalance = form.get("openingBalance");
  if (openingBalance && typeof openingBalance !== "string") {
    return new Response(null, { status: 400 });
  }
  const unit = form.get("unit") as AccountUnit;
  if (typeof unit !== "string") {
    return new Response(null, { status: 400 });
  }
  const currency = form.get("currency");
  if (currency && typeof currency !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.create({
    data: {
      name,
      slug: slugify(name, { lower: true }),
      groupId,
      type: type as AccountType,
      unit,
      currency: unit === AccountUnit.CURRENCY ? currency : null,
      openingBalance: openingBalance
        ? new Prisma.Decimal(openingBalance)
        : null,
    },
  });

  return redirect(".");
}

async function updateAccount({ request }: { request: Request }) {
  const form = await request.formData();
  const id = form.get("id");
  if (typeof id !== "string") {
    return new Response(null, { status: 400 });
  }
  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }
  const groupId = form.get("groupId");
  if (typeof groupId !== "string") {
    return new Response(null, { status: 400 });
  }
  const openingBalance = form.get("openingBalance");
  if (openingBalance && typeof openingBalance !== "string") {
    return new Response(null, { status: 400 });
  }
  const unit = form.get("unit") as AccountUnit;
  if (typeof unit !== "string") {
    return new Response(null, { status: 400 });
  }
  const currency = form.get("currency");
  if (currency && typeof currency !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.update({
    where: { id },
    data: {
      name,
      slug: slugify(name, { lower: true }),
      groupId,
      unit,
      currency: unit === AccountUnit.CURRENCY ? currency : null,
      openingBalance: openingBalance
        ? new Prisma.Decimal(openingBalance)
        : null,
    },
  });

  return redirect(".");
}

async function deleteAccount({ request }: { request: Request }) {
  const form = await request.formData();

  const id = form.get("id");
  if (typeof id !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.delete({ where: { id } });
  return redirect(".");
}

export default function Accounts() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const { accounts, accountGroups } = useLoaderData<typeof loader>();
  const [selectedUnit, setSelectedUnit] = useState<AccountUnit>("CURRENCY");
  const [selectedType, setSelectedType] = useState<AccountType>("ASSET");

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
        <Button
          onClick={() => {
            setIsOpen(true);
            setSelectedNode(null);
            setSelectedType("ASSET");
            setSelectedUnit("CURRENCY");
          }}
        >
          New Account
        </Button>
        <Button
          onClick={() => {
            setIsGroupOpen(true);
            setSelectedNode(null);
            setSelectedType("ASSET");
          }}
        >
          New Group
        </Button>
      </div>
      <Dialog open={isOpen} onClose={setIsOpen} size="3xl">
        <Form
          method={selectedNode ? "PUT" : "POST"}
          onSubmit={() => setIsOpen(false)}
        >
          {!!selectedNode && (
            <input type="hidden" name="id" value={selectedNode.id} />
          )}
          <DialogTitle>
            {selectedNode ? `Edit ${selectedNode?.name}` : "New Account"}
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
                    <Input name="name" defaultValue={selectedNode?.name} />
                  </Field>
                  <Field disabled={!!selectedNode}>
                    <Label>Type</Label>
                    <RadioGroup
                      name="type"
                      defaultValue={selectedNode?.type || "ASSET"}
                      onChange={(value) =>
                        setSelectedType(value as AccountType)
                      }
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
                        <Radio value="INCOME" />
                        <Label>Income</Label>
                      </RadioField>
                      <RadioField>
                        <Radio value="EXPENSE" />
                        <Label>Expense</Label>
                      </RadioField>
                    </RadioGroup>
                  </Field>
                </div>
                <Field>
                  <Label>Group</Label>
                  <Select
                    name="groupId"
                    defaultValue={(selectedNode as Account)?.groupId}
                  >
                    {accountGroups
                      .filter((g) => g.type === selectedType)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
                  <Field>
                    <Label>Unit</Label>
                    <RadioGroup
                      name="unit"
                      defaultValue={
                        (selectedNode as Account)?.unit || "CURRENCY"
                      }
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
                      <Combobox<string>
                        name="currency"
                        defaultValue={
                          (selectedNode as Account)?.currency || "CHF"
                        }
                        displayValue={(o) => o ?? ""}
                        options={[
                          "CHF",
                          "EUR",
                          "USD",
                          "GBP",
                          "JPY",
                          "AUD",
                          "CAD",
                          "CNY",
                          "INR",
                        ]}
                      >
                        {(option) => (
                          <ComboboxOption value={option}>
                            <ComboboxLabel>{option}</ComboboxLabel>
                          </ComboboxOption>
                        )}
                      </Combobox>
                    </Field>
                  )}
                </div>
                {(selectedType === "ASSET" || selectedType === "LIABILITY") && (
                  <Field>
                    <Label>Opening Balance</Label>
                    <Input
                      name="openingBalance"
                      defaultValue={(
                        selectedNode as Account
                      )?.openingBalance?.toString()}
                    />
                  </Field>
                )}
              </FieldGroup>
            </Fieldset>
          </DialogBody>
          <DialogActions>
            <Button hierarchy="tertiary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{selectedNode ? "Save" : "Create"}</Button>
          </DialogActions>
        </Form>
      </Dialog>
      <Dialog open={isGroupOpen} onClose={setIsGroupOpen} size="3xl">
        <Form
          method={selectedNode ? "PUT" : "POST"}
          action="/account-groups"
          className="contents"
          onSubmit={() => setIsGroupOpen(false)}
        >
          {!!selectedNode && (
            <input type="hidden" name="id" value={selectedNode.id} />
          )}
          <DialogTitle>
            {selectedNode ? `Edit ${selectedNode.name}` : "New Group"}
          </DialogTitle>
          <DialogBody>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-4">
                <Field>
                  <Label>Name</Label>
                  <Input name="name" defaultValue={selectedNode?.name} />
                </Field>
                <Field disabled={!!selectedNode}>
                  <Label>Type</Label>
                  <RadioGroup
                    name="type"
                    defaultValue={selectedNode?.type || "ASSET"}
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
                      <Radio value="INCOME" />
                      <Label>Income</Label>
                    </RadioField>
                    <RadioField>
                      <Radio value="EXPENSE" />
                      <Label>Expense</Label>
                    </RadioField>
                  </RadioGroup>
                </Field>
              </div>
              <Field>
                <Label>Parent Group</Label>
                <Select
                  name="parentGroupId"
                  defaultValue={
                    (selectedNode as AccountGroup)?.parentGroupId ?? ""
                  }
                >
                  <option value="">(none)</option>
                  {accountGroups
                    .filter((g) => g.type === selectedType)
                    .filter(
                      selectedNode
                        ? (g) => g.id !== selectedNode.id
                        : () => true,
                    )
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </FieldGroup>
          </DialogBody>
          <DialogActions>
            <Button hierarchy="tertiary" onClick={() => setIsGroupOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{selectedNode ? "Save" : "Create"}</Button>
          </DialogActions>
        </Form>
      </Dialog>
      <Table bleed grid className="mt-8">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>Currency</TableHeader>
            <TableHeader className="text-right">Opening Balance</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {accountGroups
            .filter((g) => !g.parentGroupId)
            .map((g) => (
              <AccountGroupItem
                key={g.id}
                node={{ ...g, nodeType: "accountGroup" }}
                childrenByParentId={childrenByParentId}
                level={0}
                onEdit={(node) => {
                  setSelectedNode(node);
                  setSelectedType(node.type);

                  if (node.nodeType === "account") {
                    setSelectedUnit(node.unit);
                    setIsOpen(true);
                  } else {
                    setIsGroupOpen(true);
                  }
                }}
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

type Node = AccountGroupNode | AccountNode;

type AccountGroupNode = AccountGroup & { nodeType: "accountGroup" };
type AccountNode = SerializedAccount & { nodeType: "account" };

type SerializedAccount = Omit<Account, "openingBalance"> & {
  openingBalance: string | null;
};

function AccountGroupItem({
  childrenByParentId,
  level,
  node,
  onEdit,
}: {
  node: AccountGroupNode;
  childrenByParentId: Record<string, Node[]>;
  onEdit: (node: Node) => void;
  level: number;
}) {
  return (
    <>
      <NodeRow node={node} level={level} onEdit={onEdit} />
      {childrenByParentId[node.id] && (
        <>
          {childrenByParentId[node.id].map((child) =>
            child.nodeType === "account" ? (
              <NodeRow
                key={child.id}
                level={level + 1}
                onEdit={onEdit}
                node={child}
              />
            ) : (
              <AccountGroupItem
                key={child.id}
                node={child}
                childrenByParentId={childrenByParentId}
                level={level + 1}
                onEdit={onEdit}
              />
            ),
          )}
        </>
      )}
    </>
  );
}

function NodeRow({
  level,
  node,
  onEdit,
}: {
  node: Node;
  level: number;
  onEdit: (node: Node) => void;
}) {
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
          {node.nodeType === "account" ? (
            <Link
              href={`/accounts/${node.id}`}
              className="inline-flex gap-2 items-center"
            >
              <WalletIcon className="size-4" />
              {node.name}
            </Link>
          ) : (
            node.name
          )}
        </span>
      </TableCell>
      <TableCell>{node.type}</TableCell>
      <TableCell>{node.nodeType === "account" ? node.unit : null}</TableCell>
      <TableCell>
        {node.nodeType === "account" ? node.currency : null}
      </TableCell>
      <TableCell className="text-right">
        {node.nodeType === "account" ? node.openingBalance : null}
      </TableCell>
      <TableCell>
        <div className="flex gap-2 items-center">
          <Form
            method="DELETE"
            action={
              node.nodeType === "account" ? "/accounts" : "/account-groups"
            }
            className="contents"
          >
            <input type="hidden" name="id" value={node.id} />
            <button
              className="text-gray-400 disabled:cursor-not-allowed hover:text-gray-700 disabled:opacity-50 disabled:pointer-events-none"
              type="submit"
            >
              <TrashIcon className="size-5" />
            </button>
          </Form>
          <button
            className="text-gray-400 disabled:cursor-not-allowed hover:text-gray-700 disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => {
              onEdit?.(node);
            }}
          >
            <PencilSquareIcon className="size-5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
