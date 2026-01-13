"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/**
 * Renders a Collapsible root element and forwards all received props to it.
 *
 * @param props - Props to apply to the underlying Collapsible root element.
 * @returns A Collapsible root element with a `data-slot="collapsible"` attribute.
 */
function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/**
 * Renders a Radix `CollapsibleTrigger` element and forwards all received props.
 *
 * @param props - Props forwarded to the underlying Radix `CollapsibleTrigger` primitive.
 * @returns A `CollapsibleTrigger` React element with a `data-slot="collapsible-trigger"` attribute.
 */
function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

/**
 * Renders a CollapsibleContent wrapper that forwards all props to the underlying Radix CollapsibleContent and sets a `data-slot="collapsible-content"`.
 *
 * @param props - Props to apply to the underlying CollapsibleContent element; all props are forwarded unchanged.
 * @returns The rendered CollapsibleContent element with the `data-slot="collapsible-content"` attribute.
 */
function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };