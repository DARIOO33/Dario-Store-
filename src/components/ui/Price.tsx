import { formatAmount } from "@/src/lib/money";

export default function Price({ millimes, className }: { millimes: number; className?: string }) {
  return (
    <span className={`price${className ? ` ${className}` : ""}`}>
      <span>{formatAmount(millimes)}</span>
      <small>DT</small>
    </span>
  );
}
