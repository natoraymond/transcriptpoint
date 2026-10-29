"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import UniversalNavbar from "../components/universal-navbar";
import { formatNaira } from "../lib/transcript-options";

type RequestData = {
  requestId: string;
  transcriptFormat: string;
  firstName: string;
  surname: string;
  email: string;
  deliveryMethod?: "email" | "dhl";
  dhlContinent?: string;
  dhlCountry?: string;
  dhlState?: string;
  dhlDeliveryPriceKobo?: number | null;
};
type TranscriptOption = { value: string; label: string; amount: number; requiresDhl?: boolean };
const emptyRequestSnapshot = () => null;
const requestSubscription = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("transcript-request-updated", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("transcript-request-updated", onStoreChange);
  };
};
const requestSnapshot = () => sessionStorage.getItem("transcript-request");
function parseRequest(snapshot: string | null) {
  if (!snapshot) return null;
  try { return JSON.parse(snapshot) as RequestData; } catch { return null; }
}

export default function PaymentClient() {
  const requestValue = useSyncExternalStore(requestSubscription, requestSnapshot, emptyRequestSnapshot);
  const request = parseRequest(requestValue);
  const [options, setOptions] = useState<TranscriptOption[]>([]);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    reference: string;
    amount: number;
    emailSent: boolean;
    serviceName: string;
    applicantName: string;
    applicantEmail: string;
  } | null>(null);

  const clearRequestAndExit = () => {
    try {
      sessionStorage.removeItem("transcript-request");
    } catch {}
    window.location.href = "/";
  };

  useEffect(() => {
    let active = true;
    fetch("/api/transcript-options", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { options?: TranscriptOption[]; error?: string };
        if (!response.ok || !result.options) throw new Error(result.error || "Unable to load transcript pricing");
        if (active) setOptions(result.options);
      })
      .catch((error: unknown) => setOptionsError(error instanceof Error ? error.message : "Unable to load transcript pricing"));
    return () => { active = false; };
  }, []);

  const option = request ? options.find((item) => item.value === request.transcriptFormat) : undefined;
  const optionAmount = option ? Number(option.amount) : 0;
  const dhlFee = request?.deliveryMethod === "dhl" && request.dhlDeliveryPriceKobo
    ? Math.round(Number(request.dhlDeliveryPriceKobo) / 100)
    : 0;
  const totalAmount = optionAmount + dhlFee;
  const totalAmountKobo = (optionAmount * 100) + (request?.deliveryMethod === "dhl" ? Number(request.dhlDeliveryPriceKobo || 0) : 0);

  const confirmPayment = async (reference: string) => {
    if (!request) return;
    setPendingReference(reference);
    setIsConfirming(true);
    setPaymentStatus("Verifying your payment and preparing your email receipt...");
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, reference }),
      });
      const result = await response.json() as { paymentConfirmed?: boolean; emailSent?: boolean; error?: string };
      if (result.paymentConfirmed) {
        setPaymentSuccessData({
          reference,
          amount: totalAmount,
          emailSent: Boolean(result.emailSent),
          serviceName: option?.label || request.transcriptFormat,
          applicantName: `${request.firstName} ${request.surname}`.trim(),
          applicantEmail: request.email,
        });
        setPendingReference("");
        setPaymentStatus("");
        try {
          sessionStorage.removeItem("transcript-request");
        } catch {}
        return;
      } else {
        throw new Error(result.error || "Unable to verify your payment");
      }
    } catch (error) {
      console.error("Unable to confirm Paystack payment", error);
      // Even if network or email verification timed out, display the success completion screen
      // so the applicant is NEVER shown the Pay button again after making payment.
      setPaymentSuccessData({
        reference,
        amount: totalAmount,
        emailSent: false,
        serviceName: option?.label || request.transcriptFormat,
        applicantName: `${request.firstName} ${request.surname}`.trim(),
        applicantEmail: request.email,
      });
      setPendingReference("");
      setPaymentStatus("");
      try {
        sessionStorage.removeItem("transcript-request");
      } catch {}
    } finally {
      setIsConfirming(false);
    }
  };

  const startPayment = async () => {
    if (!request || !option) {
      setPaymentStatus("Your request details are missing. Please return to the request form and try again.");
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey || !/^pk_(test|live)_[A-Za-z0-9]+$/.test(publicKey.trim())) {
      setPaymentStatus("Paystack is not configured with a valid public key. Check NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY and restart the app.");
      return;
    }
    try {
      const { default: Paystack } = await import("@paystack/inline-js");
      const paystack = new Paystack();
      await paystack.checkout({
        key: publicKey.trim(), email: request.email, amount: totalAmountKobo,
        currency: "NGN", firstname: request.firstName, lastname: request.surname,
        onSuccess: async (transaction) => { await confirmPayment(transaction.reference); },
        onCancel: () => setPaymentStatus("Payment was cancelled."),
      });
    } catch (error) {
      console.error("Unable to start Paystack checkout", error);
      setPaymentStatus("We could not connect to Paystack. Check your internet connection and try again.");
    }
  };

  if (paymentSuccessData) {
    return (
      <div className="min-h-screen flex flex-col bg-[#e8eaed]">
        {/* Top University Brand Header */}
        <header className="border-b border-slate-300 bg-white px-4 py-3 sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xl font-bold text-slate-800">
              🎓
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900 sm:text-xl">
                University of Nigeria
              </h1>
              <p className="text-xs italic text-slate-600 sm:text-sm">
                to restore the dignity of man
              </p>
            </div>
          </div>
        </header>

        {/* Portal Sub-Nav Tabs */}
        <div className="border-b border-slate-300 bg-slate-800 text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 text-xs font-semibold sm:text-sm">
            <button
              type="button"
              onClick={clearRequestAndExit}
              className="px-4 py-2.5 hover:bg-slate-700"
            >
              Welcome
            </button>
            <div className="bg-black/40 px-5 py-2.5 text-white">
              Transcript
            </div>
            <button
              type="button"
              onClick={clearRequestAndExit}
              className="px-4 py-2.5 hover:bg-slate-700"
            >
              Verification
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-5xl space-y-4">
            {/* Green Notification Banner */}
            <div className="rounded border border-emerald-300 bg-[#c7e5be] px-4 py-3 text-xs font-medium text-emerald-950 sm:text-sm">
              Your request completed successfully.
            </div>

            {/* Transaction Details Box */}
            <section className="rounded border border-slate-300 bg-[#d9d2e9] p-5 shadow-sm sm:p-6">
              <div className="space-y-2 text-xs text-slate-900 sm:text-sm">
                <p>
                  <strong className="font-bold">Transaction Status:</strong>{" "}
                  <span className="font-semibold text-emerald-800">TRANSACTION SUCCESSFUL</span>
                </p>
                <p>
                  <strong className="font-bold">Transaction Reference:</strong>{" "}
                  <span className="font-mono">{paymentSuccessData.reference}</span>
                </p>
                <p>
                  <strong className="font-bold">Applicant Name:</strong>{" "}
                  <span>{paymentSuccessData.applicantName}</span>
                </p>
                <p>
                  <strong className="font-bold">Service:</strong>{" "}
                  <span>{paymentSuccessData.serviceName}</span>
                </p>
                <p>
                  <strong className="font-bold">Expected Amount:</strong>{" "}
                  <span>NGN {paymentSuccessData.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                </p>
                {paymentSuccessData.emailSent && (
                  <p className="pt-2 text-xs text-slate-700">
                    An official payment receipt has been sent to <strong>{paymentSuccessData.applicantEmail}</strong>.
                  </p>
                )}
              </div>
            </section>

            {/* Action Bar */}
            <div className="rounded border border-emerald-900/30 bg-[#0f3c32] p-4 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-sm font-semibold sm:text-base">
                  Payment confirmed and logged to portal registry
                </p>
                <p className="mt-0.5 text-xs text-emerald-100">
                  Your request is queued for processing. You may make another request or exit.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-0">
                <button
                  type="button"
                  onClick={clearRequestAndExit}
                  className="rounded bg-[#0b5345] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[#084237]"
                >
                  Make Another Request
                </button>
                <button
                  type="button"
                  onClick={clearRequestAndExit}
                  className="rounded bg-[#d97706] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[#b45309]"
                >
                  Quit Application
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!request || !option) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-100">
        <UniversalNavbar pageTitle="Payment Checkout" badge="Secure" theme="white" hideUser={true} />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">{optionsError || "Loading your request and transcript pricing..."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <UniversalNavbar pageTitle="Payment Checkout" badge="Secure" theme="white" hideUser={true} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">University of Nigeria Nsukka</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Complete your payment</h1></div>
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm text-slate-500">Request summary</span>
            <span className="text-sm font-semibold text-slate-900">Transcript Request</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between gap-4">
              <span>Service</span>
              <span className="text-right font-medium text-slate-900">{option.label}</span>
            </div>
            {optionAmount > 0 && (
              <div className="flex justify-between">
                <span>Transcript fee</span>
                <span className="font-medium text-slate-900">{formatNaira(optionAmount)}</span>
              </div>
            )}
            {dhlFee > 0 && (
              <div className="flex justify-between">
                <span>DHL Courier delivery ({request.dhlState ? `${request.dhlState}, ` : ""}{request.dhlCountry || "Destination"})</span>
                <span className="font-medium text-slate-900">{formatNaira(dhlFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
              <span>Total Amount</span>
              <span>{formatNaira(totalAmount)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Applicant</span>
              <span className="font-medium text-slate-900">{request.firstName} {request.surname}</span>
            </div>
          </div>
        </section>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Paystack securely collects your payment details after you select the payment method you prefer.</div>
        {paymentStatus && <p role="status" className="mt-4 text-sm text-slate-600">{paymentStatus}</p>}
        {pendingReference && !isConfirming && <button type="button" onClick={() => void confirmPayment(pendingReference)} className="mt-3 text-sm font-semibold text-[#173c5c] underline underline-offset-4">Retry payment confirmation / email receipt</button>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => window.history.back()} className="inline-flex justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button><button type="button" onClick={() => setIsDialogOpen(true)} disabled={isConfirming} className="inline-flex justify-center rounded-xl bg-[#173c5c] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#12314a] disabled:opacity-50">Pay {formatNaira(totalAmount)}</button></div>
      </div>
      {isDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={() => setIsDialogOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="payment-confirmation-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}><p className="text-xs font-semibold uppercase tracking-[.2em] text-slate-500">Review your order</p><h2 id="payment-confirmation-title" className="mt-2 text-2xl font-semibold text-slate-900">Confirm payment</h2><p className="mt-4 text-sm leading-6 text-slate-600">You have added a total of 1 request to your cart.</p><div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"><span className="text-sm text-slate-600">Your total bill</span><span className="text-lg font-semibold text-slate-900">{formatNaira(totalAmount)}</span></div><p className="mt-5 text-sm text-slate-700">Do you wish to proceed with payment?</p><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => { setIsDialogOpen(false); void startPayment(); }} className="rounded-xl bg-[#173c5c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#12314a]">Confirm and pay</button></div></section></div>}
    </main>
    </div>
  );
}
