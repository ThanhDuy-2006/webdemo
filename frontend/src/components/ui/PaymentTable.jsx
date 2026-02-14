import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function PaymentTable() {
  const data = [
    { id: 1, status: "Success", email: "ken99@example.com", amount: 316.00 },
    { id: 2, status: "Success", email: "abe45@example.com", amount: 242.00 },
    { id: 3, status: "Processing", email: "monserrat44@example.com", amount: 837.00 },
    { id: 4, status: "Failed", email: "carmella@example.com", amount: 721.00 },
    { id: 5, status: "Pending", email: "jason78@example.com", amount: 450.00 },
    { id: 6, status: "Success", email: "sarah23@example.com", amount: 1280.00 },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl border shadow-sm p-6 text-slate-900">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
           <p className="text-slate-500">Manage your payments.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
            Add Payment
        </button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 w-12"><input type="checkbox" className="rounded border-slate-300" /></th>
              <th className="p-4 font-medium text-slate-500">Status</th>
              <th className="p-4 font-medium text-slate-500">Email</th>
              <th className="p-4 font-medium text-slate-500 text-right">Amount</th>
              <th className="p-4 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                <td className="p-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                <td className="p-4">
                    <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        row.status === "Success" && "bg-green-50 text-green-700 ring-green-600/20",
                        row.status === "Processing" && "bg-blue-50 text-blue-700 ring-blue-600/20",
                        row.status === "Failed" && "bg-red-50 text-red-700 ring-red-600/20",
                        row.status === "Pending" && "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
                    )}>
                        {row.status}
                    </span>
                </td>
                <td className="p-4 text-slate-700">{row.email}</td>
                <td className="p-4 text-right font-medium text-slate-900">${row.amount.toFixed(2)}</td>
                <td className="p-4 text-center">
                    <button className="text-slate-400 hover:text-slate-900">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">0 of {data.length} row(s) selected.</div>
        <div className="flex gap-2">
            <button className="px-3 py-1 border rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 border rounded-md text-sm font-medium hover:bg-slate-50">Next</button>
        </div>
      </div>
    </div>
  );
}
