"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "./utils";

/**
 * Renders a ContextMenu root element with a data-slot of "context-menu".
 *
 * @param props - Props forwarded to the underlying Radix ContextMenu.Root
 * @returns A React element for the ContextMenu root with `data-slot="context-menu"`
 */
function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

/**
 * Renders a context menu trigger element with a standardized `data-slot` attribute and forwards all props.
 *
 * @returns A React element that serves as the context menu trigger with `data-slot="context-menu-trigger"`.
 */
function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  );
}

/**
 * Renders a grouped container for context menu items with a standardized `data-slot`.
 *
 * @returns A `ContextMenuPrimitive.Group` element with `data-slot="context-menu-group"` and all provided props forwarded.
 */
function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  );
}

/**
 * Renders a Radix context menu Portal with a standardized data-slot and forwarded props.
 *
 * @returns A ContextMenu Portal element with `data-slot="context-menu-portal"` and all received props forwarded.
 */
function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  );
}

/**
 * Renders a context menu submenu element with data-slot "context-menu-sub" and forwards received props.
 *
 * @returns A React element representing the context menu submenu with `data-slot="context-menu-sub"` and all provided props forwarded to the underlying element.
 */
function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

/**
 * Wraps Radix's ContextMenu RadioGroup and attaches a consistent `data-slot` attribute.
 *
 * Forwards all props to `ContextMenuPrimitive.RadioGroup`.
 *
 * @param props - Props passed to the underlying Radix RadioGroup
 * @returns The rendered RadioGroup element with `data-slot="context-menu-radio-group"`
 */
function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  );
}

/**
 * Renders a styled submenu trigger for a context menu.
 *
 * Renders a Radix ContextMenu SubTrigger with data-slot "context-menu-sub-trigger", optional inset spacing, composed styling, and a right-aligned chevron indicating a submenu.
 *
 * @param inset - When true, applies inset padding appropriate for nested items.
 * @returns The rendered SubTrigger element configured for use as a submenu trigger.
 */
function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

/**
 * Renders styled submenu content for a context menu.
 *
 * Applies consistent styling, animations, and a data-slot of `"context-menu-sub-content"`.
 * Merges any provided `className` with the default styles and forwards remaining props to the underlying Radix SubContent.
 *
 * @param className - Additional class names to merge with the component's default styles
 * @returns The submenu content element with applied styling, animations, and merged `className`
 */
function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders styled context menu content inside a Portal.
 *
 * The component applies a default set of positioning, animation, and appearance classes,
 * merges any provided `className` with those defaults, and forwards all other props to
 * Radix's `ContextMenuPrimitive.Content`.
 *
 * @param className - Additional class names to merge with the component's default styles.
 * @param props - Remaining props are passed through to `ContextMenuPrimitive.Content`.
 * @returns A JSX element representing the context menu content rendered in a Portal with a `data-slot="context-menu-content"` attribute.
 */
function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

/**
 * Render a styled context menu item with optional inset padding and visual variants.
 *
 * @param className - Additional CSS class names to merge with the component's default styles.
 * @param inset - If true, apply inset padding to align the item with other inset elements.
 * @param variant - Visual variant of the item; `"destructive"` applies destructive styling, `"default"` applies standard styling.
 * @param props - Other props are applied to the rendered element.
 * @returns The rendered context menu item element.
 */
function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a styled context menu checkbox item with an embedded check indicator.
 *
 * @param checked - Whether the checkbox item is selected.
 * @returns A React element representing the context menu checkbox item.
 */
function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

/**
 * Renders a styled context-menu radio item with a leading circular selection indicator and forwards all props to Radix's `RadioItem`.
 *
 * Adds `data-slot="context-menu-radio-item"`, composes a default set of classes with any provided `className`, and renders a left-aligned `ItemIndicator` containing a `CircleIcon`.
 *
 * @param className - Additional CSS class names to merge with the component's default classes.
 * @param children - Content to display as the item's label.
 * @returns The rendered `ContextMenuPrimitive.RadioItem` element with applied attributes, classes, and indicator.
 */
function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

/**
 * Renders a context menu label element with consistent styling and an optional inset.
 *
 * Applies standard label typography and spacing, and when `inset` is `true` adds left padding suitable for items with an indicator.
 *
 * @param className - Additional class names to merge with the default styles.
 * @param inset - If `true`, applies inset padding to align text with items that have leading indicators.
 * @returns A styled context menu label element with data-slot and data-inset attributes.
 */
function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a styled separator for context menus.
 *
 * @param className - Additional CSS classes to apply to the separator element
 * @returns A separator element styled for use in context menus
 */
function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

/**
 * Renders a styled span for displaying keyboard shortcuts in a context menu.
 *
 * @returns A `span` element containing the shortcut text with slot attribute `data-slot="context-menu-shortcut"` and composed styling for muted, right-aligned shortcut text.
 */
function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};