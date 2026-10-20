import { createHash } from "node:crypto";
import VerifyEmailForm from "../components/verify-email-form";
import { getDatabase } from "../lib/db";

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const rawToken = typeof token === "string" ? token : "";
  let purpose: "verify" | "setup" = "verify";
  let isValid = false;
  if (/^[a-f0-9]{64}$/i.test(rawToken)) {
    const sql = getDatabase();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const [storedToken] = await sql`
      SELECT purpose FROM portal_email_verification_tokens
      WHERE token_hash = ${tokenHash} AND expires_at > NOW() LIMIT 1
    `;
    if (storedToken) {
      isValid = true;
      purpose = storedToken.purpose === "setup" ? "setup" : "verify";
    } else {
      const [retryToken] = await sql`
        SELECT purpose FROM portal_email_verification_tokens
        WHERE token_hash LIKE ${`consumed:${tokenHash}:%`} AND expires_at > NOW() LIMIT 1
      `;
      if (retryToken?.purpose === "setup") {
        isValid = true;
        purpose = "setup";
      }
    }
  }
  return <VerifyEmailForm token={isValid ? rawToken : ""} purpose={purpose} />;
}
