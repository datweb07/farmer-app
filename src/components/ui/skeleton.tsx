import { cn } from "./utils";

/**
 * Render a styled skeleton placeholder element.
 *
 * @param className - Additional CSS class names to merge with the default skeleton styles
 * @param props - Additional HTML attributes and event handlers applied to the root div
 * @returns A div element with `data-slot="skeleton"`, the default skeleton classes merged with `className`, and any remaining props spread onto it
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };