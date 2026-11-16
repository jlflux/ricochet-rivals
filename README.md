# Ricochet Rivals

A playable browser prototype of a turn-based, skill-based physics arena game.

## Play

Open \`index.html\` in a browser, or deploy the repository directly to Vercel as a static site.

- **Your team**: 3 blue discs (left side)
- **Opponent**: 3 red discs (AI, right side)
- **Shoot**: click/touch a blue disc, **drag backward** to aim and set power, release to launch
- **Turns**: you shoot once, then the AI shoots once
- **Score**: at the end of both shots, the team with more active discs in the golden center zone scores 1 point (ties score 0)
- **Win**: reach 5 points or eliminate the entire enemy crew by knocking their discs into corner pockets

The AI has Casual, Standard, and Expert difficulty settings. Profile XP, wins, rating, and cosmetic unlocks are stored in this browser's localStorage.

## Deploy to Vercel

1. In Vercel, click **Add New → Project**.
2. Import **jlflux/ricochet-rivals**.
3. Select **Other** framework preset (no build command).
4. Set the root directory to the repository root, leave output directory blank, and click **Deploy**.

The application is plain HTML/CSS/JavaScript and does not require npm, an API, a database, secrets, or a build process.

## MVP scope

Included:
- Fully playable drag-to-shoot physics with disc collisions and wall banks
- Turn-based AI battles
- Zone scoring, corner pocket elimination, victory/loss screens
- Three AI difficulties
- Persistent local profile XP, wins, losses, rating tiers, cosmetic disc skins
- Desktop and touch controls, responsive layout

Not included yet:
- Real accounts / cloud saves
- Online multiplayer / asynchronous matchmaking
- Global or friends leaderboards
- Dedicated hero abilities, class mechanics, paid cosmetics, real ranked matchmaking

**Important:** Local rating is an illustrative offline progression score, not a genuine online leaderboard or competitive MMR system. Saves are per browser/device and can be cleared by browser storage reset.

## Next experiments

The top priority is determining whether a short match feels strategically satisfying. Tune physics friction, shot power, zone-control scoring, and AI difficulty before adding backend systems or a cosmetic marketplace.

## Technology

No dependencies. HTML5 Canvas, JavaScript, CSS. Runs on Vercel's static hosting.

MIT-style prototype license has **not** been chosen; repository usage rights remain with the owner.
