import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace("PKR", "₨");
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calculateDaysOverdue(lastPaymentDate: string): number {
  const today = new Date();
  const lastPayment = new Date(lastPaymentDate);
  return Math.floor(
    (today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
