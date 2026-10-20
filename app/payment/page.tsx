import { redirect } from "next/navigation";
import PaymentClient from "./payment-client";
import { getCurrentUser } from "../lib/auth";

export default async function PaymentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fpayment");
  return <PaymentClient />;
}
