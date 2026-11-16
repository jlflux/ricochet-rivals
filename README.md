# Ricochet Rivals + The 8-Ball Club

Two playable, dependency-free browser games under one GitHub repository.

## Choose a game

| URL path | Game | Status |
|---|---|---|
| \`/\` or \`/index.html\` | **Ricochet Rivals Arena Battler** | Prototype v0.2: simultaneous 3v3 character-based physics battles |
| \`/classic.html\` | **The 8-Ball Club** | Prototype v1.0: real 8-ball pool rack vs computer |
| \`/zone-classic.html\` | **Original Zone Control** | Archived first prototype, preserved unchanged |

The arena battler is preserved. **The former \`classic.html\` route is now the actual 8-ball pool game**, with the original zone-control game moved to \`zone-classic.html\`.

## Deploy on Vercel

Connect \`jlflux/ricochet-rivals\` to Vercel. Framework **Other**, root directory **repository root**, **no build command**, **no output directory**, and click Deploy. Every game is a static HTML page; there are no npm packages, database credentials, or server APIs.

You can also open any HTML page locally in your browser.

---

## The 8-Ball Club — gameplay

**You vs The Hustler (computer)** on a standard-style six-pocket table with all 15 numbered balls and a white cue ball.

1. **Aim and shoot:** Click/touch the cue ball, **pull backward** to aim and set power, then release. Move the mouse over the table to preview an aim line.
2. **Break:** Strike the racked balls. A legal break pockets at least one ball or sends at least four object balls to rails. The table stays open after the break.
3. **Claim a group:** After the break, the first legally pocketed solid (1–7) or stripe (9–15) determines your group. Your opponent gets the other group.
4. **Continue your inning:** Hit a ball from your own group first. After contact, any ball must touch a rail or be pocketed. Pocket one of your group on a legal shot to shoot again.
5. **Fouls:** Scratches, hitting a wrong group first, missing all object balls, illegal breaks, and no rail/pocket after contact give the opponent **ball in hand anywhere**. When it is your turn with ball in hand, click the desired position on the table to place the cue ball.
6. **Win on the eight:** Once your seven balls are cleared, click **Call 8 pocket**, then click one of the six glowing pockets. Pocket the 8 in that called pocket without fouling to win. Pocketing it too early or in another pocket loses.
7. **House rule:** An 8-ball made on the break causes a re-rack, not an immediate win or loss.

The AI has Casual, Standard, and Expert settings. Match totals and best consecutive pocketed-ball run are saved locally in that browser. AI is an approximate geometric shot planner, not an unbeatable physics solver.

### Files

- \`classic.html\` — 8-ball page
- \`pool.css\` — pool UI and responsive layout
- \`pool.js\` — rack, cue, ball physics, pockets, house rules, AI, score and local storage
- \`zone-classic.html\` — original zone-control experiment
- \`index.html\`, \`styles.css\`, \`game.js\` — separate arena battler

### Deliberate limitations

There is no online multiplayer or global leaderboard, no cue spin / English, no commercial anti-cheat, and no cloud profile sync. Different pool leagues use different rule sets. This implementation documents its **house rules** rather than claiming to replicate every WPA or tournament rule.

---

## Arena Battler

The original v0.2 experiment remains at the home page: select one of three hero discs, use an optional ability, drag backward to aim, and launch a shot simultaneously with the computer. Collisions deal damage; center rune provides limited shielding. Knock out all opponents or finish 12 rounds with more team HP.

Profile and cosmetics are experimental and stored locally. This game is being retained for potential future development.

---

## Roadmap

The next proposed game, **Crown & Crew**, should be developed in a separate repository. It is a distinct character-and-companion strategy RPG inspired by satisfying auto-battler formation and long-term RPG progression, rather than another mode inside this physics project.
