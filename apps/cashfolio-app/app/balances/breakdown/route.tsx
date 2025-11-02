import { useRouteLoaderData } from "react-router";
import { Page } from "~/balances/breakdown/page";
import type { Route } from "./+types/route";
import type { LoaderData as BalancesRouteLoaderData } from "../route";
import invariant from "tiny-invariant";

export default function Route() {
  const loaderData =
    useRouteLoaderData<BalancesRouteLoaderData>("balances/route");
  invariant(!!loaderData, "Loader data is required");
  return <Page loaderData={loaderData} />;
}
