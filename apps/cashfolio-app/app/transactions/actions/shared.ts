export function parseBookings(formData: FormData) {
  const out: Record<string, any>[] = [];

  for (const [key, value] of formData.entries()) {
    const m = key.match(/^bookings\[(\d+)\]\[(.+)\]$/);
    if (!m) continue;
    const [, idxStr, prop] = m;
    const idx = Number(idxStr);
    if (!out[idx]) out[idx] = {};
    out[idx][prop] = value;
  }

  return out.map((b) => ({
    date: String(b.date ?? ""),
    accountId: String(b.accountId ?? ""),
    description: String(b.description ?? ""),
    currency: String(b.currency ?? ""),
    value: String(b.value ?? ""),
  }));
}
