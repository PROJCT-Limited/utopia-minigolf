import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPartnerByRefCode } from "@/lib/admin/partners";
import { PartnerForm } from "./PartnerForm";
import { CopyRefLink } from "../CopyRefLink";
import styles from "../../admin.module.css";

export const metadata = { title: "Edit partner — FOUND Admin" };
export const dynamic = "force-dynamic";

function refLinkFor(refCode: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/book?ref=${refCode}`;
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ refCode: string }> }) {
  const { refCode } = await params;
  const partner = await fetchPartnerByRefCode(refCode);
  if (!partner) notFound();

  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.headRow}>
        <div>
          <Link href="/admin/partners" className="hint">
            ← All partners
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            {partner.name}
          </h1>
        </div>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Referral link</h3>
        <CopyRefLink url={refLinkFor(partner.refCode)} />
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Edit partner</h3>
        <PartnerForm partner={partner} />
      </div>
    </main>
  );
}
