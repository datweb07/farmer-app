"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "./utils";

/**
 * Render a hover card root element with a `data-slot="hover-card"` attribute and forward all received props.
 *
 * @param props - Props to pass through to the underlying hover card root element
 * @returns The rendered hover card root element
 */
function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

/**
 * Renders a hover-card trigger element that forwards all received props.
 *
 * The rendered trigger includes a `data-slot="hover-card-trigger"` attribute.
 *
 * @returns A HoverCard trigger element with forwarded props and the `data-slot="hover-card-trigger"` attribute.
 */
function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

/**
 * Renders hover card content inside a portal with default alignment and offset and applies the component's styling.
 *
 * @param className - Additional CSS classes to merge with the component's default styles
 * @param align - Alignment of the content relative to the trigger (defaults to `"center"`)
 * @param sideOffset - Distance in pixels between the trigger and the content (defaults to `4`)
 * @returns The hover card content element wrapped in a portal
 */
function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };