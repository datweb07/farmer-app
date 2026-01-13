import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "./utils";
import { Button, buttonVariants } from "./button";

/**
 * Renders a centered navigation container for pagination controls.
 *
 * @returns A `<nav>` element with role="navigation", aria-label="pagination", `data-slot="pagination"`, and a centered flex layout; merges any provided `className` and forwards remaining props.
 */
function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

/**
 * Renders the pagination content container used to group pagination items.
 *
 * @returns The rendered `ul` element with layout classes and `data-slot="pagination-content"`.
 */
function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

/**
 * Renders a list item element marked as a pagination item.
 *
 * @returns An `<li>` element with `data-slot="pagination-item"` and any provided props applied to it.
 */
function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

/**
 * Renders a styled pagination link element that reflects and exposes its active state.
 *
 * @param className - Additional CSS classes to apply to the link.
 * @param isActive - When `true`, marks the link as the current page (sets `aria-current="page"` and applies active styling).
 * @param size - Button size variant to use for styling; defaults to `"icon"`.
 * @param props - Additional anchor and button props which are forwarded to the underlying `<a>` element.
 * @returns The rendered anchor element for a pagination item.
 */
function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a pagination "previous" link with a left chevron and a responsive "Previous" label.
 *
 * @returns A `PaginationLink` element configured for the previous page: it has `aria-label="Go to previous page"`, `size="default"`, a left chevron icon, and a "Previous" text label that is hidden on small screens.
 */
function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

/**
 * Renders a "Next" pagination control that shows a right chevron and a label hidden on small screens.
 *
 * @returns A PaginationLink element representing the "Next" page button.
 */
function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

/**
 * Renders a visual, non-interactive ellipsis used to indicate additional pages.
 *
 * The element contains a horizontal-more icon and an offscreen "More pages" label for accessibility.
 *
 * @returns A span element used as the pagination ellipsis (icon plus screen-reader text).
 */
function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};