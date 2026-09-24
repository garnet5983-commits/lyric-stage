# Lyric Stage: research notes and design decisions

The earlier editor treated a lyric line as one centered block and varied only its entrance. A larger preset count did not fix that structural problem. This update changes the composition around a key phrase.

## Observed practice

- Josh Soliz's *Shinin'* case study ties typography, edits, and footage to the track's energy, with moments that intentionally let the footage breathe. https://joshsoliz.com/project-shinin
- The creators of Alfie Templeman's lyric videos describe fluid warps and gradients for atmospheric sections, and quick cuts, glitches, and scale for energetic sections. Their work uses texture and timing to retain a coherent identity. https://www.behance.net/gallery/227382057/Alfie-Templeman-Lyric-Videos
- School of Motion recommends selecting a reading hierarchy before animating: one dominant phrase, ample negative space, and movement that follows the shape and weight of the type. https://schoolofmotion.com/blog/tiny-typography-decisions-motion-graphics
- *Visual Lyrics* (2026) analyzes 20 tutorials and 50 lyric videos, grouping word treatments by visual meaning, color, emotion, energy, motion, pitch, sustained vocals, and vibrato. Its goals include audio and language analysis, varied styling, and legibility validation. https://augmented-design-capability-studio.github.io/assets/publications/2026-03-visual-lyrics/visual-lyrics.pdf
- TextAlive describes synchronized editing of lyrics as essential and highlights the limits of fixed animation presets. https://junkato.jp/publications/chi2015-kato-textalive.pdf

## Changes made in this version

- Five scene compositions treat one word or short phrase as the focal point. Mark it as `【word】`. Without a marker, an approximate segment is selected; manual marking produces better results.
- Other words become supporting typography rather than sharing equal size, motion, and color.
- Theme-based automatic choices now interleave restrained sections with visual peaks instead of randomizing every line.
- Optional local analysis of strong audio attacks can drive emphasis. It is not vocal alignment, beat-perfect music analysis, source separation, or word-level timestamps.
- Preview remains available for each line, and the 31 existing animations remain available for manual adjustment.

## Still needed for high-end results

A polished full-song result requires accurate phrase and word timestamps, a deliberate storyboard, typography choices suited to the particular song, and verification on the intended iPhone. Automatic style selection here is an editable starting point, not a substitute for directing those decisions. The video export also remains dependent on the phone browser's recording support.

## フォントと図形による構図（2026-09-24）

- School of Motion の Design Kickstart は形、余白、階層、グリッド、色の設計を重視する。図形を動く背景として足すだけでは歌詞が主役にならないため、セルごとに一文字を置くグリッド、語を型抜きするステンシル、字形を読める前景に保つ8種の図形演出を実装。https://schoolofmotion.com/courses/design-kickstart
- 同校の kinetic typography 教材は音への同期、レイヤー、弧を描く動き、形状マットなどを扱う。曲のピーク値による線や図形の反応と、形状で文字の透過領域を作る手法を採用。https://schoolofmotion.com/blog/kinetic-typography-after-effects-part-1 ; https://schoolofmotion.com/blog/kinetic-typography-after-effects-part-2
- Google Fonts の CSS API は `text=` で必要な文字だけを要求できる。30種類の日本語フォントを選択時に読み込み、CacheStorageに保存。ブラウザのフォント読み込みに失敗するときは既存のOSフォントを使う。https://developers.google.com/fonts/docs/css2
- 実装の注意：歌詞の字形をWebフォント要求時に Google Fonts に送る。インターネットに接続していないと初回のフォント取得はできない。曲や映像は送らない。
