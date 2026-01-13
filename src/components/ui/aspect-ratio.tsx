"use client";

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

/**
 * Wraps the Radix UI AspectRatio Root component, forwarding all received props and adding a `data-slot="aspect-ratio"` attribute.
 *
 * @param props - Props forwarded to the underlying `AspectRatioPrimitive.Root` component.
 * @returns A React element rendering the aspect-ratio root with the forwarded props and the `data-slot="aspect-ratio"` attribute.
 */
function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };