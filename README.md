# Block Talk – Minecraft Bedrock Voice Chat

Tiny Node.js app: players open a link on their phone, tap one button, and talk.
Audio goes **peer-to-peer (WebRTC)**; the server only does signaling (Socket.io), so it is very light and runs fine on free tiers.

```
mc-voice/
├── server.js          # Express + Socket.io signaling, rooms, /health, /api/ice
├── package.json
├── render.yaml        # optional Render blueprint
├── .gitignore
└── public/
    └── index.html     # mobile UI (all CSS + JS inline)
```

## Run locally
```
npm install
npm start          # http://localhost:3000/r/test
```
Mic access needs HTTPS or localhost. Phones on your Wi-Fi can't use `http://192.168.x.x`, so test the real thing on the cloud.

## Deploy on Render (free)
1. Create a GitHub repo and push this folder (`git init && git add . && git commit -m init && git push`).
2. Render dashboard → **New → Web Service** → pick the repo.
3. Runtime **Node**, Build `npm install`, Start `npm start`, Instance type **Free**.
4. Advanced → Health Check Path: `/health`.
5. Deploy. Your link is `https://YOUR-APP.onrender.com`.
6. Free Render apps sleep after ~15 min idle (first open takes ~30–60 s). Add a free ping at uptimerobot.com to `https://YOUR-APP.onrender.com/health` every 5 min to keep it awake.

## Deploy on Railway
1. Push to GitHub → railway.app → **New Project → Deploy from GitHub repo**.
2. Railway auto-detects Node and runs `npm start`. It sets `PORT` itself.
3. Service → **Settings → Networking → Generate Domain**.

## IMPORTANT: add a TURN server for mobile data
STUN alone connects most players, but many mobile carriers use strict NAT and those players will hear nothing.
Fix: get free TURN credentials (e.g. metered.ca or Cloudflare Calls), then set this env var on Render/Railway:

```
ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:YOUR_TURN_HOST:80","username":"USER","credential":"PASS"},{"urls":"turn:YOUR_TURN_HOST:443?transport=tcp","username":"USER","credential":"PASS"}]
```
Optional: `MAX_PER_ROOM` (default 8; mesh audio gets heavy on phones above ~8).

## Sharing the link with players
Room links look like `https://YOUR-APP.onrender.com/r/survival`. Opening one asks for a name, then one tap opens the mic.
Use a hard-to-guess room name (e.g. `th-smp-7k2q`), since anyone with the link can join.

**Reality check:** Bedrock chat does not support clickable links, and long-pressing to copy from in-game chat is unreliable on mobile. So:

1. **Post the link in chat on a timer** (command block, Bedrock `tellraw` uses `rawtext`):
   ```
   /tellraw @a {"rawtext":[{"text":"§a[Voice] §fOpen mic: §bhttps://YOUR-APP.onrender.com/r/survival"}]}
   ```
   Put it in a **Repeating** command block with a long delay, or show it once per player:
   - Repeating, Always Active: `/tellraw @a[tag=!voice] {"rawtext":[{"text":"§a[Voice] §bhttps://YOUR-APP.onrender.com/r/survival"}]}`
   - Chain, Always Active (right after it): `/tag @a[tag=!voice] add voice`
2. **Keep the URL short** (a short domain or a shortener like is.gd/tinyurl) so it's easy to read from chat and type.
3. **Pin it where players can tap it**: your Discord/WhatsApp group (even if you don't use Discord voice). Players tap it there, then switch back to Minecraft.
4. **Add to Home Screen** (Chrome menu → Add to Home Screen / Safari Share → Add to Home Screen): a one-tap icon for the room.
5. **MOTD:** if your server software supports it (PocketMine, Nukkit, Endstone, etc.), put the short link in the MOTD. Vanilla Bedrock `server-name` is only shown for LAN discovery.

## Tips for players
- Android: open the link first, tap the mic button, then switch to Minecraft (or use split screen / floating window). Chrome keeps the mic running in the background with a mic indicator.
- iOS may pause the mic when Safari is in the background; use split view or Picture-in-Picture style multitasking where available.
- Use headphones to avoid echo.
