export function viewKey(accountBookId: string) {
  return `account-book-${accountBookId}-view`;
}

export function timelineRangeKey(accountBookId: string) {
  return `account-book-${accountBookId}-timeline-range`;
}

export async function saveViewPreference(key: string, value: string) {
  const viewPreferencesForm = new FormData();
  viewPreferencesForm.append("key", key);
  viewPreferencesForm.append("value", value);

  await fetch(`/view-preferences/set`, {
    method: "POST",
    body: viewPreferencesForm,
  });
}
