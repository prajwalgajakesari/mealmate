"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  ChefHat,
  LayoutDashboard,
  Package,
  History,
  User,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Today's Plan", icon: LayoutDashboard },
  { href: "/dashboard/pantry", label: "Pantry", icon: Package },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-100 bg-surface">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 px-6">
        <ChefHat className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold text-text-primary">
          Meal<span className="text-primary">Mate</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
