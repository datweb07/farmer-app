"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "./utils";

/**
 * Render a styled separator that wraps Radix UI's SeparatorPrimitive.Root.
 *
 * The component applies orientation-specific sizing classes, forwards remaining props,
 * and sets a data-slot attribute of "separator-root".
 *
 * @param className - Additional CSS class names to merge with the component's base classes
 * @param orientation - Separator orientation, either `"horizontal"` or `"vertical"`. Defaults to `"horizontal"`.
 * @param decorative - If `true`, marks the separator as decorative for assistive technologies. Defaults to `true`.
 * @returns The configured SeparatorPrimitive.Root React element
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };