# Design

## Visual concept

sim-desk is a telephone exchange desk, not a marketing page. The left rail is the handset itself: a brass lamp that is lit only while the phone's heartbeat is fresh, with battery and the last check-in under it. The main column is a paper message tape, each row a time, a direction, a number, and the text, the way a teleprinter left a record on the desk. Compose is a fixed bar along the bottom, the slot where the operator feeds the next line. A stranger sees a switchboard and a tape before reading the name.

## Type

- Display: Fraunces. It has the thick-thin contrast of a printed directory and the lamp housing on an old exchange. Used for the desk title and the handset name.
- Body: Public Sans. A plain working face for labels, the pairing code, and form fields.
- Tape: IBM Plex Mono. The message log is a record, so times and numbers stay aligned.

Loaded with `next/font/google`. Fallback stack: Georgia, "Times New Roman", serif for Fraunces; "Segoe UI", sans-serif for Public Sans; Consolas, ui-monospace, monospace for IBM Plex Mono.

## Color

Tokens live as CSS variables.

- Dominant ink `#1C1915`. The desk frame, primary text, and the tape rules. Used on headings, the rail border, and button labels on paper.
- Accent lamp `#E39B2B`. The handset lamp, the focused compose field, and the "online" state. Nowhere else, so the lamp stays meaningful.
- Neutral paper `#F4EFE6`. Page background and the tape surface. A darker paper `#E7E0D4` separates the rail and the compose bar from the tape.

Status ink on the tape, still inside the same palette: queued uses ink at 60% opacity, sent uses ink, failed uses `#8C3A2F`, received uses lamp amber as a left rule only.

## Layout

The desk is asymmetric. The handset rail is a fixed 280px column on the left at 1024 and 1440. The tape takes the remaining width and scrolls. The compose bar is pinned to the bottom of the tape column, not of the viewport's center.

At 768 the rail shrinks to a 72px lamp strip and the handset name moves into the tape header. At 320 the rail collapses entirely to a single status row above the tape: lamp, name, battery. The tape stacks time above the number. The compose bar stays full width with the number field above the message field. Nothing scrolls sideways.

Touch targets are at least 44px. The send control is the full width of the compose bar on 320.

## Motion

- On load, GSAP fades the tape rows in from 8px below, staggered 40ms, so the record appears as if it were just torn off the machine. Disabled when `prefers-reduced-motion: reduce`.
- When a heartbeat flips the lamp from dark to lit, GSAP animates the lamp background from ink to `#E39B2B` over 240ms. Reduced motion snaps the color.
- Framer Motion enters and exits a new tape row (opacity and 8px y) when a send or an inbox row arrives. Layout animation is not used. Reduced motion renders the row in place with no transition.
- No scroll-linked scene. The page is a desk, not a story.

## Responsive

Widths: 320, 768, 1024, 1440.

- No horizontal scroll at those widths.
- Touch targets at least 44px.
- Text wraps. The tape body wraps inside the row.
- 320 and 1440 are verified in the browser. 768 and 1024 are checked the same way.

## Logo

The mark is a handset earpiece reduced to a rounded rectangle and a short cord, ink on paper with a lamp-amber dot for the mouthpiece. Built in the media phase. It uses `#1C1915` and `#E39B2B` only.
