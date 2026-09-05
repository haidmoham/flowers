# Motion reference: a bouquet drawn for someone

Reference: `C:/Users/haidm/Desktop/demos/480p_flowers.mov`. Inspected on 2026-09-04 with FFprobe and contact sheets at 0.5-second intervals. The clip is 640 × 412 at 60 fps. Its container duration is 17.146667 seconds. It starts with a completed bouquet, resets near 2 seconds, and then draws again. Do not mistake the initial hold for the reveal.

The user's remembered 13-second drawing arc is the creative constraint. The local `sketch.js` completes its final wash at 14.01 seconds after its own clock starts. The recording and this source are closely related, but their exact revision identity is unverified. Clip observations below have about ±0.5-second precision.

## Observed score

| Clip time | Approximate time after reset | Visible action |
| --- | --- | --- |
| 0–1.5 s | Before reset | Completed bouquet holds. |
| 2–3.5 s | 0–1.5 s | Blank paper becomes a few faint stems rising from below the frame. |
| 4–5.5 s | 2–3.5 s | Stems gather. Small leaf contours arrive. There are no solid petal masses. |
| 6–7.5 s | 4–5.5 s | Several central petal contours develop. Their unfinished ends remain visible. |
| 8–9.5 s | 6–7.5 s | Coral, blue, yellow, and wine pigment enter central flowers in overlapping deposits. |
| 10–11.5 s | 8–9.5 s | Neighbouring flowers gather around the focal coral flower. Perimeter marks remain incomplete. |
| 12–13.5 s | 10–11.5 s | Small flowers and buds extend the silhouette. Their colour is weaker than the central mass. |
| 14–16.5 s | 12–14.5 s | Last perimeter washes arrive. The drawing settles without a final flourish. |

## Source evidence

- `sketch.js` schedules stems at `index * 0.11`, with a 1.35-second path reveal. Leaves begin at 2.18 seconds with 0.56-second contour durations.
- The focal coral flower starts its contour at 3.7 seconds. Neighbours start at 3.92, 4.14, and 4.36 seconds. This is a clustered phrase, not a sequence of isolated flowers.
- Each flower has a 2.3-second contour stage. Its wash follows at `delay + 2.3` and develops over 0.72 seconds. Stamen marks begin at `delay + 2.38`.
- Later contour groups start at 5.9–6.78, 8.1–8.98, and 10.3–10.99 seconds. The final wash therefore ends at 14.01 seconds.
- Contours use a thin 0.72-unit charcoal stroke. Individual petal paths are staggered inside each flower. Washes use an irregular clipping region formed from multiple expanding deposits.

## What carries the intimacy

These are visual judgments from the frames, not measured user responses.

1. **A mark remains a mark.** Contours remain visible through the pigment. Their slight corners and overlaps show the act of drawing. They are not temporary scaffolding for a flawless object.
2. **Colour does not obey the outline.** Pigment pools strongly at throats. Much of each outlined petal stays bare. The wash and the contour disagree in small, specific places.
3. **The page has room.** Thin marks can be watched before colour dominates. The surrounding warm paper is an active part of the composition.
4. **Confidence varies.** The central flower has the strongest ink and colour. Outer flowers have weaker lines, incomplete colour, and less visual weight.
5. **The effort is visible without shaking.** Uneven shapes and tiny registration errors are stable. The scene does not need random temporal jitter to imply a nervous hand.

## Consequence for Astral Flowers

The inspected `astral/garden.js` is an in-progress revision. It already introduces staggered petal paths, hesitant progress, partial material growth, and a cache-readiness gate. Those changes improve continuity. They do not by themselves reproduce the reference's emotional mechanism.

Its `drawPetal` still fades the contour as pigment approaches completion. Its retrace only exists during the outline stage. The final object therefore risks erasing the evidence of hesitation. The reference does the opposite: the drawn evidence survives the colour.

The useful next experiment is to preserve a few permanent contour disagreements and leave substantial paper or ground visible within selected petals. Concentrate density at throats. Reduce material coverage and uniform surface detail before adding more glow. A dark ground can work, but it must support fragile marks rather than turn them into polished luminous edges.

Use one 13–15-second phrase for the main drawing. Allow only a small final mark beyond it. Preserve a clear contour-before-wash relationship at the focal flower. Overlap companion flowers in groups. Do not serialize every petal across the entire bouquet; that would make the gesture laborious rather than tentative.

Judge the result at 0.5, 2, 4, 7, 10, 13, and 17 seconds. At each point, inspect which specific mark is being made. Reject unexplained whole-petal appearances. Also inspect the settled image: it must retain the hand's decisions after the animation stops.

## IDE context

Before the requested adjustment, the running VS Code window title was `sketch.js - flowers - Visual Studio Code`. The official command `code --reuse-window <flowers path> --goto <flowers path>/astral/garden.js:1` returned exit code 0. A subsequent process title check reported `garden.js - flowers - Visual Studio Code`. No OS UI automation was used.
