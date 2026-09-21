# DESIGN.md — VyaparRunway

## Visual theme
Looks like a trusted local business app or a printed khata book: plain, calm, and readable in bright shop light on a cheap phone. Information first. Nothing decorative.

## Color
| Role | Hex | Tailwind |
|---|---|---|
| Page background | #FFFFFF | white |
| Subtle surface | #F9FAFB | gray-50 |
| Border | #E5E7EB | gray-200 |
| Text primary | #111827 | gray-900 |
| Text secondary | #4B5563 | gray-600 |
| Text muted (captions) | #6B7280 | gray-500 |
| Bank Balance (UPI) + primary button | #2563EB (hover #1D4ED8) | blue-600 / blue-700 |
| Galla Cash (Estimated) | stroke #F59E0B, stripe base #FEF3C7 | amber-500 / amber-100 |
| Green verdict | bg #F0FDF4, border #86EFAC, text #166534 | green-50 / 300 / 800 |
| Yellow verdict + warning | bg #FEFCE8, border #FDE047, text #854D0E | yellow-50 / 300 / 800 |
| Red verdict | bg #FEF2F2, border #FCA5A5, text #991B1B | red-50 / 300 / 800 |

Blue means money verified in the bank. Amber means money we are guessing. Never reuse these two for anything else. No other accent hues; no purple, indigo or violet.

## Typography
- System font stack: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif
- Body 16px (never smaller for inputs), captions 14px, chart ticks 12px, card headings 18px semibold, page title 20px semibold, big numbers 30px semibold
- Weights 400 / 500 / 600 only. Use tabular-nums for all money. Sentence case everywhere. No letter-spacing tricks, no all-caps.

## Layout and surfaces
- Single column: max-w-2xl mx-auto px-4 py-6. Spacing on a 4px grid: 16px between cards, 24px between sections.
- Card: bg-white border border-gray-200 rounded-lg p-4 sm:p-5. No shadow. No card inside a card. Header is separated by a bottom border only.

## Controls
- Input: h-11 rounded-md border border-gray-300 px-3 text-base; focus: outline-none ring-2 ring-blue-600. The rupee sign is a prefix inside the field.
- Primary button: h-11 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700.
- Slider: full width, accent-blue-600, in a wrapper at least 44px high.
- Icons: lucide only, 16–20px, stroke 1.75, inline with text, never inside colored circles. Verdicts: CircleCheck (green), TriangleAlert (yellow), CircleX (red). If a name doesn't exist in the installed version, use its alias.

## Chart
White background. Horizontal gridlines only, dashed #E5E7EB. No axis lines. 12px gray-500 ticks. No animation. Estimated money is drawn with diagonal amber stripes so it can't be mistaken for verified money. Custom legend below the chart.

## Do NOT (the AI-slop list)
- Gradients (backgrounds, text, borders), glow, blur, glassmorphism, drop shadows
- Dark mode or dark sections
- Purple, indigo or violet anything
- Sparkle icons, "AI" badges, robot imagery
- Emoji as decoration
- Hero sections, taglines, marketing copy
- Centered-everything layouts
- A row of 4 KPI tiles with icons in colored circles
- Pill-shaped everything (rounded-full only for the slider thumb)
- Hover lift, scale or entrance animations; skeleton shimmer
- Lorem ipsum, fake names, fake testimonials

## Microcopy
Good: "Out of 10 customers, how many pay in cash?" / "Safe to Buy" / "You may be ₹42,000 short by 25 Oct."
Bad: "Optimize your liquidity runway" / "Unlock smart insights"

## Ask AI
- Shown only when the verdict is Yellow or Red. Never on Green or Idle.
- Button (secondary): h-11 px-4 rounded-md border border-gray-300 bg-white text-gray-900 font-medium hover:bg-gray-50; focus: outline-none ring-2 ring-blue-600. Icon: lucide Lightbulb, 16–20px, inline before the label. Never Sparkles, never a robot.
- Result: its own card below the verdict card (no card inside a card). Heading "Ideas to raise the cash" (18px semibold, bottom border only). Body: numbered list, 16px, gray-900, 12px between items. Caption below in 14px gray-500.
- Loading is plain text ("Getting ideas…"). Error is red-tinted text with a 44px Retry button. No spinner, no shimmer, no typing animation.
- "Ask AI" is the only place the letters AI appear in the UI.
