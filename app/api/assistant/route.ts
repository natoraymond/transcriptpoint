import { NextResponse } from "next/server";
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
  const sql = getDatabase();
  const rows = await sql`
    SELECT role, content
    FROM assistant_messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at DESC
    LIMIT 12
  `;

  return rows as ChatMessage[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Enter a question for the assistant" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "Please keep your question under 2,000 characters" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "The AI assistant is not configured yet. Add OPENAI_API_KEY to the server environment." },
        { status: 503 },
      );
    }

    const conversationId = body.conversationId && isUuid(body.conversationId)
      ? body.conversationId
      : crypto.randomUUID();
    const sql = getDatabase();

    await sql`
      INSERT INTO assistant_conversations (id)
      VALUES (${conversationId})
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `;
    await sql`
      INSERT INTO assistant_messages (conversation_id, role, content)
      VALUES (${conversationId}, 'user', ${message})
    `;

    const history = (await getConversationMessages(conversationId)).reverse();
    const activeTranscriptOptions = await sql`
      SELECT label, amount_ngn AS amount
      FROM transcript_options
      WHERE is_active = TRUE
      ORDER BY display_order
    `;
    const knowledge = [
      "TranscriptPoint helps alumni request academic transcripts and related documents.",
      `Available services: ${activeTranscriptOptions.map((option) => `${option.label} (N${Number(option.amount).toLocaleString("en-NG")})`).join(", ")}.`,
      "Hardcopy transcript requests require DHL delivery and a destination continent, country, and state or province.",
      "DHL destination options and prices are loaded from the database. If a destination has no configured price, advise the user to contact support rather than estimating a fee.",
    ].join("\n");

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
          {
            role: "system",
            content: `You are TranscriptPoint AI Assistant. Answer clearly and briefly using the verified context below. Do not invent prices, processing times, policies, or personal records. If the question requires an action, direct the user to the transcript request form.\n\nVerified context:\n${knowledge}`,
          },
          ...history,
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("OpenAI assistant request failed", await aiResponse.text());
      return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 502 });
    }

    const result = (await aiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = result.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json({ error: "The assistant returned an empty answer. Please try again." }, { status: 502 });
    }

    await sql`
      INSERT INTO assistant_messages (conversation_id, role, content)
      VALUES (${conversationId}, 'assistant', ${answer})
    `;
    await sql`
      UPDATE assistant_conversations SET updated_at = NOW() WHERE id = ${conversationId}
    `;

    return NextResponse.json({ conversationId, answer });
  } catch (error) {
    console.error("Unable to answer assistant message", error);
    return NextResponse.json({ error: "Unable to answer your question right now" }, { status: 500 });
  }
}