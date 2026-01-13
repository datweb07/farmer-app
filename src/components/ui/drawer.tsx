"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "./utils";

/**
 * Renders a drawer root element with a standardized `data-slot="drawer"` attribute.
 *
 * @returns A React element for the drawer root with all provided props forwarded and `data-slot="drawer"` applied.
 */
function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

/**
 * Renders the trigger element for a Drawer with a standardized data-slot.
 *
 * @returns The Drawer trigger element with data-slot="drawer-trigger" and forwarded props.
 */
function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

/**
 * Renders a DrawerPrimitive.Portal with a standardized `data-slot="drawer-portal"` attribute.
 *
 * @returns A DrawerPrimitive.Portal element with `data-slot="drawer-portal"` and all forwarded props
 */
function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

/**
 * Renders a drawer close trigger element with a standardized `data-slot`.
 *
 * @param props - Props forwarded to the underlying `DrawerPrimitive.Close` element.
 * @returns The rendered `DrawerPrimitive.Close` element with `data-slot="drawer-close"`.
 */
function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

/**
 * Renders the drawer backdrop overlay with backdrop styling and animation state classes.
 *
 * @param className - Additional CSS classes to merge with the overlay's default classes
 * @returns The overlay element used as the drawer backdrop
 */
function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the drawer's content inside a portal together with its overlay, applying responsive, direction-aware layout and styling.
 *
 * The container receives composed classes for top/bottom/left/right placements and includes a small drag handle when the drawer is positioned at the bottom.
 *
 * @param className - Additional class names to merge into the drawer content container
 * @param children - Elements to render inside the drawer content
 * @returns The composed drawer content element (wrapped in a portal and paired with the overlay)
 */
function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

/**
 * Header container for drawer content that applies standardized spacing and a data-slot for styling/selection.
 *
 * @param className - Additional CSS class names appended to the default header classes
 * @returns The rendered header div element with data-slot="drawer-header"
 */
function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

/**
 * Renders the drawer footer container with standardized spacing and a data-slot attribute.
 *
 * @param className - Additional class names to merge with the footer's base styles
 * @returns A div element used as the drawer footer with merged class names and forwarded props
 */
function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

/**
 * Renders a styled title element for drawer content.
 *
 * @param className - Additional CSS classes to merge with the default title styles
 * @returns A DrawerPrimitive.Title element with `data-slot="drawer-title"` and merged typography classes
 */
function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders the drawer's descriptive text element with standardized typography and a `data-slot="drawer-description"` attribute.
 *
 * @param className - Additional CSS classes to merge with the component's base typography styles
 * @returns The rendered `DrawerPrimitive.Description` React element
 */
function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};