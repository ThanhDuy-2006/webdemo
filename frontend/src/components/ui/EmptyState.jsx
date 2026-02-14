import { ShoppingCart } from "lucide-react";
import { cn } from "../../lib/utils";
import { Link } from "react-router-dom";

export function EmptyState({ 
    icon: Icon = ShoppingCart, 
    title = "Trống", 
    description = "Chưa có dữ liệu nào.", 
    actionLabel, 
    actionLink,
    className 
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="bg-white/10 p-4 rounded-full mb-4">
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-6">{description}</p>
      {actionLabel && actionLink && (
        <Link 
            to={actionLink} 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-900/90 h-10 px-4 py-2"
        >
            {actionLabel}
        </Link>
      )}
    </div>
  );
}
