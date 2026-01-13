"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "./utils";

/**
 * Wraps Radix's TooltipProvider and applies a default `delayDuration` of 0.
 *
 * @param delayDuration - Milliseconds to wait before showing the tooltip; defaults to `0`.
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

/**
 * Renders a Tooltip root wrapped with the TooltipProvider to ensure provider defaults.
 *
 * @param props - Props forwarded to the underlying `TooltipPrimitive.Root`
 * @returns The rendered Tooltip root element wrapped in a `TooltipProvider`
 */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

/**
 * Renders the tooltip trigger element by forwarding props to Radix's Tooltip Trigger and adding a `data-slot="tooltip-trigger"` attribute.
 *
 * @param props - Props forwarded to `TooltipPrimitive.Trigger`
 * @returns The rendered tooltip trigger element
 */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * Renders tooltip content inside a portal with styling, an arrow, and an optional offset.
 *
 * @param className - Additional CSS classes merged with the component's default styling.
 * @param sideOffset - Distance in pixels between the trigger and the content; defaults to 0.
 * @param children - Content displayed inside the tooltip.
 * @param props - Any other props are forwarded to the underlying TooltipPrimitive.Content.
 * @returns The rendered tooltip content element (wrapped in a portal) including an arrow element.
 */
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };