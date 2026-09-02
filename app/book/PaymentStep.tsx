"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe/client";
import sharedStyles from "../components/found/shared.module.css";
import styles from "./book.module.css";

interface PaymentStepProps {
  bookingId: string;
  clientSecret: string;
  amountLabel: string;
  /** Defaults to the private-booking confirmation page. */
  returnPath?: string;
}

// Themes the Stripe Elements iframe to sit inside the FOUND design system —
// square corners, ink/paper/grey, Archivo — since Stripe's own markup can't
// be reached by our CSS.
const STRIPE_APPEARANCE: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#131210",
    colorBackground: "#f2f1ed",
    colorText: "#131210",
    colorTextSecondary: "#75736b",
    colorDanger: "#b23b2f",
    fontFamily: "var(--font-archivo), sans-serif",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #131210",
      boxShadow: "none",
      padding: "12px 14px",
    },
    ".Input:focus": {
      border: "1px solid #131210",
      boxShadow: "none",
    },
    ".Label": {
      fontSize: "11px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#75736b",
    },
  },
};

export function PaymentStep({ bookingId, clientSecret, amountLabel, returnPath }: PaymentStepProps) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <PaymentForm bookingId={bookingId} amountLabel={amountLabel} returnPath={returnPath} />
    </Elements>
  );
}

function PaymentForm({
  bookingId,
  amountLabel,
  returnPath,
}: {
  bookingId: string;
  amountLabel: string;
  returnPath?: string;
}) {
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

    const path = returnPath ?? `/confirmation/${bookingId}`;

    // The booking/participant is only ever marked paid by the Stripe
    // webhook, after Stripe confirms — this client-side result just decides
    // where to send the guest next.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${path}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      router.push(path);
      return;
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={sharedStyles.pillBtn} style={{ width: "100%", marginTop: 18 }} disabled={!stripe || submitting}>
        {submitting ? "Processing…" : `Pay ${amountLabel} →`}
      </button>
      <p className={styles.hint} style={{ marginTop: 12, textAlign: "center" }}>
        Powered by Stripe.
      </p>
    </form>
  );
}
