"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { formatNaira } from "../lib/transcript-options";

type RequestData = {
  requestId: string;
  transcriptFormat: string;
  firstName: string;
  surname: string;
  email: string;
};

type TranscriptOption = { value: string; label: string; amount: number };

const emptyRequestSnapshot = () => null;
const requestSubscription = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};
const requestSnapshot = () => sessionStorage.getItem("transcript-request");

function parseRequest(snapshot: string | null) {
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(snapshot) as RequestData;
  } catch {
    return null;
  }
}

export default function PaymentPage() {
  const requestSnapshotValue = useSyncExternalStore(
    requestSubscription,
    requestSnapshot,
    emptyRequestSnapshot,
  );
  const request = parseRequest(requestSnapshotValue);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [transcriptOptions, setTranscriptOptions] = useState<TranscriptOption[]>([]);
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/transcript-options", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { options?: TranscriptOption[]; error?: string };
        if (!response.ok || !result.options) throw new Error(result.error || "Unable to load transcript pricing");
        if (isMounted) setTranscriptOptions(result.options);
      })
      .catch((error) => {
        if (isMounted) setOptionsError(error instanceof Error ? error.message : "Unable to load transcript pricing");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const transcriptOption = request
    ? transcriptOptions.find((option) => option.value === request.transcriptFormat)
    : undefined;

  const confirmPayment = async (reference: string) => {
    if (!request) return;

    setPendingReference(reference);
    setIsConfirmingPayment(true);
    setPaymentStatus("Verifying your payment and preparing your email receipt...");

    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, reference }),
      });
      const result = (await response.json()) as {
        paymentConfirmed?: boolean;
        emailSent?: boolean;
        error?: string;
      };

      if (result.paymentConfirmed && result.emailSent) {
        setPaymentStatus(`Payment successful. Your receipt was emailed to ${request.email}.`);
      } else if (result.paymentConfirmed) {
        setPaymentStatus("Payment is confirmed, but the receipt email could not be sent yet. Please retry shortly.");
      } else {
        throw new Error(result.error || "Unable to verify your payment");
      }
    } catch (error) {
      console.error("Unable to confirm Paystack payment", error);
      setPaymentStatus(
        "We could not finish confirming your payment or email receipt. Please retry; do not pay again.",
      );
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handlePayment = async () => {
    if (!request || !transcriptOption) {
      setPaymentStatus("Your request details are missing. Please return to the form and try again.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    if (!publicKey) {
      setPaymentStatus("Payment is not configured yet. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to your environment.");
      return;
    }

    try {
      const { default: Paystack } = await import("@paystack/inline-js");
      const paystack = new Paystack();
      await paystack.checkout({
        key: publicKey,
        email: request.email,
        amount: transcriptOption.amount * 100,
        currency: "NGN",
        firstname: request.firstName,
        lastname: request.surname,
        onSuccess: async (transaction) => {
          await confirmPayment(transaction.reference);
        },
        onCancel: () => {
          setPaymentStatus("Payment was cancelled.");
        },
      });
    } catch (error) {
      console.error("Unable to start Paystack checkout", error);
      setPaymentStatus(
        "We could not connect to Paystack. Check your internet connection and try again.",
      );
    }
  };

  if (!request || !transcriptOption) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">{optionsError || "Loading your request and transcript pricing..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Payment
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Complete your payment
          </h1>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm text-slate-500">Request summary</span>
            <span className="text-sm font-semibold text-slate-900">Transcript Request</span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Service</span>
                <span className="text-right font-medium text-slate-900">{transcriptOption.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Amount</span>
                <span className="font-medium text-slate-900">{formatNaira(transcriptOption.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Applicant</span>
                <span className="font-medium text-slate-900">{request.firstName} {request.surname}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Paystack securely collects your payment details after you select the payment method you prefer.
        </div>

        {paymentStatus && <p className="mt-4 text-sm text-slate-600">{paymentStatus}</p>}

        {pendingReference && !isConfirmingPayment && (
          <button
            type="button"
            onClick={() => void confirmPayment(pendingReference)}
            className="mt-3 text-sm font-semibold text-[#173c5c] underline underline-offset-4"
          >
            Retry payment confirmation / email receipt
          </button>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handlePayment}
            disabled={isConfirmingPayment}
            className="inline-flex items-center justify-center rounded-xl bg-[#173c5c] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,60,92,0.25)] transition hover:bg-[#12314a]"
          >
            Pay {formatNaira(transcriptOption.amount)}
          </button>
        </div>
      </div>
    </div>
  );
}
