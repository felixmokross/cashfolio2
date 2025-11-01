import { Subheading } from "~/platform/heading";
import { useAccountBook } from "~/account-books/hooks";
import { Outlet, useMatch, useNavigate } from "react-router";
import type { LoaderData } from "./route";
import { Field, Label } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";

export function Page({ loaderData }: { loaderData: LoaderData }) {
  const accountBook = useAccountBook();
  const navigate = useNavigate();
  const match = useMatch("/:accountBookId/income/breakdown/:viewType");
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="grow-0 mt-8">
          <Field>
            <Select
              onChange={(e) =>
                navigate(
                  `/${accountBook.id}/income/breakdown/${e.target.value}`,
                )
              }
              value={match?.params.viewType}
            >
              <option value="chart">Chart</option>
              <option value="table">Table</option>
            </Select>
          </Field>
        </div>
      </div>

      <Outlet />
    </>
  );
}
