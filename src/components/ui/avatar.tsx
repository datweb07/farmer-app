"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "./utils";

/**
 * Render a Radix Avatar Root element with default avatar styles and optional additional classes.
 *
 * @param className - Additional CSS classes to append to the component's default avatar styling
 * @returns A Radix Avatar Root element with base avatar styles merged with `className`
 */
function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a Radix Avatar Image with a square aspect ratio and full-size sizing, merging any provided `className` and forwarding all props.
 *
 * @returns The configured Radix Avatar Image element.
 */
function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

/**
 * Renders an avatar fallback element used when the avatar image is unavailable.
 *
 * The element includes default styling for size, shape, and alignment and forwards all other props to the underlying Radix Fallback primitive.
 *
 * @param className - Additional CSS classes to merge with the component's default classes (`bg-muted flex size-full items-center justify-center rounded-full`)
 * @returns The configured Radix Avatar Fallback element
 */
function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };