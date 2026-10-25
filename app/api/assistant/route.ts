import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { getDatabase } from "../../lib/db";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantRequest = {
  conversationId?: string;
  message?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getConversationMessages(conversationId: string) {
  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT role, content
      FROM assistant_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 12
    `;
    return rows as ChatMessage[];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const body = (await request.json()) as AssistantRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Enter a question for support" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "Please keep your question under 2,000 characters" }, { status: 400 });
    }

    const sql = getDatabase();

    // 1. Fetch live services & pricing from the database
    const activeTranscriptOptions = await sql`
      SELECT label, amount_ngn AS amount, category, requires_dhl AS "requiresDhl"
      FROM transcript_options
      WHERE is_active = TRUE
      ORDER BY display_order, label
    `;

    // 2. Fetch sample DHL rates from database
    const dhlSampleRates = await sql`
      SELECT country_name AS country, state_name AS state, price_kobo AS price
      FROM dhl_delivery_rates
      WHERE price_kobo IS NOT NULL
      ORDER BY country_name, state_name
      LIMIT 10
    `;

    // 3. If user is logged in, fetch their recent request status from database
    let userRequestsContext = "";
    if (user?.id) {
      try {
        const userRecentRequests = await sql`
          SELECT id, campus, transcript_format AS "format", status, payment_status AS "paymentStatus",
                 matriculation_number AS "matricNumber", created_at AS "createdAt"
          FROM transcript_requests
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 3
        `;
        if (userRecentRequests.length > 0) {
          userRequestsContext = `User's logged requests in database: ${JSON.stringify(userRecentRequests)}`;
        }
      } catch {
        // user requests table might be empty or error handled safely
      }
    }

    // Build database knowledge summary
    const servicesList = activeTranscriptOptions
      .map((opt) => `• ${opt.label}: ₦${Number(opt.amount).toLocaleString("en-NG")} (${opt.category}${opt.requiresDhl ? ", requires DHL" : ""})`)
      .join("\n");

    const sampleDhlText = dhlSampleRates
      .map((rate) => `• ${rate.country} (${rate.state}): ₦${(Number(rate.price) / 100).toLocaleString("en-NG")}`)
      .join("\n");

    const lower = message.toLowerCase();

    // Check specifically for: "i applied for my degree transcript and yet have not received it" or similar inquiries
    const isAppliedNotReceivedQuestion =
      (lower.includes("applied") || lower.includes("ordered") || lower.includes("requested") || lower.includes("paid")) &&
      (lower.includes("not received") || lower.includes("haven't received") || lower.includes("have not received") || lower.includes("yet to receive") || lower.includes("still waiting") || lower.includes("not seen") || lower.includes("not got") || lower.includes("not get") || lower.includes("delay"));

    // Check for general processing time questions
    const isProcessingTimeQuestion =
      (lower.includes("processing") || lower.includes("ready") || lower.includes("how long") || lower.includes("when will") || lower.includes("duration") || lower.includes("timeline")) &&
      (lower.includes("transcript") || lower.includes("english proficiency") || lower.includes("proficiency") || lower.includes("request") || lower.includes("document"));

    let directAnswer: string | null = null;

    if (isAppliedNotReceivedQuestion) {
      directAnswer =
        "Ooh! Sorry about that! It is not yet up to two weeks, but you will surely get it soon.\n\n" +
        "Standard degree transcript processing and verification at the university records office takes two weeks+ (14 to 21 working days) from when your payment was verified.\n\n" +
        "• If you opted for Official Softcopy: It will be electronically transmitted to your recipient institution or email as soon as processing completes.\n" +
        "• If you opted for Hardcopy delivery: DHL tracking details will be dispatched immediately to your phone and email once picked up from campus.\n\n" +
        "You can also sign in to check your live real-time progress under 'My Dashboard'. We are monitoring every batch closely!";
    } else if (isProcessingTimeQuestion) {
      directAnswer =
        "Processing of your academic transcript or English proficiency document is typically ready in two weeks+ (14 to 21 working days) from the date payment is confirmed and academic records are verified at your campus.\n\n" +
        "You can track the live status anytime under 'My Dashboard'. Once processing is completed, you will receive an immediate email notification with your dispatch details or official softcopy link.";
    }

    // Save conversation in DB if conversationId is valid
    let conversationId = body.conversationId && isUuid(body.conversationId) ? body.conversationId : crypto.randomUUID();
    try {
      await sql`
        INSERT INTO assistant_conversations (id, user_id)
        VALUES (${conversationId}, ${user?.id ?? null})
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      `;
      await sql`
        INSERT INTO assistant_messages (conversation_id, role, content)
        VALUES (${conversationId}, 'user', ${message})
      `;
    } catch {
      // conversation tables error won't break the response
    }

    const apiKey = process.env.OPENAI_API_KEY;

    let finalAnswer = directAnswer;

    if (!finalAnswer && apiKey) {
      try {
        const history = (await getConversationMessages(conversationId)).reverse();
        const systemPrompt = `You are the TranscriptPoint Support Assistant. Answer accurately, courteously, and helpfully using exclusively verified data from our database:

Database Services & Official Fees:
${servicesList}

Sample Verified DHL Delivery Rates:
${sampleDhlText}

Processing Timeline Policy:
- Official processing of transcript or English proficiency requests is ready in two weeks+ (14 to 21 working days).
- Softcopy documents are transmitted directly to the recipient institution or applicant.
- Hardcopy documents are dispatched via DHL to the verified destination address once processed.

${userRequestsContext ? `Verified Active User Records:\n${userRequestsContext}` : ""}

Rules:
1. Always state that processing of transcripts or English proficiency takes two weeks+ (14-21 working days) when asked about completion, readiness, or timelines.
2. Only quote official prices from the database list above.
3. If the user wants to initiate a new request, direct them to click "Get Started" or visit "/request".
4. Be brief, professional, and clear.`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
            ],
          }),
        });

        if (aiResponse.ok) {
          const result = (await aiResponse.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          finalAnswer = result.choices?.[0]?.message?.content?.trim() || null;
        }
      } catch (err) {
        console.error("AI completion error, using database fallback", err);
      }
    }

    // Comprehensive database-backed rule engine fallback if AI service key is absent or unreachable
    if (!finalAnswer) {
      if (lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("fee") || lower.includes("amount") || lower.includes("services")) {
        finalAnswer = `Here are the official fees and services configured in our database:\n\n${servicesList}\n\nYou can select any of these directly on the Request page (/request).`;
      } else if (lower.includes("dhl") || lower.includes("delivery") || lower.includes("shipping")) {
        finalAnswer = `Hardcopy transcript delivery is handled securely via DHL. Delivery rates are calculated based on your destination country and state:\n\n${sampleDhlText}\n\nFor hardcopy deliveries outside Nigeria, rates are set according to DHL zone tariffs configured in the portal database.`;
      } else if (lower.includes("track") || lower.includes("status") || lower.includes("check")) {
        if (userRequestsContext) {
          finalAnswer = `Here is your recent request information from our database:\n${userRequestsContext}\n\nYou can also view full tracking details under 'My Dashboard'.`;
        } else {
          finalAnswer = "You can track the progress of your transcript or document request anytime in your dashboard under 'Track Request' or 'My Dashboard'. Make sure to sign in with your student/user account.";
        }
      } else {
        finalAnswer = `Welcome to TranscriptPoint Support! We provide end-to-end academic transcript processing, English proficiency certificates, and DHL delivery across all accredited campuses.\n\n` +
          `• Document Processing Timeline: Standard processing is ready in two weeks+ (14 to 21 working days).\n` +
          `• Services Available: Official Softcopy, Hardcopy via DHL, English Proficiency, and Verification.\n` +
          `• To start a request: Visit our New Request page (/request) or click 'Get Started'.\n\n` +
          `How may we assist you today?`;
      }
    }

    try {
      await sql`
        INSERT INTO assistant_messages (conversation_id, role, content)
        VALUES (${conversationId}, 'assistant', ${finalAnswer})
      `;
      await sql`
        UPDATE assistant_conversations SET updated_at = NOW() WHERE id = ${conversationId}
      `;
    } catch {
      // ignore
    }

    return NextResponse.json({ conversationId, answer: finalAnswer });
  } catch (error) {
    console.error("Unable to answer assistant message", error);
    return NextResponse.json({ error: "Unable to answer your question right now" }, { status: 500 });
  }
}