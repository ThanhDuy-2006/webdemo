import { cn } from "../../lib/utils";

const variants = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline: "text-slate-950 border border-slate-200 hover:bg-slate-100",
  success: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  failure: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  warning: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20",
  processing: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2", variants[variant], className)} {...props} />
  );
}
