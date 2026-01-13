"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

/**
 * Renders the dialog root wrapper that forwards props to Radix's Dialog.Root and adds a standardized `data-slot="dialog"`.
 *
 * @returns The dialog root React element.
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/**
 * Renders a trigger element that opens the dialog.
 *
 * @param props - Props to pass to the underlying Radix Trigger element
 * @returns A React element functioning as the dialog trigger that includes `data-slot="dialog-trigger"`
 */
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/**
 * Renders a portal for mounting dialog contents.
 *
 * @returns The portal element used to render dialog contents with `data-slot="dialog-portal"` and any forwarded props.
 */
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/**
 * Renders a dialog close control.
 *
 * @returns A Close element for the dialog that forwards all props and has `data-slot="dialog-close"`.
 */
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * Renders the dialog's overlay element with built-in styling, state-based animations, and a data-slot attribute.
 *
 * @param className - Additional CSS classes to merge with the component's default overlay classes
 * @returns The dialog overlay element with composed classes and `data-slot="dialog-overlay"`
 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the dialog's content container inside a portal with an overlay and an integrated close control.
 *
 * @param className - Additional CSS class names to apply to the dialog content container
 * @param children - Elements rendered inside the dialog content
 * @returns A dialog content element rendered in a portal with an overlay and a built-in close button
 */
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * Container element for a dialog's header section.
 *
 * Merges the provided `className` with the component's default header layout classes and sets `data-slot="dialog-header"`.
 *
 * @param className - Additional CSS classes appended to the default header classes
 * @returns A `div` element styled and annotated for use as the dialog header
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

/**
 * Layout container for dialog actions and footer content.
 *
 * Arranges children vertically with reversed order on small screens and horizontally
 * aligned to the end on larger screens; applies responsive spacing between items.
 *
 * @param className - Additional CSS class names to apply to the container
 * @returns The rendered footer container element
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Title element for dialog content with standardized styling and dataset attribute.
 *
 * Renders a heading-styled element for use as the dialog's title and applies the
 * `data-slot="dialog-title"` attribute plus default typography classes.
 *
 * @returns The dialog title element with composed classes and `data-slot="dialog-title"`.
 */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders the dialog's descriptive text element with standardized styling and a `data-slot="dialog-description"` attribute.
 *
 * @param className - Additional CSS classes to append to the base description styles
 * @returns The rendered dialog description element
 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};