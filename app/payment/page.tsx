import { Suspense } from "react";
import PaymentClient from "./payment-client";

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading checkout...</p>
      </div>
    }>
      <PaymentClient />
    </Suspense>
  );
}
