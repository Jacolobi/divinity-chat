import { Mistral } from '@mistralai/mistralai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.MISTRAL_API_KEY || 'your-api-key';

const client = new Mistral({
  apiKey: apiKey,
});

const fetchMistralWithRetry = async (messages: any[], maxRetries = 5) => {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
        const response = await client.chat.stream({
            model: 'mistral-medium-latest',
            messages: messages,
            topP: 0.6,
            stream: true,
            }
        );
      return response;
    } catch (error: any) {
      if (error.statusCode === 429 && retries < maxRetries) {
        console.log(`Rate limited, retry ${retries + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1100));
        retries++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Rate limited after maximum retries');
};

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    const response = await fetchMistralWithRetry(messages);
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of response) {
                    const streamText = chunk.data.choices[0].delta.content;
                    if (typeof streamText === 'string') {
                        controller.enqueue(new TextEncoder().encode(streamText));
                    }
                }
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
        },
    });
  } catch (error) {
    console.error('Error handling chat request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

