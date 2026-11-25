# Design

## Visual concept

SIM Desk uses the shape of a messaging inbox. A conversation list sits on the left, the open thread sits on the right, and the composer is pinned to the bottom of the thread. Outbound texts sit on the right and inbound texts sit on the left. The mark and the wordmark stay SIM Desk. The sending line is shown above the list and in the thread header. The phone reports its number when the SIM stores one, and reports the line name otherwise. The operator can save the sender number on the handset panel.

## Type

- Wordmark: Fraunces, for the SIM Desk name beside the logo.
- UI: Public Sans, for the conversation list, bubbles, and composer.

Loaded with `next/font/google`. Fallback stack: Georgia, serif for Fraunces; "Segoe UI", sans-serif for Public Sans.

## Color

- Ink `#202124` for text.
- Muted `#5f6368` for previews and timestamps.
- Hairline `#E8EAED` between the list and the thread.
- Selected conversation `#E8F0FE`.
- Outbound bubble `#1A73E8` with white text.
- Inbound bubble `#F1F3F4`.
- Online presence `#188038`.
- Failed status `#D93025`.

## Layout

The inbox column is 360px from 801px upward. Below that, the list and the thread take turns: the list is the screen until a conversation or a new message is open, and Back returns to the list. Touch targets stay at least 44px. The page does not scroll sideways.

## Motion

A new thread opens in place. `prefers-reduced-motion: reduce` keeps scrolling instant. There is no scroll-linked scene.

## Responsive

Widths: 320, 768, 1024, 1440. No horizontal scroll. Touch targets at least 44px. Text wraps inside bubbles.

## Logo

The mark stays the SIM Desk handset: a rounded earpiece, a short cord, and an amber mouthpiece. It is shown beside the wordmark. It uses `#1C1915` and `#E39B2B`.
