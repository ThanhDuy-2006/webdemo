import { Github, Chrome } from "lucide-react";

export function CreateAccountForm() {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border shadow-sm p-8 text-slate-900">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
        <p className="text-sm text-slate-500 mt-1">Enter your email below to create your account</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button className="flex-1 flex items-center justify-center gap-2 border rounded-md py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
            <Github className="w-4 h-4" /> GitHub
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 border rounded-md py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
             {/* Dummy Google Icon using Chrome lucide or text */}
             <span className="font-bold text-lg">G</span> Google
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">Or continue with</span>
        </div>
      </div>

      <form className="space-y-4">
        <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
            <input 
                type="email" 
                placeholder="m@example.com" 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
            />
        </div>
        <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
            <input 
                type="password" 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
            />
        </div>
        
        <button className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium hover:bg-slate-800 transition-colors">
            Create Account
        </button>
      </form>
    </div>
  );
}
