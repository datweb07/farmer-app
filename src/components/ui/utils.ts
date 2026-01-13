import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose and optimize Tailwind CSS class names.
 *
 * Accepts class name values (strings, arrays, objects) and normalizes them into a single
 * class string, then merges Tailwind utility classes to resolve conflicts.
 *
 * @param inputs - Class name values to compose (e.g., strings, arrays, objects)
 * @returns The resulting class string with Tailwind-specific conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}