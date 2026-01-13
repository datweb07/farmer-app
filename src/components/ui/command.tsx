"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";

import { cn } from "./utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

/**
 * Renders a styled Command primitive used as the command-palette container.
 *
 * Applies a default full-size, rounded, columnar layout and sets `data-slot="command"`;
 * any provided `className` is merged with these defaults.
 *
 * @returns The rendered CommandPrimitive element with slot and styling applied.
 */
function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Render a Dialog-wrapped command palette with configurable header text.
 *
 * Renders a Dialog containing an accessible header (title and description) and a Command container
 * prewired with styling for the command palette layout.
 *
 * @param title - Visible title for the dialog header
 * @param description - Short description shown under the title for screen readers
 * @param children - Command primitive children (input, list, groups, items, etc.) to render inside the palette
 * @returns A Dialog element containing the command palette layout
 */
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Renders the command palette's search input with an inline search icon.
 *
 * Wraps the Cmdk Input in a styled wrapper, sets data-slot attributes for styling/slot targeting,
 * and accepts all props supported by `CommandPrimitive.Input`.
 *
 * @returns The wrapper element containing the search icon and the styled command input
 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Renders the scrollable list container used by the command palette.
 *
 * The returned element is a `CommandPrimitive.List` preconfigured with a maximum
 * height, vertical scrolling, and merged `className` support.
 *
 * @returns The `CommandPrimitive.List` element serving as the command list container
 * with max-height 300px, vertical overflow enabled, and horizontal overflow hidden.
 */
function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the empty-state placeholder shown when the command list has no items.
 *
 * @param props - Props forwarded to the underlying `CommandPrimitive.Empty` element.
 * @returns The empty-state element displayed inside the command list when there are no matching items.
 */
function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  );
}

/**
 * Renders a styled group container for organizing command palette items.
 *
 * @returns A `CommandPrimitive.Group` element with applied layout and heading styles.
 */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a thin visual separator used between command groups or items in the command palette.
 *
 * @returns A styled separator element.
 */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  );
}

/**
 * Renders a styled command list item element for use inside the command palette.
 *
 * The component applies a data-slot of "command-item", merges provided `className` with
 * the component's default styling, and forwards all other props to the underlying item.
 *
 * @param className - Additional CSS class names to merge with the component's defaults
 * @param props - Props forwarded to the underlying command item element
 * @returns A React element representing a command palette item
 */
function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a styled span for displaying a keyboard shortcut or key hint.
 *
 * The element is marked with `data-slot="command-shortcut"` and applies muted,
 * right-aligned, small-caps-like styling suitable for shortcut labels.
 *
 * @returns A span element containing the shortcut text or nodes
 */
function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};