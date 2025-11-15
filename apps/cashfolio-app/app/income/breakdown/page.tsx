import { Outlet, useMatch, useNavigate } from "react-router";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import type { LoaderData } from "./route";
import { PeriodSelector } from "~/period/period-selector";

export function Page({ loaderData }: { loaderData: LoaderData }) {
  const match = useMatch("/:_/income/:_/breakdown/:_/:viewType");
  const navigate = useNavigate();
  return (
    <div className="space-y-4 mt-12">
      <PeriodSelector
        period={loaderData.period}
        periodSpecifier={loaderData.periodSpecifier}
        minBookingDate={loaderData.minBookingDate}
        onNavigate={(newPeriodOrPeriodSpecifier) =>
          navigate(
            `../breakdown/${newPeriodOrPeriodSpecifier}/${match?.params.viewType}`,
          )
        }
        additionalControls={
          <Field>
            <Select
              onChange={(e) => navigate(e.target.value)}
              value={match?.params.viewType}
            >
              <option value="chart">Chart</option>
              <option value="table">Table</option>
            </Select>
          </Field>
        }
      />
      <Outlet />
    </div>
  );
}
