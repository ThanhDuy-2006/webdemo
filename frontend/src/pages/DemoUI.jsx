import { PaymentTable } from "../components/ui/PaymentTable";
import BackButton from "../components/common/BackButton";
// import { ExerciseChart } from "../components/ui/ExerciseChart";
import { CreateAccountForm } from "../components/ui/CreateAccountForm";

export function DemoUI() {
  return (
    <div className="min-h-screen bg-slate-100 p-10 space-y-12">
        <BackButton fallbackPath="/" label="Back to App" />
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-slate-900">UI Components Demo</h1>
            <p className="text-slate-500">Shadcn-style Minimalist Design</p>
        </div>

        <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4 ml-4 border-l-4 border-slate-900 pl-2">1. Payment Table</h2>
            <PaymentTable />
        </section>

        {/* <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4 ml-4 border-l-4 border-slate-900 pl-2">2. Exercise Chart</h2>
            <ExerciseChart />
        </section> */}

        <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4 ml-4 border-l-4 border-slate-900 pl-2">3. Create Account Form</h2>
            <CreateAccountForm />
        </section>
    </div>
  );
}
