import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MealMate AI - Your AI Kitchen Manager",
  description:
    "AI-powered meal planning, pantry tracking, and grocery ordering for Indian households. Get personalized daily meal plans and order groceries with one tap.",
  keywords: [
    "meal planning",
    "Indian food",
    "grocery ordering",
    "AI kitchen",
    "pantry tracker",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
