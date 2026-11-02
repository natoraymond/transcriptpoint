import { NextResponse } from "next/server";
import { checkSameOrigin, getCurrentUser, recordActivity } from "../../lib/auth";
import { getDatabase } from "../../lib/db";

const requiredFields = [
  "campus",
  "transcriptFormat",
  "modeOfAdmission",
  "levelOfStudy",
  "matriculationNumber",
  "documentType",
  "firstName",
  "otherName",
  "surname",
  "phoneNumber",
  "email",
  "monthOfGraduation",
  "yearOfGraduation",
  "recipientInstitution",
  "recipientAddress",
  "referenceNumber",
  "receiverEmail",
] as const;

type TranscriptRequest = Record<(typeof requiredFields)[number], string> & {
  deliveryMethod?: "email" | "dhl";
  dhlContinent?: string;
  dhlCountry?: string;
  dhlCountryCode?: string;
  dhlState?: string;
};

const continents = [
  "North America",
  "South America",
  "African",
  "Asia",
  "Europe",
  "Antarctica",
  "Australia",
  "Oceania",
] as const;

export async function GET(request: Request) {
  try {
    const sql = getDatabase();
    const searchParams = new URL(request.url).searchParams;
    const requestId = searchParams.get("requestId");

    if (requestId) {
      if (!/^\d+$/.test(requestId)) {
        return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
      }

      const [foundRequest] = await sql`
        SELECT id::text AS id, campus, transcript_format AS "transcriptFormat",
          mode_of_admission AS "modeOfAdmission", level_of_study AS "levelOfStudy",
          matriculation_number AS "matriculationNumber", document_type AS "documentType",
          first_name AS "firstName", other_name AS "otherName", surname,
          phone_number AS "phoneNumber", email, month_of_graduation AS "monthOfGraduation",
          year_of_graduation AS "yearOfGraduation", recipient_institution AS "recipientInstitution",
          recipient_address AS "recipientAddress", delivery_method AS "deliveryMethod",
          dhl_continent AS "dhlContinent", dhl_country AS "dhlCountry",
          dhl_country_code AS "dhlCountryCode", dhl_state AS "dhlState",
          dhl_delivery_price_kobo AS "dhlDeliveryPriceKobo", reference_number AS "referenceNumber",
          receiver_email AS "receiverEmail", status, payment_status AS "paymentStatus",
          payment_reference AS "paymentReference", created_at AS "createdAt", user_id AS "userId"
        FROM transcript_requests
        WHERE id = ${requestId}
        LIMIT 1
      `;

      if (!foundRequest) {
        return NextResponse.json({ error: "Transcript request not found" }, { status: 404 });
      }

      const currentUser = await getCurrentUser();
      // Allow if unassigned or matches current user
      if (foundRequest.userId && (!currentUser || currentUser.id !== String(foundRequest.userId))) {
        return NextResponse.json({ error: "Unauthorized access to this transcript request" }, { status: 403 });
      }

      return NextResponse.json({ request: foundRequest });
    }

    const countryCode = searchParams.get("countryCode")?.toUpperCase();

    if (countryCode) {
      const rates = await sql`
        SELECT continent, country_name AS "countryName", state_name AS "stateName", price_kobo AS "priceKobo"
        FROM dhl_delivery_rates
        WHERE country_code = ${countryCode}
        ORDER BY state_name
      `;
      if (rates.length === 0) {
        return NextResponse.json({ error: "Select a valid DHL destination country" }, { status: 400 });
      }

      return NextResponse.json({
        states: rates.map((rate) => ({
          stateName: rate.stateName,
          priceKobo: rate.priceKobo === null ? null : Number(rate.priceKobo),
        })),
      });
    }

    const countries = await sql`
      SELECT country_code AS "countryCode", country_name AS "countryName", continent,
        BOOL_OR(price_kobo IS NOT NULL) AS "hasRates"
      FROM dhl_delivery_rates
      GROUP BY country_code, country_name, continent
      ORDER BY country_name
    `;
    const continentRows = await sql`
      SELECT DISTINCT continent FROM dhl_delivery_rates ORDER BY continent
    `;

    return NextResponse.json({
      continents: continents.filter((continent) => continentRows.some((row) => row.continent === continent)),
      countries: countries.map((country) => ({ ...country, hasRates: Boolean(country.hasRates) })),
    });
  } catch (error) {
    console.error("Unable to load DHL delivery rates", error);
    return NextResponse.json(
      { error: "Unable to load DHL delivery rates" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const body = (await request.json()) as Partial<TranscriptRequest>;
    const currentUser = await getCurrentUser();
    const missingField = requiredFields.find(
      (field) => typeof body[field] !== "string" || !body[field]?.trim(),
    );

    if (missingField) {
      return NextResponse.json(
        { error: `Missing required field: ${missingField}` },
        { status: 400 },
      );
    }

    const matricNumber = (body.matriculationNumber || "").trim();
    const levelOfStudy = (body.levelOfStudy || "").toLowerCase();
    const isUndergrad = /^\d{4}\/\d{5,7}$/i.test(matricNumber);
    const isPostgrad = /^(PG|PH\.?D|M\.?SC|M\.?ED|M\.?ENG|MBA|LLM|MA|MPA|MLS|MPH)\/[A-Z0-9.\-_/]+$/i.test(matricNumber);

    if (levelOfStudy.includes("postgraduate") && !isPostgrad) {
      return NextResponse.json(
        { error: 'Please enter a valid matriculation number in the format for postgraduate like ("PG/M.SC/../......" Ph.D/.../....)' },
        { status: 400 },
      );
    }

    if (levelOfStudy.includes("undergraduate") && !isUndergrad) {
      return NextResponse.json(
        { error: "Please enter a valid matriculation number in the format 2017/245323 for undergraduate." },
        { status: 400 },
      );
    }

    if (!isUndergrad && !isPostgrad) {
      return NextResponse.json(
        { error: 'Please enter a valid matriculation number in the format 2017/245323 for undergraduate, or for postgraduate like ("PG/M.SC/../......" Ph.D/.../....)' },
        { status: 400 },
      );
    }

    const sql = getDatabase();
    const [transcriptOption] = await sql`
      SELECT value, requires_dhl AS "requiresDhl"
      FROM transcript_options
      WHERE value = ${body.transcriptFormat!.trim()} AND is_active = TRUE
      LIMIT 1
    `;
    if (!transcriptOption) {
      return NextResponse.json({ error: "Select a valid transcript format" }, { status: 400 });
    }

    const graduationYear = Number(body.yearOfGraduation);
    if (!Number.isInteger(graduationYear) || graduationYear < 1900 || graduationYear > 2200) {
      return NextResponse.json(
        { error: "Year of graduation must be a valid four-digit year" },
        { status: 400 },
      );
    }

    const isHardcopyTranscript = Boolean(transcriptOption.requiresDhl);
    const deliveryMethod = isHardcopyTranscript || body.deliveryMethod === "dhl" ? "dhl" : "email";
    if (isHardcopyTranscript && body.deliveryMethod !== "dhl") {
      return NextResponse.json({ error: "Hardcopy transcripts require DHL delivery" }, { status: 400 });
    }

    let dhlContinent: string | null = null;
    let dhlCountry: string | null = null;
    let dhlCountryCode: string | null = null;
    let dhlState: string | null = null;
    let dhlDeliveryPriceKobo: number | null = null;

    if (deliveryMethod === "dhl") {
      if (!body.dhlState?.trim() || !body.dhlCountryCode?.trim()) {
        return NextResponse.json(
          { error: "Select a DHL destination country and state" },
          { status: 400 },
        );
      }

      const [rate] = await sql`
        SELECT continent, country_code AS "countryCode", country_name AS "countryName",
          state_name AS "stateName", price_kobo AS "priceKobo"
        FROM dhl_delivery_rates
        WHERE country_code = ${body.dhlCountryCode.trim().toUpperCase()}
          AND state_name = ${body.dhlState.trim()}
      `;

      if (!rate || rate.priceKobo === null) {
        return NextResponse.json(
          { error: "A DHL price is not configured for the selected destination yet" },
          { status: 400 },
        );
      }

      if (body.dhlContinent !== rate.continent || body.dhlCountry !== rate.countryName) {
        return NextResponse.json({ error: "The selected DHL destination is invalid" }, { status: 400 });
      }

      dhlContinent = rate.continent;
      dhlCountry = rate.countryName;
      dhlCountryCode = rate.countryCode;
      dhlState = rate.stateName;
      dhlDeliveryPriceKobo = rate.priceKobo;
    }

    const [savedRequest] = await sql`
      INSERT INTO transcript_requests (
        user_id,
        campus,
        transcript_format,
        mode_of_admission,
        level_of_study,
        matriculation_number,
        document_type,
        first_name,
        other_name,
        surname,
        phone_number,
        email,
        month_of_graduation,
        year_of_graduation,
        recipient_institution,
        recipient_address,
        delivery_method,
        dhl_continent,
        dhl_country,
        dhl_country_code,
        dhl_state,
        dhl_delivery_price_kobo,
        reference_number,
        receiver_email
      ) VALUES (
        ${currentUser?.id ?? null},
        ${body.campus!.trim()},
        ${body.transcriptFormat!.trim()},
        ${body.modeOfAdmission!.trim()},
        ${body.levelOfStudy!.trim()},
        ${body.matriculationNumber!.trim()},
        ${body.documentType!.trim()},
        ${body.firstName!.trim()},
        ${body.otherName!.trim()},
        ${body.surname!.trim()},
        ${body.phoneNumber!.trim()},
        ${body.email!.trim()},
        ${body.monthOfGraduation!.trim()},
        ${graduationYear},
        ${body.recipientInstitution!.trim()},
        ${body.recipientAddress!.trim()},
        ${deliveryMethod},
        ${dhlContinent},
        ${dhlCountry},
        ${dhlCountryCode},
        ${dhlState},
        ${dhlDeliveryPriceKobo},
        ${body.referenceNumber!.trim()},
        ${body.receiverEmail!.trim()}
      )
      RETURNING id, dhl_delivery_price_kobo AS "dhlDeliveryPriceKobo", delivery_method AS "deliveryMethod", dhl_state AS "dhlState", dhl_country AS "dhlCountry"
    `;

    if (currentUser) {
      await recordActivity(currentUser.id, "transcript_request_submitted", { requestId: String(savedRequest.id) });
    }

    return NextResponse.json({
      id: savedRequest.id,
      dhlDeliveryPriceKobo: savedRequest.dhlDeliveryPriceKobo,
      deliveryMethod: savedRequest.deliveryMethod,
      dhlState: savedRequest.dhlState,
      dhlCountry: savedRequest.dhlCountry,
    }, { status: 201 });
  } catch (error) {
    console.error("Unable to save transcript request", error);
    return NextResponse.json(
      { error: "Unable to save transcript request" },
      { status: 500 },
    );
  }
}
