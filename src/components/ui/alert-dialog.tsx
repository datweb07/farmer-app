"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "./utils";
import { buttonVariants } from "./button";

/**
 * Wraps the Radix AlertDialog root and sets `data-slot="alert-dialog"` for testing and composition.
 *
 * @param props - Props applied to the underlying AlertDialog root element.
 * @returns The AlertDialog root element with the `data-slot` attribute and provided props.
 */
function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

/**
 * Renders the AlertDialog trigger element and attaches a stable `data-slot` attribute for testing.
 *
 * @returns The AlertDialog trigger element.
 */
function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

/**
 * Renders a portal for alert dialog content and attaches a `data-slot` attribute for testing/QA.
 *
 * @returns The Portal element with forwarded props and a `data-slot="alert-dialog-portal"` attribute.
 */
function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

/**
 * Backdrop overlay for the alert dialog that applies preset backdrop styling and enter/exit animations.
 *
 * @returns The AlertDialog overlay element with merged classes and a `data-slot="alert-dialog-overlay"` attribute.
 */
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders styled AlertDialog content inside a portal and pairs it with an overlay.
 *
 * Additional CSS passed via `className` is merged with the component's default classes.
 * All other props are forwarded to the underlying Radix `AlertDialog.Content`.
 *
 * @param className - Optional additional class names to apply to the content container
 * @returns The composed AlertDialog content element (wrapped in a portal with an overlay)
 */
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

/**
 * Renders the header region for an AlertDialog with responsive alignment and spacing.
 *
 * @returns A div element used as the alert dialog header. It includes a `data-slot="alert-dialog-header"` attribute and applies default layout classes (flex column, gap, centered on small screens / left-aligned on larger screens), merging any provided `className`.
 */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

/**
 * Renders the footer region for an AlertDialog, arranging action buttons responsively.
 *
 * Renders a container with a data-slot of "alert-dialog-footer" and layout classes that stack actions vertically (reversed) on small screens and align them to the end in a row on larger screens.
 *
 * @returns The rendered footer element for an AlertDialog.
 */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the alert dialog title with consistent typography and a data-slot for testing.
 *
 * @returns A React element for the alert dialog title with applied title styles (`text-lg font-semibold`) and a `data-slot="alert-dialog-title"` attribute.
 */
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders the alert dialog description element with consistent muted styling and a `data-slot` attribute.
 *
 * @returns The alert dialog description element with muted foreground color and `text-sm` sizing.
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * Renders an AlertDialog action button styled with the project's primary button variants.
 *
 * @returns A React element for the alert dialog action with primary button styling and merged `className`.
 */
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants(), className)}
      {...props}
    />
  );
}

/**
 * Renders a cancel button for an alert dialog styled with the outlined button variant.
 *
 * @returns The Cancel button element with outline styling that forwards all received props.
 */
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};