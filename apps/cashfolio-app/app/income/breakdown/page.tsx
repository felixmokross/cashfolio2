import { Outlet, useMatch, useNavigate } from "react-router";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";

export function Page() {
  const navigate = useNavigate();
  const match = useMatch("/:accountBookId/income/:nodeId/breakdown/:viewType");
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="grow-0 mt-8">
          <Field>
            <Select
              onChange={(e) => navigate(e.target.value)}
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
