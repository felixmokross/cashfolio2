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
import { createManagementApi } from "@logto/api/management";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      externalId: true,
      _count: { select: { accountBookLinks: true } },
    },
  });

  const { apiClient } = createManagementApi(process.env.LOGTO_TENANT_ID!, {
    clientId: process.env.LOGTO_MANAGEMENT_APP_ID!,
    clientSecret: process.env.LOGTO_MANAGEMENT_APP_SECRET!,
  });

  const response = await apiClient.GET("/api/users");

  return serialize({
    users: users.map((u) => ({
      ...u,
      email: response.data?.find((x) => x.id === u.externalId)?.primaryEmail,
    })),
  });
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
            <TableHeader>Email</TableHeader>
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
              <TableCell>{u.email}</TableCell>
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
