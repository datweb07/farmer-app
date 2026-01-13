"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

/**
 * Sheet root component that provides sheet context and adds a stable `data-slot="sheet"` identifier.
 *
 * @param props - Props forwarded to the underlying Sheet root element and spread onto it.
 * @returns The rendered Sheet root element
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

/**
 * Renders the Sheet trigger element and forwards all props to the underlying Radix Trigger while adding a `data-slot="sheet-trigger"` attribute.
 *
 * @param props - Props forwarded to the Radix SheetTrigger element.
 * @returns The configured Sheet trigger element.
 */
function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

/**
 * Renders a close trigger for the Sheet with a `data-slot="sheet-close"` attribute.
 *
 * @returns The sheet close trigger element configured with `data-slot="sheet-close"` and any provided props.
 */
function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * Renders the sheet's portal container used to mount sheet content outside the DOM hierarchy.
 *
 * Forwards all props to Radix's Portal and adds a `data-slot="sheet-portal"` attribute.
 *
 * @returns The portal element used to host sheet content
 */
function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

/**
 * Render a styled backdrop overlay for the Sheet that applies open/close animation and fade classes.
 *
 * @param className - Additional class names to merge with the component's default animation and backdrop styles
 * @returns The overlay element used as the sheet backdrop
 */
function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the sheet panel inside a portal with an overlay and an integrated close control.
 *
 * The panel is positioned and animated according to the `side` prop and accepts additional
 * props and className for customization.
 *
 * @param side - Where the sheet should appear: "top", "right", "bottom", or "left". Defaults to `"right"`.
 * @returns The composed sheet content element (portal + overlay + content panel with close button).
 */
function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/**
 * Renders the sheet header container with default layout, spacing, and a `data-slot="sheet-header"` attribute.
 *
 * The component applies default flex-column layout, gap, and padding and merges any provided `className` with these defaults.
 *
 * @returns A `div` element that serves as the header slot for a Sheet component.
 */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

/**
 * Footer container for a Sheet that provides spacing and vertical layout for footer content.
 *
 * @returns The footer container element for a Sheet.
 */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

/**
 * Renders the sheet's title element with default typography and slot attributes.
 *
 * Applies a `data-slot="sheet-title"` attribute and default classes for foreground color and semibold font weight; merges any supplied `className` and forwards remaining props to the underlying element.
 *
 * @returns A React element rendering the styled sheet title
 */
function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders the sheet's description text with default muted small typography.
 *
 * @param className - Additional CSS classes to apply to the description element.
 * @returns The sheet description element with merged classes and `data-slot="sheet-description"`.
 */
function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};