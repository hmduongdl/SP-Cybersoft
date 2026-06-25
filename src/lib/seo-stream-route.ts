import { SEO_STREAM_HEADERS, streamSeoText, type SeoCompletionOptions } from "@/lib/openai-client";

export function createSeoStreamResponse(opts: SeoCompletionOptions): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamSeoText(opts)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, { headers: SEO_STREAM_HEADERS });
}
