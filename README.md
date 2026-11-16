# Ricochet Rivals — Arena Battler v0.2

A **playable tactical physics combat prototype**. This is the redesigned game, not the original zone-scoring puzzle/pool game.

Your crew and the AI each bring **three distinct heroes**. Every round, you plan one shot, the AI plans one, and **both launch simultaneously**. Knockouts come from collision damage, not pocketing discs or getting the last turn inside a scoring zone.

## Play in your browser

- **Vercel:** Import this GitHub repo as a new project. Use the **Other** framework preset, no build command, no output directory, and the repository root as the project root. Deploy.
- **Locally:** Open \`index.html\` in a browser, or serve the directory with \`python3 -m http.server 8080\` and visit \`http://localhost:8080\`.
- **Previous prototype:** Visit \`/classic.html\` to play the original zone-control/pool variant. It remains unchanged.

No packages, build steps, API keys, or database are needed.

## How the new game works

1. **Pick a blue hero** (click/tap its disc or roster card).
2. Optionally select its **special ability** if the cooldown is ready.
3. **Pull backward from that disc** to aim and set shot power; release.
4. The AI simultaneously launches a disc it has chosen. Physics resolve both shots in the same time window.
5. Hitting an enemy with enough speed deals damage; damage increases with impact speed. Friendly disc collisions don't deal damage.
6. **The center rune gives 1 point of damage absorption** to every hero that stops on it after the volley; it never awards match points.
7. Knock out all three enemies to win. If both crews survive **12 rounds**, the higher *combined remaining HP* wins. Ties are possible.

There are **no corner pocket eliminations** in the battler. Walls and pillars are used for positioning and bank shots.

### Heroes

| Hero | HP | Strength | Special |
|---|---:|---|---|
| Vanguard | 10 | High mass, hard to dislodge | **Crushing Blow:** +2 impact damage, cooldown 3 rounds |
| Striker | 7 | Fast and mobile | **Overdrive:** 35% faster launch and +1 impact damage, cooldown 2 rounds |
| Trickster | 8 | Agile, precise bank-shot attacker | **Bankbreaker:** +2 impact damage after hitting a wall/pillar first, cooldown 2 rounds |

Each character shoots normally when a special ability isn't selected. AI difficulty can be changed at any time.

### Basic tactics

- Use the **Vanguard** to knock enemies out of favorable positions and punish collisions.
- Use **Striker's Overdrive** when you have a clear approach.
- Use **Trickster** to go around pillars and trigger a banked hit.
- Send heroes toward the **center rune** to gain a one-point guard against their next hit.
- You can take as long as you like to aim; the game has no reaction-time challenge.

## Persistent profile

Wins, matches, XP, and longest win streak are stored in **localStorage** on the device/browser you're using. This is a local test profile, **not** an online account. It won't sync between devices.

### What is not built

This prototype does **not** have online multiplayer, matchmaking, global leaderboards, permanent hero upgrades, equipment, lootboxes/gacha, purchases, cloud progression, or an MMO backend. Those systems should only be added after testing whether the battles are enjoyable.

## Project files

- \`index.html\` — redesigned battler interface
- \`styles.css\` — responsive arena, roster, and controls
- \`game.js\` — physics, character abilities, AI decisions, turn resolution, profile save
- \`classic.html\` — preserved original pool-style prototype

## Test targets

Try **Casual**, **Standard**, and **Expert** difficulty. Evaluate whether collision damage is understandable, the hero roles feel distinct, simultaneous shot planning is fun, and matches last a satisfying number of rounds. The numbers are tuning candidates, not final balance.

This is an experimental game; no live human multiplayer or server-side result verification is implemented.
