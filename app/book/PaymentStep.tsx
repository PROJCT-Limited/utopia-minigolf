"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe/client";
import styles from "./book.module.css";

interface PaymentStepProps {
  bookingId: string;
  clientSecret: string;
  amountLabel: string;
}

export function PaymentStep({ bookingId, clientSecret, amountLabel }: PaymentStepProps) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret }}>
      <PaymentForm bookingId={bookingId} amountLabel={amountLabel} />
    </Elements>
  );
}

function PaymentForm({ bookingId, amountLabel }: { bookingId: string; amountLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    // The booking is only ever marked paid by the Stripe webhook, after
    // Stripe confirms — this client-side result just decides where to send
    // the guest next.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation/${bookingId}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      router.push(`/confirmation/${bookingId}`);
      return;
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={!stripe || submitting}>
        {submitting ? "Processing…" : `Pay ${amountLabel}`}
      </button>
      <p className="hint" style={{ marginTop: 12, textAlign: "center" }}>
        Powered by Stripe.
      </p>
    </form>
  );
}
