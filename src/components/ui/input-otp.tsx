"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

import { cn } from "./utils";

/**
 * Composes and renders an OTPInput with standardized container and input class handling.
 *
 * Renders an `OTPInput` element with `data-slot="input-otp"`, applies a composed `containerClassName`
 * and `className`, and forwards all other props to the underlying `OTPInput`.
 *
 * @param containerClassName - Additional class names to merge into the OTP input container
 * @returns The rendered `OTPInput` element with composed container and input class names
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

/**
 * Renders a container for a group of OTP slots.
 *
 * The element is a div with a `data-slot="input-otp-group"` attribute and default horizontal layout and spacing. Additional `className` values are merged with the defaults, and any other div props are forwarded to the container.
 *
 * @param className - Additional class names to apply to the container
 * @returns The rendered div element used as the OTP slots group container
 */
function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

/**
 * Renders a single OTP slot that displays the slot character and an optional caret.
 *
 * Reads the OTP slot state for the given index and renders a div marked with
 * `data-slot="input-otp-slot"` and `data-active` reflecting the slot's active state.
 *
 * @param index - The zero-based index of the OTP slot to render
 * @returns The rendered OTP slot element containing the slot character and, if present, a fake caret indicator
 */
function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm bg-input-background transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
}

/**
 * Renders a visual separator between OTP slots.
 *
 * @param props - Additional HTML div attributes and event handlers applied to the separator container.
 * @returns A div with `role="separator"`, `data-slot="input-otp-separator"`, and a `MinusIcon` child.
 */
function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };