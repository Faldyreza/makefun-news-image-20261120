# makefun-news-image-20261120 — "RED FRIDAY"

Entry for the make.fun bounty **news-image-20261120** ($250): sum up
Friday 20 November 2026's world news in one image.

`main.ts` (Node 22 stdlib only) draws the 1024×1024 front page entirely in
code — embedded 5×7 bitmap letterforms, no fonts, no network, no external
files — and writes `output/entry.png` plus `output/dossier.json`. It is
deterministic: run it twice and both runs write identical bytes.

## The image

A dark trading-board front page:

- **Lead:** "THE AI SELL-OFF GOES GLOBAL" — Nikkei −4.8% (56,594.94),
  Kospi −5.2%, Taiwan Taiex −6%; Anthropic's record $81.3bn IPO fails to
  calm AI-bubble fears; Wall Street falls for a fifth straight day.
- **Riyadh:** missile hits the PIF Tower, the Saudi wealth fund's HQ —
  7–8 floors hit, no injuries.
- **COP31 (Antalya):** the draft deal drops any call to phase out fossil
  fuels.
- **Gaza:** troops cross the Yellow Line — first incursion across the
  ceasefire boundary since the truce.
- **Kenya:** last Ebola patient discharged, 37 days after the first case.
- **Footer ticker:** UK drones for Ukraine, California subpoenas Nvidia,
  Bukele's third term, Trump pardons Pete Rose, Brent crude $92.77.

## Run

```sh
node main.ts   # writes output/entry.png and output/dossier.json
```
