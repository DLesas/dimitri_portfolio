import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { retrieveContext } from '@/app/Felix/lib/ai/rag';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Check if user is authenticated for Felix route
 */
async function checkFelixAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('felix-auth');
  return authCookie?.value === 'authenticated';
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const isAuthenticated = await checkFelixAuth();

    if (!isAuthenticated) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, companyId }: { messages: UIMessage[]; companyId: string } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!companyId) {
      return new Response('Company ID is required', { status: 400 });
    }

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages);

    // Get the last user message for RAG context
    const lastUserMessage = modelMessages.filter(m => m.role === 'user').slice(-1)[0];

    if (!lastUserMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Extract text content from the message
    // Content can be a string or an array of content parts
    let queryText = '';
    if (typeof lastUserMessage.content === 'string') {
      queryText = lastUserMessage.content;
    } else if (Array.isArray(lastUserMessage.content)) {
      // Extract text from content parts: { type: 'text', text: 'heelllo' }
      queryText = lastUserMessage.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');
    }

    if (!queryText.trim()) {
      return new Response('Empty message content', { status: 400 });
    }

    // Retrieve relevant context using RAG
    const { context, numResults } = await retrieveContext(queryText, companyId, {
      limit: 5,
      similarityThreshold: 0.6,
    });
    console.log(context)
    // Build system message with context
    const systemMessage = `You are an AI assistant helping users understand company documents and financial information.

You have access to relevant information from company documents. Use this context to answer the user's question accurately and concisely.

IMPORTANT RULES:
1. ONLY use information from the provided context
2. If the context doesn't contain relevant information, say "I don't have information about that in the available documents"
3. Always cite which document/section your information comes from
4. Be precise with numbers, dates, and metrics
5. If you're not certain about something, acknowledge the uncertainty
6. Always cite your sources in the following format

Context from documents (${numResults} relevant sources found):
${context}

Now answer the user's question based ONLY on the above context.`;

    // Stream the response using Vercel's pattern
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemMessage,
      messages: modelMessages,
      temperature: 0.1,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
