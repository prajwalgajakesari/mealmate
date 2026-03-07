import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  padding = "md",
  hoverable = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-surface shadow-sm border border-gray-100",
        paddingStyles[padding],
        hoverable &&
          "transition-shadow duration-200 hover:shadow-md cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
