# VyaparRunway — Build Spec (PRD + TRD + UX + Agent Prompts)

Version 1.0 · Audience: the 3 developers and the AI coding agent (Antigravity/Gemini/Claude Code) building inside the existing `vyapar-runway/` repo.

**How to use this file.** Section 0 is the rules. Sections 1–3 are the product (PRD). Section 4 is the UX. Sections 5–9 are the technical design (TRD). Section 10 is the build order. Section 11 has the copy-paste prompts. Section 12 is the demo and pitch. Section 13 lists what this spec does not claim. Every tunable number lives in one register (§8.9) so nothing is hidden or guessed.

---

## 0. Rules for whoever builds this (human or AI)

1. **No LLM anywhere in the numeric or decision path.** All figures come from deterministic code plus seeded Monte Carlo. The Gemini advisor is removed from the decision flow (endpoint may stay, unused).
2. **Every displayed number carries provenance:** `Measured` (from the user's files), `Estimated` (inferred by the engine, always shown as a range) or `Assumed` (typed or chosen by the user, or a configured default). See §4.6.
3. **Never show a single-number cash forecast.** Cash is always a range or a probability.
4. **Missing evidence widens the range; it never silently defaults.** If a signal is absent, skip its likelihood and say so in the UI.
5. **Ambiguity rule.** If this spec is silent, choose the simplest option, and append one line to `DECISIONS.md` (date, question, choice). Do not stop to ask.
6. **Numbers in the pitch come only from `backend/benchmark/results.json`.** Do not write result numbers by hand anywhere.
7. **Plain words in the UI.** Banned UI words: runway, inflow, forecast, buffer, posterior, Monte Carlo, MAPE, calibration. Glossary in §4.7.
8. **Privacy.** Uploaded files are parsed in memory and discarded. No transaction data on disk, none in logs.

---

## 1. Context

### 1.1 Problem statement (verbatim intent)
A small retailer misses the festival-season restocking window every year because they cannot forecast cash flow more than a week ahead. Build a simple cash-flow forecasting tool from past UPI/POS history for shop owners with no finance background.

**Twist:** UPI/POS history alone does not show large cash sales from regular, cash-preferring customers. The tool must work with a partial, UPI-biased picture of revenue and say so honestly, not silently under-forecast cash-heavy shops.

### 1.2 What exists today (from the current build)
| Area | Exists | Verdict |
|---|---|---|
| Landing page (editorial, espresso/copper) | Yes | Keep. Small edits only (§4.9). |
| Data import (CSV or sample) | Yes | Extend: column mapping, bank file, manual entry. |
| Shop setup (4 questions) | Yes | Replace with structured setup (§4.3). |
| Cash calibration slider | Yes | Demote to weak evidence (§6.3, E4). |
| Dual runway chart (bars) | Yes | Extend with uncertainty (§4.5). |
| Restock simulator (green/amber/red) | Yes | Replace with probability verdict + break-even + plan. |
| Gemini advisor | Yes | Remove from decision flow. |
| Prophet + Diwali holidays | Yes | Keep as Tier 1 only, optional (§6.1). |
| Synthetic data generator | Yes | Rewrite with hidden ground truth (§7). |
| Backtest vs naive | Yes | Replace with benchmark harness (§7.4). |

### 1.3 The gap this spec closes
The current build answers the twist with a user-guessed slider and point estimates. This spec makes the blind spot the core of the product: infer hidden cash from independent traces, show it as a range, convert it into a decision (probability of affording the order, and the cash the order needs), plan the order timing, and prove it on a benchmark where the true cash is known.

### 1.4 Known bug to fix first (Milestone 0)
Frontend defaults to `http://localhost:5001` (`frontend/src/lib/api.ts`), backend runs on `8000`. Create `frontend/.env` with `VITE_API_URL=http://localhost:8000` and change the fallback in `api.ts` to `http://localhost:8000`.

---

## 2. PRD

### 2.1 Persona
**Primary: Ramesh, 42, kirana + festival stockist.** One shop, 1–3 helpers. Takes UPI (PhonePe/Paytm/GPay QR) and lots of cash. Pays wholesalers partly by UPI/bank, partly cash. Reads Hindi/Marathi, limited English. Uses WhatsApp daily. Not comfortable with spreadsheets. Knows roughly how much Diwali lifts his sales. Each year he decides his festival order by gut and often orders late or too small.

**Secondary (demo only):** a garment/gift-shop owner with a shorter history.

### 2.2 Jobs to be done
1. "Can I afford this festival stock order, and by when must I place it?"
2. "How much of my sales is the tool not seeing, and can I trust its answer?"
3. "If I cannot afford all of it, what should I do?"

### 2.3 Product principles
- Honest before precise: a wide range with a reason beats a narrow wrong number.
- One decision at a time: the user answers one question, sees one verdict.
- Decision-centric uncertainty: instead of guessing cash, show how much cash the decision needs.
- Computed advice only.

### 2.4 Scope and priorities
P0 = must exist for the demo. P1 = should. P2 = if time.

| ID | Feature | Priority |
|---|---|---|
| F1 | Import UPI/POS file with column mapping and quality report | P0 |
| F2 | Bank statement import + purchase tagging + manual alternatives | P0 |
| F3 | Blind-spot estimator (probability distribution over UPI share) with evidence stack | P0 |
| F4 | Cash-count check-in (daily one-number question) | P0 |
| F5 | Structured shop setup (balances, dated obligations, festival timing) | P0 |
| F6 | Probability verdict + three scenarios + break-even cash | P0 |
| F7 | Restock clock (order-by date, countdown, missed-window mode) | P0 |
| F8 | Staged order plan + computed levers | P0 |
| F9 | Sample shops with "Reveal truth" toggle | P0 |
| F10 | Proof page from benchmark results | P0 |
| F11 | Hindi + Marathi + English UI | P1 |
| F12 | Most-useful-question selector (§6.7) | P1 |
| F13 | WhatsApp share of the plan | P1 |
| F14 | Disagreement notice (owner guess vs evidence) | P1 |
| F15 | Prophet Tier 1 integration | P2 |

### 2.5 User stories and acceptance criteria
- **F1.** *As Ramesh, I upload my UPI statement.* AC: file ≤ 5 MB / ≤ 50,000 rows accepted; if headers are not auto-detected, a mapping modal appears; after mapping, a quality card shows days covered, first/last date, total, and warnings (gaps > 3 days, duplicates removed, negative rows dropped).
- **F2.** *I add my bank statement so the tool can see cash deposits and payments to wholesalers.* AC: cash deposits and top-15 debit counterparties are listed; I tick who my wholesalers are; if I have no file I can type "cash I deposit per week" and "I paid wholesalers about ₹X last month" instead.
- **F3.** *I see how much of my sales the tool can and cannot see.* AC: headline range in whole 5% steps; Sight Bar (§4.4); per-evidence range bars; confidence label; text names every source used and every source skipped, with the reason.
- **F4.** *I tell the app my cash for a day.* AC: I choose a date from the last 14 days in the file and type a rupee amount; the range updates within 1 s; up to 14 entries.
- **F5.** *I tell the app my money now and what I must pay.* AC: bank balance, drawer cash, list of obligations (label, amount, date, repeat none/weekly/monthly), safe amount to keep aside (default computed).
- **F6.** *I type an order amount and date and get a verdict.* AC: verdict text uses "N in 100" wording; shows three scenarios (§6.5); shows break-even daily cash and the estimated daily cash range.
- **F7.** *I see the last date I can order.* AC: order-by date and days left; if past, the "missed window" message and the fastest safe plan.
- **F8.** *I get a plan when I cannot afford it all.* AC: 1–3 tranches with dates and amounts, max affordable total, computed levers each with the new "N in 100".
- **F9.** *(Demo)* Sample shops load in one click; "Reveal truth" overlays the real cash on the chart.
- **F10.** Proof page renders charts strictly from `results.json` and states plainly that the benchmark is synthetic.

### 2.6 Success metrics (measured by the benchmark, §7.4)
1. Interval coverage: the 80% range contains the truth between 72% and 88% of the time on the benchmark.
2. False-safe rate (tool says safe, truth is short) lower than both baselines.
3. Total-sales error lower than UPI-only and fixed-ratio baselines in every cash-share bucket.
4. Range narrows after each cash-count entry on at least 80% of benchmark shops.

If a metric fails, the pitch reports the actual number and the failure. Do not tune the benchmark to pass.

### 2.7 Non-goals
Accounting, GST, inventory tracking, real bank/UPI APIs, multi-user auth, payments, native mobile app, item-level demand forecasting.

---

## 3. Problem-statement compliance checklist (use in the pitch)
| PS requirement | Where it is met |
|---|---|
| Forecast beyond a week | 14–75 day horizon ending after the festival (§6.1) |
| From UPI/POS history | F1 |
| No finance background | §4.7 plain words, F11 languages, one-question flow |
| Partial UPI-biased picture | F3 evidence-based cash inference |
| Say so honestly | Ranges, provenance tags, Sight Bar, skipped-source notes, benchmark coverage |
| Restocking window | F7, F8 |

---

## 4. UX specification

### 4.1 Routes and flow
Routes: `/` landing, `/app` stepper, `/proof` benchmark page.
Stepper: **1 Files → 2 Your shop → 3 What we can see → 4 Your order → 5 Your plan.** Back navigation always allowed. Any input change recomputes downstream results (debounce 400 ms) and shows a skeleton, never a stale number.

### 4.2 Screen 1 — Files
Three cards side by side (stacked on mobile):
1. **UPI / card sales file** (required). Drop zone + "Choose file". Helper text: "The sales statement from your PhonePe, Paytm or bank app."
2. **Bank statement** (optional, improves accuracy). Same controls. Below it: "No file? Type it instead" opens the manual form (§4.2.2).
3. **Try a sample shop.** Three options: Sharma Kirana (mostly cash), Patel General (mixed), New Shop (only 45 days).

After upload: quality card (§2.5 F1). If auto-mapping fails: modal "Which column is the date? Which is the amount?" with dropdowns and a 5-row preview.

**4.2.1 Purchase tagging** (after bank upload): list of top-15 debit counterparties by total paid, each with a checkbox "This is a supplier I buy stock from" and the raw description under the name.

**4.2.2 Manual alternatives:**
- "About how much cash do you deposit in the bank per week?" (₹ input, 0 allowed; blank = skip).
- "About how much did you pay wholesalers in the last 4 weeks?" (₹ input).
- Radio: "How much of your stock do you pay for by UPI or bank?" Almost all / Most / About half / Less than half.

### 4.3 Screen 2 — Your shop
Sections, top to bottom:
1. **Shop type** (select: Kirana/grocery, Sweets & dry fruits, Garments, Gifts & puja items, Other).
2. **Money now:** bank balance (₹), cash in drawer (₹).
3. **What you must pay** (repeatable rows: label chip [Rent, Salary, Electricity, Supplier due, Loan EMI, Other], amount, date, repeat none/weekly/monthly). Button "Add another".
4. **Keep aside:** "Keep at least this much aside for daily expenses" (₹). Default = sum of obligations due in the next 7 days (computed, editable, tagged Assumed).
5. **Festival:** festival select (from `config/festivals.json`), festival date (prefilled, editable), "Stock must be on your shelf how many days before the festival?" (number, default 7), "How many days does the wholesaler take to deliver?" (default 3), "How many days of credit does your wholesaler give you?" (default 0).
6. **Festival lift** (shown only when Tier ≠ 1 and no usable prior-year data): "Compared with a normal week, how much more do you usually sell in the 2 weeks before {festival}?" Chips: About the same · 1.5 times · 2 times · 3 times · Not sure (= 1.5 times, tagged Assumed, σ larger). Required.
7. **Owner guess** (optional, weak evidence): "Out of 10 customers, how many pay cash?" slider 0–10 with a "Skip" option.

### 4.4 Screen 3 — What we can see (the memorable screen)
Layout (desktop ≥ 1024 px; on mobile stack vertically):

```
┌───────────────────────────────────────────────────────────────┐
│ We can see about 60–75% of your sales. The rest is probably   │
│ cash.                          [ Not sure yet ]  (confidence) │
│                                                               │
│ SIGHT BAR  (100% = all your real sales)                       │
│ ████████████████████▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░               │
│ Seen in UPI (at least 60%) | could be either | Estimated cash│
│                                                               │
│ WHAT THIS IS BASED ON                                         │
│ Before any evidence      ├────────────────────────┤ (grey)   │
│ Cash you deposited       ├───────────┤             (bar)     │
│ Stock you bought         │      ├──────────┤                 │
│ Your cash counts (2)         ├───────┤                        │
│ Your guess (4 of 10)      ├────────────────┤   (dashed)      │
│  ↑ 0%                 UPI share of sales →         100%      │
│                                                               │
│ Skipped: "Stock you bought" needs 3+ supplier payments.       │
├───────────────────────────────┬───────────────────────────────┤
│ ONE QUESTION TO MAKE THIS     │ Cash figures are estimates,   │
│ MORE ACCURATE                 │ not records.  [How we work]   │
│ Roughly how much did customers│                               │
│ pay you in cash on 21 Sep?    │                               │
│ [ ₹ ______ ]  [Save] [Not now]│                               │
└───────────────────────────────┴───────────────────────────────┘
```

**Sight Bar (the signature element; keep everything else quiet).** One horizontal bar representing 100% of true sales. Three zones using existing palette tokens: solid copper from 0 to `s_p10` ("Seen in UPI: at least X%"), diagonal-hatched amber from `s_p10` to `s_p90` ("Could be either"), light amber tint from `s_p90` to 100 ("Estimated cash"). Zone boundaries animate (250 ms ease) when evidence changes. Labels are beneath the bar in sentence case.

**Evidence stack.** One horizontal range bar per evidence source on a shared 0–100% axis (x = UPI share of sales). The range is the 10th–90th percentile of that source's own normalised likelihood (§6.3). Sources not used are listed as text under the chart with the reason. "Your guess" is dashed to show it is weak.

**Confidence pill** from the width `w = s_p90 − s_p10`: `w < 0.12` "Quite sure", `0.12 ≤ w ≤ 0.25` "Fairly sure", `w > 0.25` "Not sure yet". Icon plus text, never colour alone.

**Disagreement notice (F14)** appears under the bar when the owner's guess lies outside the non-owner posterior p10–p90 by more than 0.10: use string `disagree` (§4.8).

**"Add today's count" button** stays visible on this screen and on Screen 4.

### 4.5 Screen 4 — Your order
Top band, left to right: **Restock clock** ("Order by 30 Oct — 38 days left") and the order form (amount ₹, order date default = plan date).

Main cards:
1. **Verdict card.** Headline: "In 100 possible futures, you stay above your safe amount in {n}." Verdict label from thresholds: n ≥ 80 "Safe to order"; 50 ≤ n < 80 "Risky — plan carefully"; n < 50 "Not enough cash". Icon + label + text.
2. **Three scenario rows** (chips): "Even if you had no cash sales at all: {n0} in 100"; "Most likely: {n1} in 100"; "If cash is on the high side: {n2} in 100".
3. **Break-even card.** "For this order to work, you need about ₹{c*} in cash sales every day. We estimate ₹{lo}–₹{hi}. Is that realistic for your shop?" A gauge with the estimated range as a bracket and c* as a marker. If `c* = 0`: "This order works even with no cash sales." If unreachable: "This order does not work even with high cash sales."
4. **Money chart** (Recharts `ComposedChart`): p10–p90 band of your total money per day (area), median line, dashed "safe amount" line, vertical markers for festival and order dates. Below it, daily bars: UPI (solid copper, median) and estimated cash (hatched amber, median, with p10–p90 whisker). Sample shops with "Reveal truth" on show the true cash as a dark dotted line.
5. "Add today's count" and "Change order" controls.

### 4.6 Provenance tags (component `<Tag kind>`)
`Measured` (solid dot), `Estimated` (hollow dot + range always adjacent), `Assumed` (dashed outline). Each tag has a tooltip explaining the source. Every rupee figure or percentage on Screens 3–5 has a tag.

### 4.7 Screen 5 — Your plan
1. **Plan timeline:** up to 3 tranche cards on a date axis (amount, date, "Pay on {date}"), festival marker, order-by marker.
2. **Result line:** "You can order ₹{T} of your ₹{A} target and stay safe" or "Your full ₹{A} order is safe."
3. **Levers table** (computed, §6.6): each row = action + resulting "{n} in 100".
4. **Send on WhatsApp** (F13): opens `https://wa.me/?text={urlencoded summary}` with the plan in the selected language.
5. **Disclosure footer** (always): "Cash figures are estimates, not records."

### 4.8 Copy and i18n
Files: `frontend/src/i18n/en.json`, `hi.json`, `mr.json`, plus `index.ts` exposing `t(key, params)` (replace `{name}` placeholders; no library). Language toggle in the top bar, stored in `localStorage` key `vr_lang`. Numbers always use `Intl.NumberFormat('en-IN')` with Latin digits, prefix ₹. Fonts: add Noto Sans Devanagari for `hi`/`mr` with the existing sans as fallback. **Have a native speaker review hi/mr before the demo.**

| key | en | hi | mr |
|---|---|---|---|
| tagline | Plan your festival stock with confidence | त्योहार का माल भरने की सही योजना बनाइए | सणासाठी माल भरण्याचे अचूक नियोजन करा |
| blind.title | What we can see, and what we can't | हम क्या देख पाते हैं, और क्या नहीं | आम्हाला काय दिसते आणि काय दिसत नाही |
| blind.headline | We can see about {lo}–{hi}% of your sales. The rest is probably cash. | हमें आपकी बिक्री का लगभग {lo}–{hi}% दिखता है। बाकी शायद नकद है। | आम्हाला तुमच्या विक्रीपैकी सुमारे {lo}–{hi}% दिसते. बाकी बहुधा रोख आहे. |
| conf.wide | Not sure yet | अभी पक्का नहीं | अजून पक्के नाही |
| conf.medium | Fairly sure | कुछ हद तक पक्का | काहीसे पक्के |
| conf.narrow | Quite sure | काफ़ी पक्का | बरेच पक्के |
| tag.measured | Seen in UPI | UPI में दिखा | UPI मध्ये दिसले |
| tag.estimated | Estimated cash | अनुमानित नकद | अंदाजे रोख |
| tag.assumed | You told us | आपने बताया | तुम्ही सांगितले |
| verdict.headline | In 100 possible futures, you stay above your safe amount in {n}. | 100 संभावित हालात में से {n} में आप अपनी सुरक्षित रकम से ऊपर रहते हैं। | 100 शक्यतांपैकी {n} मध्ये तुम्ही तुमच्या सुरक्षित रकमेच्या वर राहता. |
| verdict.safe | Safe to order | ऑर्डर करना सुरक्षित है | ऑर्डर देणे सुरक्षित आहे |
| verdict.risky | Risky — plan carefully | जोखिम है — सोच-समझकर करें | जोखीम आहे — काळजीपूर्वक ठरवा |
| verdict.short | Not enough cash | नकद कम पड़ेगा | रोख कमी पडेल |
| scenario.none | Even if you had no cash sales at all: {n} in 100 | अगर आपकी कोई नकद बिक्री न हो तब भी: 100 में से {n} | जरी तुमची रोख विक्री अजिबात नसली तरी: 100 पैकी {n} |
| breakeven | For this order to work, you need about ₹{x} in cash sales every day. | इस ऑर्डर के लिए आपको रोज़ लगभग ₹{x} नकद बिक्री चाहिए। | या ऑर्डरसाठी तुम्हाला रोज सुमारे ₹{x} रोख विक्री लागेल. |
| breakeven.ask | Is that realistic for your shop? | क्या आपकी दुकान में यह मुमकिन है? | तुमच्या दुकानात हे शक्य आहे का? |
| clock.orderBy | Order by {date} — {n} days left | {date} तक ऑर्डर करें — {n} दिन बाकी | {date} पर्यंत ऑर्डर द्या — {n} दिवस बाकी |
| clock.missed | The order date passed {n} days ago. Here is the fastest safe plan. | ऑर्डर की तारीख {n} दिन पहले निकल गई। यह सबसे तेज़ सुरक्षित योजना है। | ऑर्डरची तारीख {n} दिवसांपूर्वी गेली. ही सर्वात जलद सुरक्षित योजना आहे. |
| question.title | One question to make this more accurate | इसे और सटीक बनाने के लिए एक सवाल | हे अधिक अचूक करण्यासाठी एक प्रश्न |
| q.cashCount | Roughly how much did customers pay you in cash on {date}? | {date} को ग्राहकों ने आपको नकद में लगभग कितना दिया? | {date} रोजी ग्राहकांनी तुम्हाला रोख किती दिले? |
| q.purchaseDigital | How much of your stock do you pay for by UPI or bank? | आप अपने माल का कितना हिस्सा UPI या बैंक से चुकाते हैं? | तुम्ही माल घेतलेल्या रकमेपैकी किती UPI किंवा बँकेने देता? |
| disagree | You said {a}% of customers pay cash, but your other numbers point to about {b}%. Please check. | आपने बताया {a}% ग्राहक नकद देते हैं, पर बाकी आँकड़े लगभग {b}% बताते हैं। कृपया जाँचें। | तुम्ही {a}% ग्राहक रोख देतात असे सांगितले, पण इतर आकडे सुमारे {b}% दाखवतात. कृपया तपासा. |
| keepAside | Keep at least this much aside for daily expenses | रोज़ के खर्च के लिए कम से कम इतनी रकम अलग रखें | रोजच्या खर्चासाठी किमान इतकी रक्कम बाजूला ठेवा |
| plan.title | Your step-by-step order plan | आपकी चरण-दर-चरण ऑर्डर योजना | तुमची टप्प्याटप्प्याची ऑर्डर योजना |
| plan.share | Send on WhatsApp | WhatsApp पर भेजें | WhatsApp वर पाठवा |
| disclaimer | Cash figures are estimates, not records. | नकद के आँकड़े अनुमान हैं, रिकॉर्ड नहीं। | रोख आकडे अंदाज आहेत, नोंदी नाहीत. |
| cta.sample | Try a sample shop | एक नमूना दुकान आज़माएँ | नमुना दुकान वापरून पहा |

**Glossary (internal term → UI wording):** posterior/estimate range → "about X–Y%"; P(safe) → "N in 100"; floor → "safe amount"; liquidity → "your money (bank + drawer)"; inflow → "money coming in"; horizon → "until after the festival"; break-even cash → "cash sales you need each day".

### 4.9 Visual system
Use existing tokens from `DESIGN.md` (espresso, copper, amber) unchanged. Add only these semantic tokens, and never rely on colour alone (each state has an icon and text): `--state-safe`, `--state-risky`, `--state-short` (pick accessible values that hit ≥ 4.5:1 contrast on the card background; record chosen hex in `DESIGN.md`). Type: base 16 px, ≥ 44 px touch targets, line length ≤ 70 characters, sentence case, no all-caps labels. Motion: only the Sight Bar boundary animation and user-triggered transitions; respect `prefers-reduced-motion`. Landing page edits: remove the word "runway" from user-visible copy, add the language toggle, change primary CTA to "Try a sample shop". No other landing work.

### 4.10 States
| State | Behaviour |
|---|---|
| No file yet | Screens 3–5 disabled with a single line telling what to do. |
| Parsing | Progress indicator; cancel allowed. |
| Parse error | Message names the problem and the fix (e.g., "We could not read dates in column B. Choose the date column."). No apologies, no vague text. |
| History < 60 days | Banner: "Short history: we use recent sales and your festival answer, so ranges are wider." |
| File older than 3 days | Banner: "Your file ends on {date}. Numbers may be out of date." |
| No cash evidence | Sight Bar uses the prior only; headline changes to "We cannot see your cash yet. Add one fact below." |
| Festival date already passed | Ask to pick the next festival. |
| API down | "Could not reach the server on {url}. Check that the backend is running." plus Retry. |

### 4.11 Accessibility
Keyboard reachable everywhere with visible focus; charts have a text summary above them (the headline sentences); form labels attached; announce verdict changes via `aria-live="polite"`.

---

## 5. Architecture

```
Frontend (Vite + React + TS + Tailwind + Recharts)
  └── REST (JSON, multipart) ──> Backend (FastAPI, Python 3.11 or 3.12)
                                   ├── engine/   deterministic + seeded Monte Carlo (numpy)
                                   ├── sessions  in-memory dict, TTL 2 h, no disk
                                   ├── config/   festivals.json, categories.json, engine_params.json
                                   ├── samples/  3 synthetic shops (+ truth.json)
                                   └── benchmark/ generator v2 + harness + results.json
```
Python: pin 3.11 or 3.12 (Prophet wheels; 3.14 is risky). Prophet is optional behind `ENABLE_PROPHET=false` default. Everything must work without it.

### 5.1 Repo changes
```
backend/
  main.py                    slim: mounts routers, CORS (frontend origin only)
  engine/
    schemas.py               Pydantic v2 models (§8)
    config.py                loads config/*.json, exposes typed params
    parsing_upi.py           §6.0
    parsing_bank.py          §6.0
    forecast_upi.py          §6.1 tiers (wraps existing forecast_model.py for Tier 1)
    evidence.py              §6.3 likelihoods, posterior, samplers
    simulate.py              §6.4
    verdict.py               §6.5 P(safe), scenarios, break-even
    planner.py               §6.6 tranches + levers
    clock.py                 §6.2
    voi.py                   §6.7
    sessions.py
  config/ festivals.json  categories.json  engine_params.json
  samples/<shop>/ upi.csv bank.csv meta.json truth.json
  benchmark/ generate_data_v2.py  run_benchmark.py  results.json
  tests/ test_parsing.py test_evidence.py test_simulate.py test_verdict.py test_planner.py test_api.py
frontend/src/
  i18n/ index.ts en.json hi.json mr.json
  state/ store.tsx           context + reducer for the whole flow
  lib/ api.ts format.ts      api.ts fixed base URL; format.ts en-IN formatting
  components/ (see §5.2)
  pages/ Proof.tsx
```

### 5.2 Frontend components
| Component | Status | Props / contract |
|---|---|---|
| `FilesStep` (wraps `DataImport`) | modify | emits parsed summaries; hosts `ColumnMapModal`, `PurchaseTagger`, `ManualEvidenceForm` |
| `ShopSetup` | rewrite | writes `ShopConfig` (§8) |
| `ObligationsEditor` | new | list of `{label, amount, date, repeat}` |
| `SightBar` | new | `{sP10, sP50, sP90}` |
| `EvidenceStack` | new | `{sources: {id, label, lo, hi, weak, used, skipReason?}[]}` |
| `ConfidencePill` | new | `{width}` |
| `QuestionCard` | new | `{question: NextQuestion, onSubmit}` |
| `Tag` | new | `{kind: 'measured'|'estimated'|'assumed'}` |
| `RestockClock` | new | `{orderBy, daysLeft, missed}` |
| `OrderForm` | new | amount, date |
| `VerdictCard` | new | `{pSafe, scenarios}` |
| `BreakEvenGauge` | new | `{cStar, lo, hi}` |
| `MoneyChart` | replaces `DualRunwayChart` | band + line + bars + whiskers + optional truth overlay |
| `PlanTimeline`, `LeverTable`, `ShareButton` | new | from `/plan` response |
| `RestockSimulator`, `AdvisorPanel`, `CalibrationSlider` | remove from flow | slider logic moves into `ShopSetup` (owner guess) |
| `lib/forecast.ts` | delete | all math is server-side now (single source of truth) |

---

## 6. Algorithms (exact)

Notation: `H` horizon days; day `t=1..H` is `as_of + t`; `U_t` UPI credits (₹); `C_t` cash sales (₹, unobserved); `s` UPI share of true sales (0<s<1); cash share `1−s`; `k=(1−s)/s`. `N=2000` Monte Carlo draws; random seed = `hash(session_id)` and reused for all calls (**common random numbers**, required so results are monotone in order amount).

### 6.0 Parsing
**UPI/POS file.** Accepted: CSV, TSV, XLSX (first sheet). Canonical output: daily series `date, amount` (sum per day), plus `txn_count` if available.
- Header aliases (case-insensitive, trimmed): date ∈ {date, txn date, transaction date, settlement date, credit date, value date}; amount ∈ {amount, credit, amount (inr), amount in inr, settled amount, txn amount, net amount}. If a debit/credit pair exists, use credit. If detection fails → HTTP 422 `{needs_mapping:true, headers, sample_rows}`; client sends `mapping` on retry.
- Date formats tried in order: `YYYY-MM-DD`, `DD-MM-YYYY`, `DD/MM/YYYY`, `DD-Mon-YYYY`, `DD Mon YYYY`. If > 5% of rows fail, reject with 422 naming the failing column.
- Amount cleaning: strip `₹`, `Rs.`, `INR`, commas, spaces; parentheses = negative. Drop rows ≤ 0 (count them in warnings). Drop exact duplicate rows only when a unique-ID column exists; otherwise keep and warn.
- Fill missing days with 0 **only** if the file spans ≥ 30 days and the day is inside the range; report the count as `zero_filled_days`. Warn if any gap > 3 days.

**Bank file.** Canonical rows `date, description, debit, credit`. Same date/amount cleaning. Classification, first match wins, case-insensitive on `description`:
1. `cash_deposit` if credit>0 and matches `(CASH\s*DEP|CDM|CASH\s*DEPOSIT|BY\s*CASH)`.
2. `cash_withdrawal` if debit>0 and matches `(ATM|CASH\s*WDL|CASH\s*WITHDRAWAL|SELF)`.
3. `upi_credit` if credit>0 and matches `UPI`.
4. `digital_debit` if debit>0 (UPI/NEFT/IMPS/RTGS/cheque/other).
Counterparty extraction for `digital_debit`: split description on `/` and `-`; drop tokens that are numeric, ≤ 3 chars, or in `{UPI, NEFT, IMPS, RTGS, CHQ, DR, TO, BY, PAYMENT}` or look like bank codes (`^[A-Z]{4}0`); take the longest remaining alphabetic token; if none, use the raw description. The user confirms tagging in the UI, so misparses are recoverable.

### 6.1 UPI forecast tiers and horizon
`history_days` = days from first to last UPI date. `as_of` = today's date (sample shops: `meta.json.as_of`). `H = clamp(days_until(festival_date) + 7, 14, 75)`.

**Tier 1** (`ENABLE_PROPHET` and `history_days ≥ 730`): existing Prophet model, multiplicative seasonality, holidays from `festivals.json`, `interval_width=0.8`. Outputs `median_t = yhat`, `σ_t = (ln yhat_upper − ln yhat_lower)/(2·1.2816)` (floor 0.10).

**Tier 2** (`60 ≤ history_days < 730`, or Tier 1 unavailable):
- `level` = trimmed mean (drop lowest and highest 10%) of daily `U` over the last 28 days.
- Weekday factor `f_d` = (mean of `U` on weekday d over last 8 weeks)/(mean over all days), shrunk: `f_d ← 1 + (f_d − 1)·w`, `w = n_weeks/(n_weeks+4)`.
- `resid_sd` = std of `ln(U_t / (level·f_dow(t)))` over the last 56 days (days with `U>0`); `σ_t = clamp(resid_sd, 0.15, 0.45)`.
- Festival uplift `u`: if history contains the **previous year's** window of the same festival (dates from `festivals.json`, both windows fully inside history and each with ≥ 10 days of data), `u = mean(U over [F'−14, F'+1]) / mean(U over [F'−56, F'−29])`, `σ_u = 0.20`, tag Estimated. Otherwise `u` from the owner chip (1, 1.5, 2, 3; "Not sure" = 1.5), `σ_u = 0.30`, tag Assumed.
- Multiplier for day with `offset = date − F`: `g = 1` if `offset < −14` or `offset > +1`; else `g = 1 + (u−1)·min(1, (offset+15)/15)`.
- `median_t = level · f_dow(t) · g(offset_t)`.

**Tier 3** (`history_days < 60`): `level` = mean of last 7 days, `f_d = 1`, `σ_t = 0.35`, uplift from the owner chip with `σ_u = 0.35`.

**Draw model** (per draw i, day t), splitting `σ_t` into a shared level part and a daily part (0.6² + 0.8² = 1):
`U_t = median_t · exp(0.6·σ̄·z_L + 0.8·σ_t·z_t − 0.5·σ_t²)` where `σ̄ = mean(σ_t)`, `z_L ~ N(0,1)` per draw, `z_t ~ N(0,1)` per day; for Tiers 2–3 multiply by `exp(σ_u·z_u − 0.5σ_u²)` on the uplift factor `(u−1)`: implement as `u_draw = 1 + (u−1)·exp(σ_u z_u − 0.5σ_u²)` inside `g`. Clip `U_t ≥ 0`.

### 6.2 Restock clock
```
stock_by      = festival_date − days_on_shelf                 # default 7
order_by      = stock_by − delivery_days                       # default 3
pay_date(o)   = o.date + credit_days                           # default 0
days_left     = order_by − today
missed        = days_left < 0
```
If `missed`: the plan (§6.6) searches order dates in `[today, today + 2]` only, and the UI shows the `clock.missed` string with `n = −days_left`. Do not compute or show a "cost of waiting" unless the user typed a wholesaler price-rise % (optional field); then `cost = A · rise% · (days_late/14)` shown with tag Assumed.

### 6.3 Blind-spot posterior (the core)
Grid `G` = 400 evenly spaced values in [0.05, 0.99]. Prior: Beta(2,2), density ∝ s(1−s). Posterior ∝ prior × ∏ likelihoods on `G`, normalised. **Evidence window `W`** = last `min(56, history_days)` days of the UPI file; `U_W = Σ U` over `W`. Bank/manual amounts are scaled to `W` by overlap (bank rows inside `W`); manual weekly numbers are multiplied by `|W|/7`.

| ID | Evidence | Used when | Likelihood on `s` |
|---|---|---|---|
| E1 | Cash deposits `D_W` (bank file or manual) | `D_W > 0`. If bank uploaded and `D_W = 0`, **skip** (no deposits ≠ no cash) | `s_max = U_W/(U_W + D_W)`; `L1(s) = 1/(1+exp((s − s_max)/0.03))` |
| E2 | Stock bought digitally `P_W` | ≥ 3 tagged supplier debits (or manual `P_W`), `|W| ≥ 28`, digital-share answer ≠ "Less than half" | `q` from answer: Almost all 0.9 (`σ_q`=0.08), Most 0.7 (0.15), About half 0.5 (0.25). `m_lo,m_hi` from `categories.json`; `m_mid = (m_lo+m_hi)/2`; `σ_m = (ln(1−m_lo) − ln(1−m_hi))/(2·1.2816)`; `S_imp = P_W/(q·(1−m_mid))`; `σ² = σ_m² + σ_q² + 0.15²`; `L2(s) = exp(−(ln(U_W/s) − ln S_imp)²/(2σ²))` |
| E3 | Cash counts `(d, c_d)` | for each entry with `U_d ≥ 500` | `s_d = U_d/(U_d + c_d)`; `L3(s) = ∏ exp(−(s − s_d)²/(2·0.10²))` |
| E4 | Owner guess `n` of 10 pay cash | provided | `s_o = 1 − n/10`; `L4(s) = exp(−(s − s_o)²/(2·0.15²))` |

Sanity vector (unit test): `U_W=180000`, `P_W=150000`, `q=0.7`, `m_mid=0.15` → `S_imp=252,100.84`, point `s = U_W/S_imp = 0.7140`, cash share 28.6%.

**Outputs:** `s_p10, s_p50, s_p90` from the posterior CDF; display range `lo = floor5(100·s_p10)`, `hi = ceil5(100·s_p90)` (whole 5% steps; avoids false precision). Sampler: inverse-CDF draw of `N` values of `s` (sorted uniform stratified draws, then shuffled with the session seed). **Per-evidence bar** = 10th–90th percentile of `prior × L_i` normalised on `G`. **Non-owner posterior** = posterior without E4 (for F14). **Disagreement** if `s_o` is outside the non-owner p10–p90 by more than 0.10 and at least one of E1–E3 was used; `a = 100(1−s_o)`, `b = round(100(1−s_nonowner_p50))`.

### 6.4 Cash-flow simulation
Inputs: `bank0, drawer0` (`L_0 = bank0+drawer0`), obligations expanded to dated outflows over the horizon (weekly = every 7 days from the start date; monthly = same day-of-month, clipped to month length), orders `[{amount, date}]` each paid on `date + credit_days`, `floor` (safe amount).
Per draw `i`: `s_i` from §6.3, `k_i=(1−s_i)/s_i`; `U_t` from §6.1; `C_t = U_t · k_i · exp(0.10·η_t − 0.005)` with `η_t ~ N(0,1)`.
```
L_t = L_{t−1} + U_t + C_t − Obl_t − Ord_t          # receipts first, payments after, same day
safe_i = min_{t=1..H} L_t ≥ floor
```
All arrays shape `(N, H)`, vectorised in numpy. Report per-day p10/p50/p90 of `L_t`, of `U_t`, and of `C_t`. Dates of UPI credits are treated as bank-credit dates (settlement lag 0).

### 6.5 Verdict, scenarios, break-even
`P_safe = mean(safe_i)`, `n = round(100·P_safe)`. Label: n ≥ 80 safe; 50 ≤ n < 80 risky; n < 50 short.
Scenarios (same draws, same seed): **none** → set `C_t = 0`; **likely** → as is; **high** → keep only draws with `s_i ≤ posterior p10` (if fewer than 100 remain, resample `s` from the posterior truncated at p10 to N draws).
**Break-even cash `c*`:** use the **median** UPI path (`median_t`), no noise, constant daily cash `c`, same obligations/orders/floor. Bisection on `c ∈ [0, c_max]` with `c_max = 3·max(median_t)`, tolerance ₹10, 40 iterations max. If safe at `c=0` return `0`; if unsafe at `c_max` return `null`. Estimated daily cash range = p10–p90 over draws of `mean_t(C_t)`. Test vector: `L_0=100000`, `H=10`, `U=5000/day`, no obligations, floor 0, one order ₹150000 paid on day 3 → `c* = 11,666.67` (from `−35000 + 3c ≥ 0`).

### 6.6 Order plan and levers
Inputs: target amount `A`, `thr = 0.80`, dates on a 1-day grid within `[max(today, order_by−14), order_by]` (or `[today, today+2]` if missed).
1. `earliest_safe(a)` = earliest date `d` where the single order `(a, d)` has `P_safe ≥ thr`. If exists for `a=A` → single-tranche plan on that date.
2. Otherwise build up to 3 tranches with dates `d_1 = earliest date allowed`, `d_3 = order_by`, `d_2` = midpoint (1–2 tranches if the range is short). For `i = 1..n`: `a_i = max amount in [0, A − Σprev]` such that `P_safe ≥ thr` with tranches `1..i` in place and later tranches at 0 (bisection, tolerance ₹100, common random numbers). `T = Σ a_i`.
3. Result: plan, `T`, `T/A`. If `T < A` also report the shortfall `A − T`.
4. **Levers** (each evaluated with the same draws, reporting the new `n` for the **full target A ordered on `order_by`**): (a) wholesaler credit +7 days; (b) order 10% less; (c) order 20% less; (d) keep-aside amount −25% (tag Assumed and show a note that this lowers the safety margin). No other levers; no LLM text.
WhatsApp summary is a fixed template per language using plan fields only.

### 6.7 Most useful question (F12)
Candidates not yet answered: `cash_count` (always), `digital_share` (only if purchase data exists and the answer is missing). For each candidate run `n_sim=40`: draw `s*` from the current posterior; simulate a reported value (cash count: `s_report = clip(s* + N(0, 0.10²), 0.05, 0.99)`; digital share: pick the answer option nearest to a random choice weighted uniformly); update the posterior; record width `s_p90 − s_p10`. Choose the candidate with the largest mean reduction vs current width. Fallback if no bank/manual purchase or deposit evidence: suggest "Add your bank statement or type your weekly cash deposit" first, then `cash_count`.

---

## 7. Data, samples and benchmark

### 7.1 Config files
- `config/festivals.json`: `[{id, name, regions, dates: {year: "YYYY-MM-DD"}, categories}]`. Dates below were checked against public panchang/holiday listings on 22 Sep 2026; they are used only to align windows, so ±1 day makes no material difference. **Verify before demo** (sources disagree by one day for some).
  - Diwali (Lakshmi Puja): 2023-11-12, 2024-11-01 (Oct 31/Nov 1 in some calendars), 2025-10-20 (Oct 20/21 in different calendars), 2026-11-08. Dhanteras 2026-11-06 (sources agree).
  - Ganesh Chaturthi: 2024-09-07, 2025-08-27, 2026-09-14 (already passed; do not offer as the default).
  - Navratri–Dussehra (anchor = Dussehra): 2024-10-12, 2025-10-02, 2026-10-20 (sources conflict 20 vs 21 Oct; Navratri starts 11 or 12 Oct in different calendars).
- `config/categories.json`: `{id, label, m_lo, m_hi}`. Defaults are **assumptions** (see §8.9): kirana 0.08–0.18, sweets_dryfruit 0.15–0.30, garments 0.25–0.45, gifts_puja 0.15–0.30, other 0.10–0.30. Show them in the "How we work" panel with tag Assumed; replace if you find a citable source.
- `config/engine_params.json`: every constant in §8.9.

### 7.2 Sample shops (three bundles)
| Shop | History | True UPI share `s_shop` | Digital share of purchases `q_shop` | Category |
|---|---|---|---|---|
| Sharma Kirana | 800 days | 0.40 (cash-heavy) | 0.70 | kirana |
| Patel General | 300 days | 0.65 | 0.90 | gifts_puja |
| New Shop | 45 days | 0.55 | 0.50 | kirana |
`meta.json`: `{name, as_of, category, bank0, drawer0, obligations[], floor, festival_id, festival_date}`. `truth.json`: daily `true_sales, true_cash` (used only by Reveal truth and `/proof`; the API returns it only when `reveal=true` for `samples`).

### 7.3 Generator v2 (`benchmark/generate_data_v2.py`)
Deterministic given `seed`. Daily true sales `S_t = base · dow_factor · trend · festival_mult · exp(0.15·N(0,1) − 0.011)`, with `dow_factor` from a fixed weekly table, `trend` = 1 + annual growth × years, `festival_mult` = ramp per §6.1 with a true uplift `u_true ~ U(1.4, 2.6)` per shop. UPI share on day `t`: `s_t = clip(s_shop + 0.05·festival_flag + 0.03·N(0,1), 0.1, 0.95)`; `U_t = S_t·s_t`; `C_t = S_t·(1−s_t)`.
Bank file synthesis: (i) UPI credits (aggregate per day); (ii) cash deposits every 3–5 days of a random fraction `f ~ U(0.4, 0.8)` of accumulated undeposited cash (rest spent in cash); (iii) supplier payments weekly: total = `0.85 · Σ S over the previous 7 days · q_shop` split over 1–3 counterparties with realistic-looking names and random UPI/NEFT descriptions; (iv) obligations (rent monthly, salaries monthly, electricity monthly); (v) ATM withdrawals randomly. **The generator must not use any of the inference code**, so the benchmark is not circular. State in the README and on `/proof` that the data is synthetic and that the generator's assumptions drive the results.

### 7.4 Benchmark harness (`benchmark/run_benchmark.py`)
Shops: 300, stratified by `s_shop ∈ {0.2,0.3,…,0.8}`, `q_shop ∈ {0.9,0.7,0.5,0.25}`, history ∈ {45, 120, 400} days, seeds fixed. Cutoff so the next 30 days fall before a festival in the generated timeline. Ground truth = the true next-30-day sales and the true safe/short outcome for a standard order `A = 0.6 × true expected next-30-day sales`.
Methods:
- **M0 UPI-only:** treat `U` as total sales (deterministic path).
- **M1 Fixed-ratio slider:** `s_guess = s_shop + N(0, 0.15)` clipped, point cash = `U·(1−s_guess)/s_guess`.
- **M2 Ours:** full engine with evidence set `{owner guess (same error as M1), bank file, purchase digital share answer, 0 | 3 | 7 cash counts}`.
Metrics per method and per `s_shop` bucket: (a) total-sales sMAPE for the 30-day sum; (b) verdict confusion matrix vs truth (false-safe, false-short), with M0/M1 "safe" = deterministic path clears the floor and M2 "safe" = `n ≥ 80`; (c) M2 only: coverage of the 50/80/95% intervals of the 30-day total; (d) M2 only: fraction of shops whose `s` range width shrinks after each added cash count.
Output `results.json` with `generated_at`, `seed`, `n_shops`, all metrics, and `synthetic: true`. The `/proof` page renders: grouped bar (error by bucket), false-safe/false-short bars, calibration line (nominal vs observed coverage), and a plain-language caveat block. **If a metric is bad, show it.**

---

## 8. Contracts

### 8.1 Types (Pydantic v2 / TS mirror)
```
Obligation   {label: str, amount: float>0, date: date, repeat: "none"|"weekly"|"monthly"}
ShopConfig   {category: str, bank0: float>=0, drawer0: float>=0, obligations: Obligation[],
              floor: float>=0, festival_id: str, festival_date: date, days_on_shelf: int (default 7),
              delivery_days: int (default 3), credit_days: int (default 0),
              lift_choice: 1|1.5|2|3|"unsure"|null, owner_cash_of_10: int 0..10|null,
              price_rise_pct: float|null}
CashCount    {date: date, amount: float>=0}
Order        {amount: float>0, date: date}
```

### 8.2 Endpoints (all under `/api`, JSON unless noted)
| Method & path | Body | Response |
|---|---|---|
| `POST /session` | `{language}` | `{session_id}` |
| `POST /session/{id}/upi` (multipart `file`, optional `mapping`) | file | `{days, first_date, last_date, total, warnings[], zero_filled_days, tier}` or 422 `{needs_mapping, headers, sample_rows}` |
| `POST /session/{id}/bank` (multipart, optional `mapping`) | file | `{cash_deposit_total_in_window, cash_deposit_count, top_debits: [{name, raw, total, count}], warnings[]}` |
| `PUT /session/{id}/purchases` | `{suppliers: str[]}` | `{purchase_total_in_window, txn_count}` |
| `PUT /session/{id}/manual` | `{weekly_cash_deposit?, purchases_last_4w?, digital_share?: "almost_all"|"most"|"half"|"less"}` | `{ok}` |
| `PUT /session/{id}/shop` | `ShopConfig` | `{derived: {order_by, days_left, missed, default_floor}}` |
| `POST /session/{id}/cashcount` | `CashCount` | `{count_id}` (DELETE `/cashcount/{count_id}` removes) |
| `GET /session/{id}/blindspot` | – | see §8.3 |
| `POST /session/{id}/verdict` | `{orders: Order[]}` | see §8.4 |
| `POST /session/{id}/plan` | `{target_amount}` | see §8.5 |
| `POST /session/{id}/sample/{name}` | `?reveal=false` | loads a sample; response like the combination of the calls above |
| `GET /benchmark` | – | contents of `results.json` (404 if missing) |
| `GET /health` | – | `{status, prophet_enabled, python}` |
Errors: `{error: {code, message, field?}}` with HTTP 4xx; messages are user-readable (§4.10).

### 8.3 `/blindspot` response (illustrative values)
```json
{
  "share_seen": {"p10": 0.58, "p50": 0.67, "p90": 0.76, "display": {"lo": 55, "hi": 80}},
  "confidence": "medium",
  "evidence": [
    {"id": "prior", "label": "Before any evidence", "lo": 0.15, "hi": 0.85, "used": true, "weak": true},
    {"id": "cash_deposits", "label": "Cash you deposited", "lo": 0.10, "hi": 0.74, "used": true, "weak": false},
    {"id": "stock_bought", "label": "Stock you bought", "lo": 0.55, "hi": 0.80, "used": true, "weak": false},
    {"id": "cash_counts", "label": "Your cash counts (2)", "lo": 0.52, "hi": 0.78, "used": true, "weak": false},
    {"id": "owner_guess", "label": "Your guess", "lo": 0.35, "hi": 0.75, "used": true, "weak": true}
  ],
  "skipped": [{"id": "x", "reason": "Needs 3 or more supplier payments"}],
  "disagreement": null,
  "next_question": {"kind": "cash_count", "date": "2026-09-21"}
}
```
### 8.4 `/verdict` response
```json
{
  "p_safe": 0.78, "n": 78, "label": "risky",
  "scenarios": {"none": 0.31, "likely": 0.78, "high": 0.93},
  "break_even": {"c_star": 4200, "daily_cash_p10": 3100, "daily_cash_p90": 6900, "status": "ok"},
  "clock": {"order_by": "2026-10-30", "days_left": 38, "missed": false},
  "chart": {"dates": ["..."], "liquid": {"p10": [], "p50": [], "p90": []},
            "upi": {"p50": []}, "cash": {"p10": [], "p50": [], "p90": []},
            "floor": 12000, "markers": [{"type": "festival", "date": "2026-11-08"}]},
  "truth": null
}
```
### 8.5 `/plan` response
```json
{"target": 300000, "affordable_total": 240000, "fully_affordable": false, "shortfall": 60000,
 "tranches": [{"date": "2026-10-05", "amount": 140000}, {"date": "2026-10-30", "amount": 100000}],
 "levers": [{"id": "credit_plus_7", "n": 84}, {"id": "order_minus_10", "n": 81}, {"id": "order_minus_20", "n": 92}, {"id": "floor_minus_25", "n": 83}],
 "whatsapp_text": "..."}
```

---

## 9. Non-functional requirements
| Area | Requirement |
|---|---|
| Performance | `/blindspot` p95 < 500 ms; `/verdict` p95 < 1.5 s with N=2000, H≤75; `/plan` p95 < 4 s; UI must never block on Prophet (fit once per upload, cached in session). |
| Reliability | Every endpoint validates inputs; no unhandled 500s; if Prophet fails, silently fall back to Tier 2 and set `tier: 2`. |
| Privacy | Uploaded bytes never written to disk; logs contain only session id, endpoint, status, latency. CORS allows only the configured frontend origin. |
| Limits | 5 MB and 50,000 rows per file; 14 cash counts; 30 obligations; sessions expire after 2 h idle. |
| Determinism | Same inputs and session seed produce identical outputs. |
| Browser support | Latest Chrome/Edge/Safari/Firefox; mobile width 360 px. |
| Run | `backend`: `python -m venv .venv`, `pip install -r requirements.txt`, `uvicorn main:app --port 8000 --reload`. `frontend`: `npm i`, `npm run dev`. |

### 9.1 Test plan
- **Unit:** parsing (aliases, date formats, bad rows), evidence vectors (§6.3 sanity vector), break-even vector (§6.5), planner monotonicity (P_safe non-increasing in amount under common random numbers), reproducibility.
- **API:** upload → blindspot → verdict → plan happy path on each sample; 422 mapping path; expired session.
- **Acceptance tests:**
  1. AT-01 Sharma Kirana loads and `/blindspot` display range contains the truth share (`0.40`) within its 5% rounding.
  2. AT-02 Adding 3 cash counts narrows `p90 − p10` on Sharma Kirana.
  3. AT-03 With bank file removed, `evidence` marks E1 and E2 unused with reasons, and the range is wider than with the bank file.
  4. AT-04 With `C=0` scenario, `n_none ≤ n_likely` always.
  5. AT-05 Doubling the order amount never increases `n`.
  6. AT-06 Missed window mode triggers when `today > order_by`.
  7. AT-07 No response contains a banned UI word (§0 rule 7) in en/hi/mr strings (grep test on i18n files).
  8. AT-08 Switching language changes every visible string on Screens 3–5.
  9. AT-09 Reveal truth overlay appears only for samples.
  10. AT-10 `/proof` shows the `synthetic: true` caveat and renders from `results.json`.

---

## 8.9 Assumptions register (every tunable number; disclose in "How we work")
| ID | Parameter | Default | Where used | Basis |
|---|---|---|---|---|
| A1 | UPI-share prior | Beta(2,2) | §6.3 | Weakly informative on purpose |
| A2 | E1 softness τ | 0.03 | E1 | Tolerance for non-sales deposits |
| A3 | E2 inventory noise σ_inv | 0.15 | E2 | Purchases lead sales, stock changes |
| A4 | Digital-share options (q, σ_q) | 0.9/0.08, 0.7/0.15, 0.5/0.25 | E2 | Owner's rough answer |
| A5 | Category margin ranges | §7.1 | E2 | **Unsourced; replace if a source is found** |
| A6 | Cash-count report noise | 0.10 | E3 | Day-to-day variation + reporting error |
| A7 | Owner guess noise | 0.15 | E4 | Owners misjudge their mix |
| A8 | Daily cash noise | 0.10 | §6.4 | Cash varies day to day |
| A9 | Level/day variance split | 0.6 / 0.8 | §6.1 | Splits σ into shared and daily parts |
| A10 | Tier 2 σ bounds | 0.15–0.45 | §6.1 | Guards against extreme residuals |
| A11 | Uplift σ (data / owner chip / tier 3) | 0.20 / 0.30 / 0.35 | §6.1 | More doubt when assumed |
| A12 | Verdict thresholds | 80 / 50 | §6.5 | Product decision; editable |
| A13 | Plan probability threshold | 0.80 | §6.6 | Same as safe threshold |
| A14 | Monte Carlo draws N | 2000 | §6.4 | Stability vs latency |
| A15 | UPI settlement lag | 0 days | §6.4 | File dates treated as bank-credit dates |
| A16 | Constant UPI share over horizon | yes | §6.4 | Festival may raise UPI share; not modelled |

---

## 10. Build order (with done-criteria)
| M | Work | Priority | Done when |
|---|---|---|---|
| M0 | Fix env/port; pin Python 3.11/3.12; make Prophet optional; add `DECISIONS.md`; delete `lib/forecast.ts` usage plan | P0 | `/app` loads without the bank-data error; `/api/health` OK |
| M1 | `engine/` modules + config + tests (§6, §9.1 unit) | P0 | Unit tests green, both test vectors match |
| M2 | Generator v2, 3 samples, benchmark harness, `results.json` | P0 | AT-01..AT-03 pass; `results.json` generated |
| M3 | Session store + API (§8) | P0 | API tests green; Postman-style happy path per sample |
| M4 | Frontend: store, i18n scaffolding (en first), `FilesStep` + `ShopSetup` upgrades | P0 | Can reach Screen 3 from a sample and from files |
| M5 | Screen 3 (Sight Bar, Evidence stack, question card, confidence) | P0 | AT-02 visible in UI |
| M6 | Screens 4–5 (clock, verdict, break-even, chart, plan, levers) | P0 | AT-04..AT-06 visible in UI |
| M7 | `/proof` page, Reveal truth, landing edits | P0/P1 | AT-09, AT-10 |
| M8 | Hindi + Marathi strings, review, WhatsApp share, disagreement notice, VOI selector | P1 | AT-07, AT-08 |
| M9 | Hardening: error states, mobile pass, README, demo dry-run | P1 | §4.10 all states reachable |
| M10 | Prophet Tier 1 wiring | P2 | Tier 1 outputs intervals; fallback works |
If time is short, cut in this order: M10, VOI selector, WhatsApp share, Marathi, disagreement notice. Do not cut M2 or M7 (they prove the claim).

---

## 11. Prompts for the coding agent

### 11.1 Master prompt (paste once at the start of every agent session)
```
You are a senior full-stack engineer working in the repo `vyapar-runway/` (frontend: Vite + React 19 + TypeScript + Tailwind 4 + Recharts; backend: FastAPI + Python 3.11/3.12).
The single source of truth is `VyaparRunway_Build_Spec.md`. Read Sections 0, 5, 6, 8 and 9 fully before writing code. 
Hard rules: (1) no LLM in any numeric/decision path; (2) every number shown to users has a provenance tag (Measured/Estimated/Assumed); (3) never show a single-number cash forecast; (4) missing evidence widens ranges, it never silently defaults; (5) banned UI words are listed in Spec §0.7; (6) all math lives in `backend/engine/`, not in the frontend; (7) files are processed in memory and never written to disk.
Working style: write the unit tests for the spec's test vectors first, then the implementation. Use numpy vectorisation and a session-seeded RNG (common random numbers). If the spec is silent, choose the simplest option and add a one-line entry to `DECISIONS.md` (date, question, choice); do not stop to ask questions.
After each milestone: run the tests, list the files you created or changed, list any deviation from the spec and why, and stop.
```

### 11.2 M1 prompt — engine
```
Implement Milestone M1 from the spec: create `backend/engine/{schemas,config,parsing_upi,parsing_bank,forecast_upi,evidence,simulate,verdict,planner,clock,voi}.py` and `backend/config/{festivals,categories,engine_params}.json` exactly as specified in §6 and §7.1, with every constant in `engine_params.json` (§8.9). 
Requirements: Pydantic v2 schemas from §8.1; parsing rules from §6.0 (alias tables, date formats, cleaning, gap warnings, bank classification regexes, counterparty extraction); forecast Tiers 2 and 3 from §6.1 (Tier 1 behind ENABLE_PROPHET, default off, wrapping the existing forecast_model.py); posterior on a 400-point grid with likelihoods E1–E4 from §6.3, percentile outputs, per-evidence bars, non-owner posterior, disagreement rule; Monte Carlo simulation (N=2000, common random numbers) from §6.4; verdict, scenarios and break-even bisection from §6.5; planner and levers from §6.6; restock clock from §6.2; VOI selector from §6.7.
Tests in `backend/tests/`: the sanity vector in §6.3 (s=0.7140), the break-even vector in §6.5 (c*=11,666.67 within ₹10), monotonicity of P_safe in order amount, reproducibility under the same seed, parsing edge cases (mixed date formats, ₹ and commas, negative rows, gaps).
Do not build any API or UI yet.
```

### 11.3 M2 prompt — data and benchmark
```
Implement Milestone M2: rewrite `backend/generate_data.py` as `backend/benchmark/generate_data_v2.py` per §7.3 (hidden ground truth, bank file synthesis, deterministic seeds, NO import from `engine/`). Generate the three sample bundles in `backend/samples/` per §7.2 (upi.csv, bank.csv, meta.json, truth.json). Implement `backend/benchmark/run_benchmark.py` per §7.4 with the three methods (M0, M1, M2), the four metrics groups, stratification and fixed seeds, and write `backend/benchmark/results.json` including `"synthetic": true`. Add a README section stating that the data is synthetic and that the generator's assumptions drive results. Report the actual numbers you obtained; do not tune parameters to make M2 look better. Stop after AT-01, AT-02 and AT-03 pass.
```

### 11.4 M3 prompt — API
```
Implement Milestone M3: `backend/engine/sessions.py` (in-memory dict, TTL 2 h, seed from session id) and the endpoints in Spec §8.2 with response shapes in §8.3–8.5, in `backend/main.py` using routers. Enforce §9 limits (5 MB, 50,000 rows, 14 cash counts, 30 obligations). Errors must use `{error:{code,message,field?}}` with the user-readable wording style in Spec §4.10. Restrict CORS to the frontend origin from an env var. The `sample/{name}` endpoint loads a bundle from `backend/samples/`. Truth data is returned only when `reveal=true` and the session was created from a sample. Keep `/api/predict`, `/api/forecast`, `/api/advisor` untouched but mark them deprecated in the OpenAPI description. Write `tests/test_api.py` covering the happy path for each sample, the 422 mapping flow, and expired sessions.
```

### 11.5 M4–M7 prompts — frontend
```
Implement the frontend for Milestones M4–M7 following Spec §4 and §5.2 exactly.
- M4: create `state/store.tsx` (context + reducer for session_id, parsed summaries, ShopConfig, cash counts, blindspot, verdict, plan, language), `i18n/index.ts` with en.json from the §4.8 table, `lib/api.ts` (base URL from VITE_API_URL, fallback http://localhost:8000; typed calls for every §8.2 endpoint), `lib/format.ts` (en-IN, ₹). Build `FilesStep` (with `ColumnMapModal`, `PurchaseTagger`, `ManualEvidenceForm`) and `ShopSetup` (with `ObligationsEditor`) per §4.2–4.3. Remove `lib/forecast.ts` usage; all numbers come from the API.
- M5: build Screen 3 per §4.4: `SightBar` (three zones, 250 ms boundary transition, respect prefers-reduced-motion), `EvidenceStack`, `ConfidencePill`, `QuestionCard`, skipped-source notes, disagreement notice, "Add today's count".
- M6: build Screens 4–5 per §4.5 and §4.7: `RestockClock`, `OrderForm`, `VerdictCard` (n-in-100 wording, three scenarios), `BreakEvenGauge`, `MoneyChart` (p10–p90 band, median line, safe-amount line, markers, daily UPI bars, hatched cash bars with whiskers, optional truth overlay), `PlanTimeline`, `LeverTable`, `ShareButton` (wa.me link).
- M7: `pages/Proof.tsx` fed only by GET /api/benchmark with the caveat block; "Reveal truth" toggle for samples; landing edits per §4.9 (remove the word "runway", language toggle, CTA "Try a sample shop").
Rules: use existing design tokens from DESIGN.md; every number gets a `<Tag>`; sentence case, no all-caps labels; icon+text for states; 44 px targets; `aria-live="polite"` on the verdict. Delete `RestockSimulator`, `AdvisorPanel` and `CalibrationSlider` from the flow.
```

### 11.6 M8–M9 prompt — polish
```
Implement hi.json and mr.json from the §4.8 table (use the strings exactly; add Noto Sans Devanagari loading), the language toggle persisted in localStorage `vr_lang`, the disagreement notice, the VOI-driven `next_question`, and the WhatsApp text templates per language. Then run the acceptance tests AT-07 and AT-08 and fix failures. Finally implement every state in Spec §4.10 and verify each is reachable, test at 360 px width, and write README run instructions (§9) and a "How we work" panel listing evidence sources and the assumptions register (§8.9).
```

---

## 12. Demo and pitch

### 12.1 Three-minute demo script
1. (20 s) The problem in Ramesh's words; the twist: "His UPI shows only part of his sales."
2. (40 s) Load *Sharma Kirana*. Screen 3: "We can see about 35–50% of your sales." Show the Sight Bar and the evidence stack. Say what is used and what is skipped.
3. (30 s) Add one cash count; the bar tightens. "The tool asks the one question that helps most."
4. (40 s) Screen 4: enter a festival order. "In 100 possible futures you stay safe in {n}." Show the no-cash scenario, then break-even: "You need ₹X of cash sales a day. Is that realistic?"
5. (30 s) Screen 5: staged plan and levers; open WhatsApp share.
6. (20 s) Toggle **Reveal truth**: true cash sits inside the band.
7. (20 s) `/proof`: three methods on 300 synthetic shops; show the coverage line. State plainly that this is synthetic.

### 12.2 Judge Q&A (answers grounded in this spec)
- *How do you know cash?* We do not. We infer a range from four independent traces and show the evidence; the benchmark reports how often the range contains the truth.
- *What if the shop pays wholesalers in cash?* Stock evidence is skipped, the range widens, and the tool asks for a cash count instead.
- *Is this real data?* Validation data is synthetic with hidden ground truth; parsers are built for real statement formats and need a pilot. We say so on the Proof page.
- *Why not just Prophet?* Small shops rarely have two years of history; Prophet cannot learn a festival it has never seen, and it only sees UPI. It is optional here.
- *Where is the LLM?* Nowhere in the numbers. Every figure is reproducible.
- *Why probabilities?* Because the honest answer to "can I afford it?" depends on cash we cannot see.

---

## 13. What this spec does not claim
Inventory changes and credit sales (udhaar) are not modelled; margins are assumed ranges; purchases lead sales and are only smoothed by a 28+ day window; cash deposits may include non-sales money; UPI share is held constant over the horizon; the festival lift comes from history or the owner's answer; weekday and day noise are independent apart from the shared level term; the benchmark is only as realistic as its generator. Show the relevant limits in the "How we work" panel.