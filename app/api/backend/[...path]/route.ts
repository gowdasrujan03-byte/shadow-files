
const BACKEND_URL =
  process.env.GAME_SERVER_URL ||
  "https://shadow-files-backend-blfd.onrender.com";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;

    const validLeaderboard =
      path.length === 1 && path[0] === "leaderboard";

    const validPlayer =
      path.length === 2 &&
      path[0] === "players" &&
      /^[0-9a-f-]{36}$/i.test(path[1]);

    const validHistory =
      path.length === 3 &&
      path[0] === "players" &&
      /^[0-9a-f-]{36}$/i.test(path[1]) &&
      path[2] === "matches";

    if (!validLeaderboard && !validPlayer && !validHistory) {
      return Response.json(
        { ok: false, error: "Invalid API route" },
        { status: 404 }
      );
    }

    const incoming = new URL(request.url);
    const endpoint = path.map(encodeURIComponent).join("/");
    const target = `${BACKEND_URL}/api/${endpoint}${incoming.search}`;

    const response = await fetch(target, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    const result = await response.text();

    return new Response(result, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Backend proxy error:", error);

    return Response.json(
      { ok: false, error: "Backend connection failed" },
      { status: 502 }
    );
  }
}
