import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "./utils";

/**
 * Renders a nav element configured as a breadcrumb landmark.
 *
 * @returns A <nav> element with `aria-label="breadcrumb"`, `data-slot="breadcrumb"`, and any provided props applied.
 */
function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

/**
 * Container for breadcrumb items rendered as an ordered list.
 *
 * Applies the component's default layout and styling and merges any provided `className`.
 *
 * @param className - Additional CSS classes to append to the default breadcrumb-list classes
 * @returns The rendered `<ol>` element used as the breadcrumb list
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a list item element intended for use as a breadcrumb item.
 *
 * @param className - Additional className(s) to merge with the component's base styles
 * @param props - Remaining props forwarded to the underlying `<li>` element
 * @returns The rendered breadcrumb `<li>` element
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

/**
 * Renders a breadcrumb link element with consistent styling and optional Slot composition.
 *
 * When `asChild` is true, the component forwards rendering to a Radix `Slot` so a custom child
 * element can receive the breadcrumb link props and styling; otherwise it renders a native `<a>`.
 *
 * @param asChild - If true, use a `Slot` to render a custom child element instead of an `<a>`
 * @returns The rendered breadcrumb link element with `data-slot="breadcrumb-link"` and composed classes
 */
function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
}

/**
 * Renders the current breadcrumb page as a link-like span.
 *
 * Produces a <span> with role="link", aria-current="page", and aria-disabled="true" to mark the active page in a breadcrumb trail. Accepts standard span props and merges a provided `className` with the component's default styling.
 *
 * @returns The rendered span element representing the active page in the breadcrumb.
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

/**
 * Renders the breadcrumb separator list item used between breadcrumb entries.
 *
 * The separator is decorative and hidden from assistive technology. If `children`
 * is provided it will be used as the separator content; otherwise a right-chevron
 * icon is rendered.
 *
 * @param children - Custom separator content to render in place of the default chevron
 * @returns The rendered `<li>` element acting as the breadcrumb separator
 */
function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

/**
 * Renders an ellipsis indicator used within a breadcrumb trail.
 *
 * @returns A span element with `role="presentation"` containing a horizontal-more icon and a screen-reader-only "More" label.
 */
function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};