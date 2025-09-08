import {
  Form,
  redirect,
  useLoaderData,
  type ActionFunctionArgs,
} from "react-router";
import { Button } from "~/platform/button";
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
import { Link } from "~/platform/link";
import { Heading } from "~/platform/heading";
import { serialize, type Serialize } from "~/serialization";
import { formatMoney } from "~/formatting";
import { EditAccount, useEditAccount } from "~/components/edit-account";
import {
  EditAccountGroup,
  useEditAccountGroup,
} from "~/components/edit-account-group";
import { getAccountGroupPath } from "~/utils";

export async function loader() {
  const accountGroups = await prisma.accountGroup.findMany({
    orderBy: { name: "asc" },
  });
  return serialize({
    accountGroups: accountGroups.map((ag) => ({
      ...ag,
      path: getAccountGroupPath(ag.id, accountGroups),
    })),
    accounts: await prisma.account.findMany({ orderBy: { name: "asc" } }),
  });
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
  const { accounts, accountGroups } = useLoaderData<typeof loader>();

  const { editAccountProps, onNewAccount, onEditAccount } = useEditAccount({
    accountGroups,
  });
  const { editAccountGroupProps, onNewAccountGroup, onEditAccountGroup } =
    useEditAccountGroup({ accountGroups });

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
      <div className="flex justify-between items-center">
        <Heading>Accounts</Heading>
        <div className="flex gap-4">
          <Button hierarchy="secondary" onClick={() => onNewAccount()}>
            New Account
          </Button>
          <Button hierarchy="secondary" onClick={() => onNewAccountGroup()}>
            New Group
          </Button>
        </div>
      </div>
      <EditAccount {...editAccountProps} />
      <EditAccountGroup {...editAccountGroupProps} />
      <Table
        bleed
        dense
        striped
        className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
      >
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>Currency</TableHeader>
            <TableHeader className="text-right">Opening Balance</TableHeader>
            <TableHeader className="w-10">
              <span className="sr-only">Actions</span>
            </TableHeader>
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
                  if (node.nodeType === "account") {
                    onEditAccount(node);
                  } else {
                    onEditAccountGroup(node);
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

type AccountGroupNode = Serialize<AccountGroup> & {
  nodeType: "accountGroup";
};
type AccountNode = Serialize<Account> & { nodeType: "account" };

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
        {node.nodeType === "account" && node.openingBalance
          ? formatMoney(node.openingBalance)
          : null}
      </TableCell>
      <TableCell>
        <div className="flex gap-2 items-center">
          <Button
            hierarchy="tertiary"
            onClick={() => {
              onEdit?.(node);
            }}
          >
            <PencilSquareIcon />
          </Button>
          <Form
            method="DELETE"
            action={
              node.nodeType === "account" ? "/accounts" : "/account-groups"
            }
            className="contents"
          >
            <input type="hidden" name="id" value={node.id} />
            <Button type="submit" hierarchy="tertiary">
              <TrashIcon />
            </Button>
          </Form>
        </div>
      </TableCell>
    </TableRow>
  );
}
