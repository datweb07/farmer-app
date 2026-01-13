import * as React from "react";

import { cn } from "./utils";

/**
 * Renders a styled card container and forwards all additional props to the root div.
 *
 * @param className - Additional CSS class names to merge with the card's base styles
 * @param props - Other props are passed through to the underlying `div` element
 * @returns The rendered `div` element serving as the card container
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card header container used within the Card layout.
 *
 * Renders a div with the `data-slot="card-header"` attribute, applies the card header layout styles, and forwards all provided props to the underlying element.
 *
 * @returns The rendered card header DOM element.
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders an h4 element to serve as the card's title.
 *
 * @param className - Optional additional CSS class names to apply to the title
 * @returns An `h4` element representing the card title
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  );
}

/**
 * Render a paragraph element used as a card's description.
 *
 * @param className - Additional CSS class names to merge with the component's default styling
 * @param props - Additional props are forwarded to the underlying `<p>` element
 * @returns A `<p>` element representing the card description
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Renders the card's action area, positioned and aligned within the card layout.
 *
 * Applies a `data-slot="card-action"` attribute and merges the component's positioning
 * and alignment classes with any provided `className`, then forwards remaining props
 * to the underlying `div`.
 *
 * @returns A `div` element used as the card's action area
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the card's content container.
 *
 * Applies horizontal padding and removes bottom padding for the last child, merges any provided `className`, and forwards remaining div props.
 *
 * @returns A `div` element serving as the card content area.
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

/**
 * Renders the footer area of a Card with horizontal padding, bottom padding, and top border spacing.
 *
 * @returns A `div` element with `data-slot="card-footer"` that serves as the card's footer container.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};