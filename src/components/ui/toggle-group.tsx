"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { toggleVariants } from "./toggle";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

/**
 * Render a styled toggle group root and provide `variant` and `size` to descendant items via context.
 *
 * @param className - Additional classes to apply to the root element
 * @param variant - Visual variant to apply and supply to descendants (e.g., "default", "outline")
 * @param size - Size token to apply and supply to descendants (e.g., "default", "sm", "lg")
 * @param children - Child elements to render inside the toggle group
 * @returns The ToggleGroup root element with composed classes, data attributes, and a context provider for `variant` and `size`
 */
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

/**
 * Renders a toggle group item that inherits `variant` and `size` from the surrounding ToggleGroup context when available.
 *
 * The component sets `data-slot="toggle-group-item"` and `data-variant`/`data-size` attributes based on the resolved values, and composes its className from the resolved `variant`/`size`, base layout styles, and any provided `className`.
 *
 * @param className - Additional class names to apply to the item
 * @param children - Node(s) rendered inside the item
 * @param variant - Variant to use when no variant is provided by context
 * @param size - Size to use when no size is provided by context
 * @returns A configured ToggleGroup item element with resolved styling and attributes
 */
function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };