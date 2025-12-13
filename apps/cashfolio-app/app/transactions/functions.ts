import type { Booking } from "~/.prisma-client/client";
import type { Serialize } from "~/serialization";
import { getUnitInfo, getUnitKey } from "~/units/functions";

export function isSplitTransaction(
  bookings: Serialize<
    Pick<
      Booking,
      "date" | "description" | "unit" | "symbol" | "cryptocurrency" | "currency"
    >
  >[],
) {
  return (
    bookings.length > 2 ||
    new Set(bookings.map((b) => getUnitKey(getUnitInfo(b)))).size > 1 ||
    new Set(bookings.map((b) => b.date)).size > 1 ||
    bookings.some((b) => !!b.description)
  );
}
