"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { getStripe, resetStripe } from "@/lib/stripe/client";
import { reportCheckoutEvent } from "./reportCheckoutEvent";
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

/**
 * Stripe.js is a third-party script, and on a phone at an event it does not
 * always arrive: a tracking blocker, a captive portal, a dropped connection.
 * When it doesn't, <Elements> renders nothing and useStripe() stays null
 * forever — which used to leave a guest looking at an empty card panel and a
 * permanently disabled Pay button, with nothing on screen saying why. Every
 * failed checkout in this account's history reached Stripe with no card
 * attempt recorded at all, which is exactly what that looks like from the
 * outside. So: watch the load, and say something when it doesn't happen.
 */
function useStripeLoadState(bookingId: string): { failed: boolean; slow: boolean; retry: () => void } {
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = setTimeout(() => {
      if (cancelled) return;
      setSlow(true);
      reportCheckoutEvent("stripe_js_slow", { bookingId });
    }, 8000);

    getStripe()
      .then((stripe) => {
        if (cancelled) return;
        clearTimeout(slowTimer);
        if (stripe) {
          setSlow(false);
          return;
        }
        setFailed(true);
        reportCheckoutEvent("stripe_js_failed", { bookingId, detail: "loadStripe resolved null" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearTimeout(slowTimer);
        setFailed(true);
        reportCheckoutEvent("stripe_js_failed", {
          bookingId,
          detail: err instanceof Error ? err.message : "load rejected",
        });
      });

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [attempt, bookingId]);

  return {
    failed,
    slow,
    // Clearing the old outcome belongs here rather than at the top of the
    // effect: setting state synchronously in an effect body kicks off a
    // second render pass for no reason, and a retry is the only thing that
    // needs the reset.
    retry: () => {
      resetStripe();
      setFailed(false);
      setSlow(false);
      setAttempt((n) => n + 1);
    },
  };
}

export function PaymentStep({ bookingId, clientSecret, amountLabel, returnPath }: PaymentStepProps) {
  const { failed, slow, retry } = useStripeLoadState(bookingId);

  if (failed) {
    return (
      <div className={styles.paymentUnavailable}>
        <p className={styles.error}>
          The card form couldn&rsquo;t load. This is usually a blocked script or a patchy connection rather
          than anything wrong with your booking — nothing has been charged.
        </p>
        <button type="button" className={sharedStyles.pillBtn} onClick={retry} style={{ marginTop: 14 }}>
          Try again
        </button>
        <p className={styles.hint} style={{ marginTop: 12 }}>
          Still stuck? Turn off any ad or tracking blocker for this page, or switch off wifi and use mobile
          data. Your place is held — email hi@projct.co and we&rsquo;ll take it from there.
        </p>
      </div>
    );
  }

  return (
    <>
      {slow && (
        <p className={styles.hint} style={{ marginBottom: 12 }}>
          Still loading the card form…
        </p>
      )}
      <Elements stripe={getStripe()} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
        <PaymentForm bookingId={bookingId} amountLabel={amountLabel} returnPath={returnPath} />
      </Elements>
    </>
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
    if (!stripe || !elements) {
      setError("The card form isn't ready yet. Give it a moment and try again.");
      return;
    }

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
      reportCheckoutEvent("confirm_error", {
        bookingId,
        detail: [confirmError.type, confirmError.code, confirmError.decline_code].filter(Boolean).join("/"),
      });
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      router.push(path);
      return;
    }

    // Anything else — an authentication the bank abandoned, a Link window
    // that closed, a payment method that came back needing another one. This
    // branch used to just re-enable the button and say nothing, which reads
    // as "the page is broken" rather than "try again".
    console.error("confirmPayment returned an unfinished intent:", paymentIntent?.status);
    reportCheckoutEvent("intent_unfinished", { bookingId, detail: paymentIntent?.status ?? "no intent" });
    setError(
      "That didn't go through, and nothing has been charged. Try again, or use a different card."
    );
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
