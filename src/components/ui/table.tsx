"use client";

import * as React from "react";

import { cn } from "./utils";

/**
 * Renders a responsive table element inside a horizontally scrollable container.
 *
 * @param className - Additional class names to apply to the inner `table` element
 * @returns A `div` wrapping the `table` element with overflow handling and applied classes
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

/**
 * Renders a styled <thead> element used as the table header section.
 *
 * @param className - Optional additional CSS class names to merge with the component's base header styles
 * @returns The rendered `<thead>` element
 */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

/**
 * Renders a tbody element with a data-slot and default styling that removes the bottom border from the last row.
 *
 * @param className - Additional className(s) appended to the component's default styling
 * @param props - Remaining props forwarded to the underlying `tbody` element
 * @returns The rendered `tbody` element
 */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

/**
 * Renders a table footer element with predefined styling and a `data-slot="table-footer"` attribute.
 *
 * @param className - Additional class names to append to the component's base styles
 * @returns A `tfoot` element with the composed class names and all other props forwarded
 */
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a table row element (<tr>) with a slot and standardized row styling.
 *
 * Applies hover, selected-state, border, and transition classes, merges any provided
 * `className`, and forwards all other props to the underlying `<tr>` element.
 *
 * @returns A table row element with composed classes and forwarded props.
 */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a styled table header cell with a data-slot attribute and checkbox-aware spacing.
 *
 * @param className - Additional class name(s) to merge with the component's default header styles
 * @returns A `th` element with default header styling and the provided `className` merged in
 */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a table cell (<td>) with predefined padding, alignment, and checkbox-aware layout, while allowing additional classes.
 *
 * @param className - Optional additional CSS classes to merge with the component's base styles
 * @returns The rendered `<td>` element for use as a table cell
 */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a caption element for a table with preset muted styling and a data-slot attribute.
 *
 * @param className - Additional CSS classes to merge with the component's default styles
 * @param props - All other attributes accepted by a native `caption` element; they are passed through to the rendered element
 * @returns A `caption` React element with combined class names and `data-slot="table-caption"`
 */
function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};