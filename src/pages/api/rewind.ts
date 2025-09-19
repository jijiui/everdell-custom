import type { NextApiRequest, NextApiResponse } from "next";
import { getGameById } from "../../model/game";

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
  const { body } = req;
  const { gameId, playerId, playerSecret, toGameStateId } = body || {};
  if (!gameId || !playerId || !playerSecret || !toGameStateId) {
    res.status(400).json({ success: false, error: "Invalid request" });
    return;
  }
  const game = await getGameById(gameId as string);
  if (!game) {
    res.status(404).json({ success: false, error: "Game not found" });
    return;
  }
  const player = game.getPlayer(playerId);
  if (!player || player.playerSecretUNSAFE !== playerSecret) {
    res.status(403).json({ success: false, error: "Invalid player" });
    return;
  }
  const ok = game.rewindTo(Number(toGameStateId));
  if (!ok) {
    res.status(404).json({ success: false, error: "Step not found" });
    return;
  }
  await game.save();
  res.json({ success: "ok" });
};

