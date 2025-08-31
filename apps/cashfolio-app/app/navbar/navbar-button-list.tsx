import {
  ArrowTrendingUpIcon,
  ScaleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { NavbarButton } from "./navbar-button";

const navigation = [
  {
    name: "Balance Sheet",
    href: "/balance-sheet",
    icon: ScaleIcon,
  },
  { name: "Accounts", href: "/accounts", icon: WalletIcon },
  {
    name: "Profit/Loss Statement",
    href: "/profit-loss-statement",
    icon: ArrowTrendingUpIcon,
  },
];

export function NavbarButtonList() {
  return (
    <ul role="list" className="-mx-2 space-y-1">
      {navigation.map((item) => (
        <li key={item.name}>
          <NavbarButton href={item.href} icon={item.icon}>
            {item.name}
          </NavbarButton>
        </li>
      ))}
    </ul>
  );
}
