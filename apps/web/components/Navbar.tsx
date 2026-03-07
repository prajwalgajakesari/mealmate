"use client";

import { useState } from "react";
import Link from "next/link";
import { ChefHat, Menu, X } from "lucide-react";
import Button from "./ui/Button";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <ChefHat className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-text-primary">
            Meal<span className="text-primary">Mate</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Log In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm">Get Started Free</Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden rounded-lg p-2 text-text-secondary hover:bg-gray-50"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" fullWidth size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
              <Button fullWidth size="sm">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
