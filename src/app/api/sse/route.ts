import { NextResponse } from "next/server";

// Global set of active SSE clients
const clients = new Set<ReadableStreamDefaultController>();

export function notifyClients() {
    for (const client of clients) {
        try {
            client.enqueue("data: update\n\n");
        } catch {
            clients.delete(client);
        }
    }
}

export async function GET() {
    const stream = new ReadableStream({
        start(controller) {
            clients.add(controller);

            // Send initial ping so browser knows connection is alive
            controller.enqueue("data: connected\n\n");
        },
        cancel(controller) {
            clients.delete(controller);
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}