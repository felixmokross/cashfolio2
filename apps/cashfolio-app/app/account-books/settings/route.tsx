import { Divider } from "~/platform/divider";
import { Input } from "~/platform/forms/input";
import { Heading, Subheading } from "~/platform/heading";
import { Text } from "~/platform/text";
import { useAccountBook } from "../hooks";
import { CurrencyCombobox } from "~/components/currency-combobox";
import { Button } from "~/platform/button";
import { useFetcher } from "react-router";
import { DeleteAccountBook, useDeleteAccountBook } from "./delete-account-book";

export default function Route() {
  const accountBook = useAccountBook();
  const fetcher = useFetcher();
  const { deleteAccountBookProps, onDeleteAccountBook } =
    useDeleteAccountBook();
  return (
    <div className="flex justify-center">
      <div className="max-w-3xl space-y-32">
        <fetcher.Form method="POST" action="/account-books/update">
          <input type="hidden" name="id" value={accountBook.id} />

          <Heading>Settings</Heading>
          <Divider className="my-10 mt-6" />

          <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="space-y-1">
              <Subheading>Account Book Name</Subheading>
            </div>
            <div>
              <Input
                aria-label="Account Book Name"
                name="name"
                defaultValue={accountBook.name}
              />
            </div>
          </section>

          <Divider className="my-10" soft />

          <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="space-y-1">
              <Subheading>Reference Currency</Subheading>
              <Text>
                This currency will be used to display balances and income.
              </Text>
            </div>
            <div>
              <CurrencyCombobox
                name="referenceCurrency"
                defaultValue={accountBook.referenceCurrency}
              />
            </div>
          </section>

          <Divider className="my-10" soft />

          <div className="flex justify-end gap-4">
            <Button type="reset" hierarchy="tertiary">
              Reset
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </fetcher.Form>
        <div>
          <Heading>Danger Zone</Heading>
          <Divider className="my-10 mt-6" />

          <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="space-y-1">
              <Subheading>Delete Account Book</Subheading>
              <Text>
                This will delete the account book and all its data. This action
                cannot be undone.
              </Text>
            </div>
            <div>
              <Button
                type="button"
                hierarchy="primary"
                variant="destructive"
                onClick={() => onDeleteAccountBook(accountBook.id)}
              >
                Delete Account Book
              </Button>
            </div>
          </section>
        </div>
        <DeleteAccountBook {...deleteAccountBookProps} />
      </div>
    </div>
  );
}
