# arrow-flow-static

The public site for **Arrow Flow**, a calm arrow-escape puzzle game for Android
by Shlomi Yahbes (`com.syahbes.arrow.flow.puzzle.game`).

It exists mainly to host the **privacy policy** that Google Play requires, with
a small landing page around it. Plain HTML/CSS/JS — no framework, no build step.
Served by GitHub Pages from `main` at the repository root.

| File | What it is |
| --- | --- |
| `index.html` | Landing page |
| `privacy-policy.html` | The policy submitted to Play Console. Self-contained: its own inline styles, no dependency on the other files |
| `styles.css` | Landing page styles. Palette mirrors the app's default *Quiet Current, dark* theme (`src/theme/palette.ts`) |
| `fonts.css` | Silkscreen (Jason Kottke, OFL 1.1) embedded as a data URI, so the page makes no third-party requests |
| `main.js` | The animated demo board in the hero. The arrowhead geometry is a port of `src/render/arrowhead.ts` from the app |
| `assets/` | App icon and favicon, copied from `arrow-flow/assets/images/` |

## Editing

Open `index.html` in a browser — that is the whole workflow. Push to `main` and
Pages redeploys within a minute or two.

Copy rules carried over from the app: never say "pack" in user-facing text
(they are `LEVEL n`), and boards are "puzzles".

## Keeping the policy honest

`privacy-policy.html` describes the shipping app: AdMob banner ads with a UMP
consent flow in the EEA/UK, a one-time Premium purchase (Google Play +
RevenueCat) that removes ads, local-only progress, and local notifications.
If any of that changes in the app, update the policy and the effective date at
the top of the page.
