import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine multiple class value inputs into a single class string and resolve Tailwind utility conflicts.
 *
 * @param inputs - One or more class values (strings, arrays, objects, etc.) to be merged
 * @returns The resulting class string with duplicates normalized and Tailwind class conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}