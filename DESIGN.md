# DESIGN.md — VyaparRunway

## Visual theme

VyaparRunway has two connected surfaces:

- `/` is an editorial product page inspired by modern Indian fintech infrastructure sites. It explains what the product does, how it works, and who it is for.
- `/app` is the working stock-planning dashboard. It stays practical, readable, and decision-focused.

The shared visual language is confident financial infrastructure: deep espresso, warm paper, restrained copper, and clear typography. The landing page can be expressive; the planner must remain fast to scan and easy to use on a cheap phone.

## Color

| Role                     | Hex                                      | Tailwind              |
| ------------------------ | ---------------------------------------- | --------------------- |
| Page background          | #FAF9F6                                  | warm ivory            |
| Surface                  | #FFFEFA                                  | warm white            |
| Deep surface / header    | #190B05                                  | espresso              |
| Text primary             | #1B0D08                                  | espresso ink          |
| Text secondary           | #716D67                                  | warm gray             |
| Border                   | #DEDBD4                                  | warm gray line        |
| Verified UPI money       | #B65F3E                                  | copper                |
| Copper hover / emphasis  | #91482F                                  | dark copper           |
| Copper soft surface      | #F6E8E0                                  | pale copper           |
| Galla Cash (Estimated)   | stroke #F59E0B, stripe base #FEF3C7      | amber-500 / amber-100 |
| Green verdict            | bg #F0FDF4, border #86EFAC, text #166534 | green-50 / 300 / 800  |
| Yellow verdict + warning | bg #FEFCE8, border #FDE047, text #854D0E | yellow-50 / 300 / 800 |
| Red verdict              | bg #FEF2F2, border #FCA5A5, text #991B1B | red-50 / 300 / 800    |

Copper means verified UPI money and primary product action. Amber means estimated cash. These meanings must remain consistent across the hero preview, summary, chart, legend, and planning controls. Verdict colors remain semantic: green means covered, yellow means dependent on cash, and red means shortfall. Do not introduce blue, purple, indigo, or violet accents.

## Typography

- Display headings: `Sentient`, `Iowan Old Style`, `Baskerville`, Georgia, serif. Use for the landing hero, section headings, and major planner headings.
- Body and controls: `Helvetica Neue`, Helvetica, Arial, sans-serif. Keep inputs at 16px minimum.
- Landing hero title: fluid editorial scale, approximately 48–84px, weight 400, tight line height.
- Planner page title: 20px semibold. Planner section headings: approximately 22px serif. Big money values: 30px or larger with tabular-nums.
- Captions: 12–14px. Chart ticks: 12px. Weights are 400 / 500 / 600 only.
- Use sentence case in the planner. Uppercase is reserved for small landing-page eyebrow labels with restrained letter spacing.

## Layout and surfaces

- Landing page: full-width editorial sections with a maximum content width of approximately 1280px. Use generous vertical spacing, open layouts, and occasional full-width bands.
- Landing page structure: navigation, dark hero, proof strip, product explanation, confidence band, audience section, and final call to action.
- Planner: responsive max-w-6xl workspace. On desktop, pair cash calibration with the runway chart; on mobile, stack them in reading order.
- Planner cards use warm-white surfaces with warm-gray borders and restrained rounding. Avoid nesting cards inside cards.
- The landing page is not a dashboard preview-only screen. `Get started` must navigate to `/app`, where the actual planning workflow begins.

## Data source flow

- `/app` first asks whether the shop owner wants to upload payment history or use sample data.
- The upload screen uses plain language: "Use your payment history" and "Use sample data for now".
- Upload controls must show a disabled loading state while Python builds the forecast, so a user cannot submit the same file twice.
- A short-history warning must be visible when the backend uses the recent 7-day average instead of Prophet.
- The product must say that UPI/POS history shows digital payments only. Cash sales are always labelled as an estimate.

## Controls

- Input: h-11 rounded-md border border-gray-300 px-3 text-base; focus: outline-none ring-2 copper. The rupee sign is a prefix inside the field.
- Landing CTA: compact rectangular button with espresso background and ivory text; hover uses dark copper. Use arrow icons for forward movement.
- Planner primary action: espresso background with copper hover. Secondary action: warm-white background, warm-gray border, pale copper hover.
- Slider: full width, copper accent, in a wrapper at least 44px high.
- Icons: lucide only, 16–20px, stroke 1.75, inline with text, never inside colored circles. Verdicts: CircleCheck (green), TriangleAlert (yellow), CircleX (red). If a name doesn't exist in the installed version, use its alias.

## Chart

Warm-white background. Horizontal gridlines only, dashed #DEDBD4. No axis lines. 12px warm-gray ticks. No animation. Verified UPI money uses copper. Estimated money is drawn with diagonal amber stripes so it cannot be mistaken for verified money. Custom legend below the chart.

## Do NOT (the AI-slop list)

- Gradients (backgrounds, text, borders), glow, blur, glassmorphism, drop shadows
- Dark mode outside the landing hero, confidence band, and final CTA
- Purple, indigo or violet anything
- Sparkle icons, "AI" badges, robot imagery
- Emoji as decoration
- Generic marketing claims, fake metrics, and unrelated testimonials
- Centered-everything layouts
- A row of 4 KPI tiles with icons in colored circles
- Pill-shaped everything (rounded-full only for the slider thumb)
- Hover lift, scale or entrance animations; skeleton shimmer
- Lorem ipsum, fake names, fake testimonials

## Microcopy

Good: "Know what your shop can carry next." / "Out of 10 customers, how many pay in cash?" / "Safe to Buy" / "You may be ₹42,000 short by 25 Oct."
Bad: "Optimize your liquidity runway" / "Unlock smart insights"

Landing page copy should be direct and useful, not inflated: explain the product in terms of UPI history, cash estimates, festival demand, and wholesaler planning. Do not imply that projected receipts are the same as current bank balance.

## Ask AI

- Shown only when the verdict is Yellow or Red. Never on Green or Idle.
- Button (secondary): h-11 px-4 rounded-md border border-gray-300 bg-white text-gray-900 font-medium hover:bg-[#F6E8E0]; focus: outline-none ring-2 copper. Icon: lucide Lightbulb, 16–20px, inline before the label. Never Sparkles, never a robot.
- Result: its own card below the verdict card (no card inside a card). Heading "Ideas to raise the cash" (18px semibold, bottom border only). Body: numbered list, 16px, gray-900, 12px between items. Caption below in 14px gray-500.
- Loading is plain text ("Getting ideas…"). Error is red-tinted text with a 44px Retry button. No spinner, no shimmer, no typing animation.
- "Ask AI" is the only place the letters AI appear in the UI.
