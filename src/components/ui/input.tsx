import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-surface-container-high bg-surface-container-low px-3 py-1 font-inter text-sm text-on-surface outline-none transition-colors",
        "placeholder:text-on-muted focus:border-primary focus:ring-2 focus:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("font-manrope text-xs font-semibold text-on-surface", className)}
      {...props}
    />
  );
}

export { Input, Label };
