"use client";

import { ShoppingCart } from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/Button";

interface CartSummaryProps {
  itemCount: number;
  total: number;
  onOrder?: () => void;
  className?: string;
}

export default function CartSummary({
  itemCount,
  total,
  onOrder,
  className,
}: CartSummaryProps) {
  return (
    <Card className={className}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ShoppingCart className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary">Grocery Cart</h3>
          <p className="text-sm text-text-secondary">
            {itemCount} item{itemCount !== 1 ? "s" : ""} ready to order
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <p className="text-sm text-text-secondary">Estimated Total</p>
          <p className="text-2xl font-bold text-text-primary">
            &#8377;{total.toLocaleString("en-IN")}
          </p>
        </div>
        <Button onClick={onOrder} disabled={itemCount === 0}>
          Order Now
        </Button>
      </div>
    </Card>
  );
}
