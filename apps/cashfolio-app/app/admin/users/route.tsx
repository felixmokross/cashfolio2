import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Heading } from "~/platform/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { prisma } from "~/prisma.server";
import { serialize } from "~/serialization";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      externalId: true,
      _count: { select: { accountBookLinks: true } },
    },
  });
  return serialize({ users });
}

export default function Route() {
  const { users } = useLoaderData<typeof loader>();
  return (
    <>
      <Heading>Users</Heading>
      <Table className="mt-8">
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>External ID</TableHeader>
            <TableHeader className="text-right">
              No. of Account Books
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.id}</TableCell>
              <TableCell>{u.externalId}</TableCell>
              <TableCell className="text-right">
                {u._count.accountBookLinks}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
