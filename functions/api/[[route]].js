/* ============================================================
   Dominoes Arena — Cloudflare Pages Functions API
   Storage: Workers KV (binding: ARENA).
   Layout:
     index      -> ["<tournamentId>", ...]  (newest first)
     t:<id>     -> { id, name, players[], games[], createdAt }
   Each game: { id, date, time, maxpoints, rounds[[Number]], inProgress }
   ============================================================ */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function err(message, status = 400) {
    return json({ error: message }, status);
}

function id() {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
}

async function getIndex(kv) {
    return (await kv.get('index', 'json')) || [];
}

async function getTournament(kv, tid) {
    return await kv.get('t:' + tid, 'json');
}

async function putTournament(kv, t) {
    await kv.put('t:' + t.id, JSON.stringify(t));
}

export async function onRequest(context) {
    const { request, env, params } = context;
    const kv = env.ARENA;
    if (!kv) return err('KV binding "ARENA" is not configured', 500);

    // params.route is the catch-all path segments after /api/
    const seg = params.route || [];
    const method = request.method;

    try {
        // ---- /api/tournaments ----
        if (seg[0] === 'tournaments') {
            // GET /api/tournaments — list summaries
            if (seg.length === 1 && method === 'GET') {
                const ids = await getIndex(kv);
                const tournaments = (
                    await Promise.all(ids.map((tid) => getTournament(kv, tid)))
                ).filter(Boolean);
                return json(
                    tournaments.map((t) => ({
                        id: t.id,
                        name: t.name,
                        players: t.players,
                        gameCount: t.games.length,
                        createdAt: t.createdAt
                    }))
                );
            }

            // POST /api/tournaments — create
            if (seg.length === 1 && method === 'POST') {
                const body = await request.json();
                const name = (body.name || '').trim();
                const players = (body.players || []).map((p) => String(p).trim()).filter(Boolean);
                if (!name || players.length < 2) {
                    return err('A tournament needs a name and at least 2 players.');
                }
                const t = {
                    id: id(),
                    name,
                    players,
                    games: [],
                    createdAt: new Date().toISOString()
                };
                await putTournament(kv, t);
                const ids = await getIndex(kv);
                ids.unshift(t.id);
                await kv.put('index', JSON.stringify(ids));
                return json(t, 201);
            }

            const tid = seg[1];
            if (!tid) return err('Tournament id required');
            const t = await getTournament(kv, tid);

            // GET /api/tournaments/:id
            if (seg.length === 2 && method === 'GET') {
                return t ? json(t) : err('Tournament not found', 404);
            }

            // DELETE /api/tournaments/:id
            if (seg.length === 2 && method === 'DELETE') {
                await kv.delete('t:' + tid);
                const ids = (await getIndex(kv)).filter((x) => x !== tid);
                await kv.put('index', JSON.stringify(ids));
                return json({ ok: true });
            }

            if (!t) return err('Tournament not found', 404);

            // ---- /api/tournaments/:id/games ----
            if (seg[2] === 'games') {
                // POST /api/tournaments/:id/games — add a game
                if (seg.length === 3 && method === 'POST') {
                    const body = await request.json();
                    const game = {
                        id: id(),
                        date: body.date || new Date().toISOString().slice(0, 10),
                        time: body.time || '00:00',
                        maxpoints: parseInt(body.maxpoints, 10) || 100,
                        rounds: [],
                        inProgress: true
                    };
                    t.games.push(game);
                    await putTournament(kv, t);
                    return json(game, 201);
                }

                const gid = seg[3];
                const game = t.games.find((g) => g.id === gid);
                if (!game) return err('Game not found', 404);

                // GET /api/tournaments/:id/games/:gid
                if (seg.length === 4 && method === 'GET') {
                    return json({ tournament: { id: t.id, name: t.name, players: t.players }, game });
                }

                // DELETE /api/tournaments/:id/games/:gid
                if (seg.length === 4 && method === 'DELETE') {
                    t.games = t.games.filter((g) => g.id !== gid);
                    await putTournament(kv, t);
                    return json({ ok: true });
                }

                // POST /api/tournaments/:id/games/:gid/end — save rounds
                if (seg[4] === 'end' && method === 'POST') {
                    const body = await request.json();
                    if (!Array.isArray(body.rounds)) return err('Invalid rounds data');
                    game.rounds = body.rounds.map((r) => r.map((n) => Number(n) || 0));
                    game.inProgress = false;
                    await putTournament(kv, t);
                    return json({ ok: true });
                }
            }
        }

        return err('Not found', 404);
    } catch (e) {
        return err('Server error: ' + e.message, 500);
    }
}
