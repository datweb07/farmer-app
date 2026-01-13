"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "./utils";

/**
 * Wrapper around Radix's Popover root that attaches a data-slot identifier.
 *
 * @returns A PopoverPrimitive.Root element with `data-slot="popover"` and all provided props forwarded.
 */
function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

/**
 * Render a Popover trigger element that forwards all provided props and sets `data-slot="popover-trigger"`.
 *
 * @param props - Props forwarded to Radix's PopoverTrigger primitive
 * @returns The rendered PopoverPrimitive.Trigger element with `data-slot="popover-trigger"` and the supplied props applied
 */
function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * Renders popover content inside a portal with centered alignment, a side offset, and the component's standard styling and animations.
 *
 * @param className - Optional additional CSS class names appended to the component's default classes.
 * @param align - Side alignment of the content relative to the trigger; defaults to `"center"`.
 * @param sideOffset - Distance in pixels between the trigger and the content; defaults to `4`.
 * @returns The Popover content element wrapped in a portal.
 */
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/**
 * Renders a Radix Popover Anchor with a `data-slot="popover-anchor"` attribute and forwards all received props.
 *
 * @returns The rendered PopoverPrimitive.Anchor element
 */
function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };