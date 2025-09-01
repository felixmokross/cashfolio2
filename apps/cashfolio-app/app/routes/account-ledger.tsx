import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const bookings = await prisma.booking.findMany({
    where: { accountId: params.accountId },
    include: { transaction: true },
  });
  return { bookings };
}

export default function AccountLedger() {
  const { bookings } = useLoaderData<typeof loader>();
  return (
    <>
      <ul>
        {bookings.map((b) => (
          <li key={b.id}>
            {b.transaction.description} Booking {b.date.toISOString()} –{" "}
            {b.description}
          </li>
        ))}
      </ul>
    </>
  );
}
