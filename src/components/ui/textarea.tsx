import * as React from "react";

import { cn } from "./utils";

/**
 * Render a styled textarea element that forwards all received textarea props.
 *
 * Applies the component's default styling and composes any provided `className`.
 *
 * @param className - Additional CSS class names to append to the default styles
 * @param props - Remaining textarea attributes and event handlers forwarded to the element
 * @returns The rendered textarea element with composed classes and forwarded props
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };