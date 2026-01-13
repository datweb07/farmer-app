"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

/**
 * Renders a styled progress bar whose indicator reflects the supplied percentage.
 *
 * @param className - Optional additional CSS class names applied to the root element
 * @param value - Progress percentage from 0 to 100; when omitted, treated as 0
 * @param props - Additional props forwarded to the underlying ProgressPrimitive.Root
 * @returns A React element representing the progress bar with its indicator translated to match `value`
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };