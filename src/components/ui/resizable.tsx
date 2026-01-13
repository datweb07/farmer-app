"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "./utils";

/**
 * Wraps `ResizablePrimitive.Group` with project-specific layout classes and a `data-slot`.
 *
 * Applies a base flex layout (vertical when the panel group direction is `vertical`), merges any
 * provided `className`, sets `data-slot="resizable-panel-group"`, and forwards all other props to
 * the underlying `ResizablePrimitive.Group`.
 *
 * @returns A `ResizablePrimitive.Group` element with the composed classes, `data-slot`, and forwarded props.
 */
function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Wraps `ResizablePrimitive.Panel`, setting a data-slot and forwarding all props.
 *
 * @returns A `ResizablePrimitive.Panel` element with `data-slot="resizable-panel"` and the provided props applied.
 */
function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

/**
 * Render a styled resizable separator that optionally shows a grip handle.
 *
 * Renders a wrapped `ResizablePrimitive.Separator` with project-specific classes, data-slot="resizable-handle", and an optional visual grip. The separator's layout adapts to the parent panel group's direction via data attributes; passing `withHandle` adds a small grip icon inside the separator for affordance.
 *
 * @param withHandle - If true, render a visible grip element inside the separator
 * @returns The resizable separator element with applied styling and optional grip
 */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };