// FILE: lib/email/DailyDigest.tsx
// -----------------------------------------------------------------------------
// The nightly internal digest: what sold today, and where the season stands.
// Staff-facing, so it skips the guest chrome — no manage link, no "reply with
// questions" — but keeps the same FOUND primitives, because an email that
// looks like the product is easier to read at a glance than a wall of text.
// -----------------------------------------------------------------------------

import { Text } from "@react-email/components";
import { formatMoney } from "./format";
import { EmailShell } from "./components/EmailShell";
import { EmailButton } from "./components/EmailButton";
import { EmailDetailBox, EmailHeading, MonoLabel, bodyText } from "./components/EmailPrimitives";
import { colors, monoStack } from "./components/theme";
import type { DigestStats } from "@/lib/stats/dailyDigest";

export interface DailyDigestEmailProps {
  stats: DigestStats;
  adminUrl: string;
}

export function formatDigestDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function digestHeadline(stats: DigestStats): string {
  const { people, groups } = stats.today;
  if (people === 0) return "No bookings today";
  return `${people} ${people === 1 ? "person" : "people"} booked today, in ${groups} ${groups === 1 ? "group" : "groups"}`;
}

export function DailyDigestEmail({ stats, adminUrl }: DailyDigestEmailProps) {
  const { today, season } = stats;
  const sold = season.capacity > 0 ? (season.people / season.capacity) * 100 : 0;

  return (
    <EmailShell previewText={digestHeadline(stats)} internal>
      <MonoLabel>{formatDigestDay(stats.day)} &middot; Hong Kong</MonoLabel>
      <EmailHeading>{digestHeadline(stats)}</EmailHeading>

      {/* No prose. The figures are the message, and a sentence restating
          them in words is a line to skim past on the way to the box. The
          unfinished checkouts became a row of their own rather than an
          aside. */}
      <EmailDetailBox
        rows={[
          { label: "People", value: String(today.people) },
          { label: "Groups", value: String(today.groups) },
          ...today.byTicketType.map((t) => ({ label: t.label, value: `${t.people} people` })),
          ...(today.pendingPeople > 0
            ? [{ label: "Mid-checkout", value: `${today.pendingPeople} people` }]
            : []),
          { label: "Taken", value: formatMoney(today.revenueCents, "hkd") },
        ]}
      />

      {today.slots.length > 0 && (
        <>
          <MonoLabel>What they booked</MonoLabel>
          {today.slots.slice(0, 8).map((slot) => (
            <Text
              key={`${slot.date}-${slot.time}`}
              style={{
                margin: "0 0 6px",
                fontFamily: monoStack,
                fontSize: "12px",
                color: colors.ink,
              }}
            >
              {formatSlotDate(slot.date)} &nbsp;{slot.time} &nbsp;&middot;&nbsp; {slot.people}{" "}
              {slot.people === 1 ? "person" : "people"}
            </Text>
          ))}
          <Text style={{ ...bodyText, margin: "18px 0 28px" }}>
            {today.slots.length > 8 ? `…and ${today.slots.length - 8} more start times.` : ""}
          </Text>
        </>
      )}

      <MonoLabel>Season to date</MonoLabel>
      <EmailDetailBox
        rows={[
          { label: "People booked", value: `${season.people} of ${season.capacity}` },
          { label: "Groups", value: String(season.groups) },
          { label: "Places sold", value: `${sold.toFixed(1)}%` },
          { label: "Taken", value: formatMoney(season.revenueCents, "hkd") },
        ]}
      />

      <EmailButton href={adminUrl}>Open the admin panel</EmailButton>
    </EmailShell>
  );
}

function formatSlotDate(date: string): string {
  const formatted = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  // "9 Oct" is a character shorter than "17 Oct", which walks the times out of
  // line down a monospaced list. A non-breaking space holds the column —
  // HTML would collapse an ordinary one.
  return formatted.length < 6 ? `\u00a0${formatted}` : formatted;
}

export default DailyDigestEmail;
