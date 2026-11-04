import { NextResponse } from "next/server";
import { getDatabase } from "../../lib/db";

export const dynamic = "force-dynamic";

const fallbackTranscriptOptions = [
  { value: "official-softcopy-nigeria", label: "Official Softcopy (Nigeria)", amount: 17000, category: "Softcopy transcript", requiresDhl: false, displayOrder: 10, isActive: true },
  { value: "official-softcopy-outside-nigeria", label: "Official Softcopy (Outside Nigeria)", amount: 29000, category: "Softcopy transcript", requiresDhl: false, displayOrder: 20, isActive: true },
  { value: "softcopy-transcript-english-proficiency-nigeria", label: "Softcopy Transcript / English Proficiency (Nigeria)", amount: 22000, category: "Softcopy transcript", requiresDhl: false, displayOrder: 30, isActive: true },
  { value: "softcopy-transcript-english-proficiency-outside-nigeria", label: "Softcopy Transcript / English Proficiency (Outside Nigeria)", amount: 34000, category: "Softcopy transcript", requiresDhl: false, displayOrder: 40, isActive: true },
  { value: "softcopy-english-proficiency-nigeria", label: "Softcopy English Proficiency (Nigeria)", amount: 8000, category: "Softcopy transcript", requiresDhl: false, displayOrder: 50, isActive: true },
  { value: "students-softcopy", label: "Students Softcopy", amount: 7000, category: "Other services", requiresDhl: false, displayOrder: 60, isActive: true },
  { value: "hardcopy-transcript", label: "Hardcopy Transcript", amount: 0, category: "Hardcopy transcript", requiresDhl: true, displayOrder: 70, isActive: true },
  { value: "transcript-verification", label: "Transcript Verification", amount: 12000, category: "Other services", requiresDhl: false, displayOrder: 90, isActive: true },
  { value: "certificate-verification", label: "Certificate Verification", amount: 12000, category: "Other services", requiresDhl: false, displayOrder: 100, isActive: true },
];

export async function GET() {
  try {
    const sql = getDatabase();
    const options = await sql`
      SELECT value, label, amount_ngn AS amount, category,
        requires_dhl AS "requiresDhl", display_order AS "displayOrder", is_active AS "isActive"
      FROM transcript_options
      ORDER BY display_order, label
    `;

    return NextResponse.json({ options }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load transcript options from database, using cached options:", error);
    return NextResponse.json({ options: fallbackTranscriptOptions }, { headers: { "Cache-Control": "no-store" } });
  }
}
