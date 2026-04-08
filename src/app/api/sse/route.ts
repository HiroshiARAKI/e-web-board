export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue("data: connected\n\n");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
