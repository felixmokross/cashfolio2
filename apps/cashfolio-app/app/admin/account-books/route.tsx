import { useLoaderData } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Badge } from "~/platform/badge";
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

export async function loader({ request }: { request: Request }) {
  await ensureAuthenticated(request);

  const accountBooks = await prisma.accountBook.findMany({
    include: { userLinks: { include: { user: true } } },
  });
  return serialize({ accountBooks });
}

export default function Route() {
  const { accountBooks } = useLoaderData<typeof loader>();
  return (
    <>
      <Heading>Account Books</Heading>
      <Table className="mt-8">
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader>Users</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {accountBooks.map((ab) => (
            <TableRow>
              <TableCell>{ab.id}</TableCell>
              <TableCell>{ab.name}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {ab.userLinks.map((link) => (
                    <Badge key={link.user.id}>{link.user.externalId}</Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
