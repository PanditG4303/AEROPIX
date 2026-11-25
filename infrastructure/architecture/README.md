# AEROPIX diagrams

All diagrams are original SVG authored for this project. Each has a matching 2× PNG for the
report and presentation. No screenshot, stock image or AI-generated picture is used as a
diagram.

| Diagram | SVG (editable) | PNG (2×) |
|---|---|---|
| AWS deployment architecture | [`aeropix-architecture.svg`](aeropix-architecture.svg) | [`aeropix-architecture.png`](aeropix-architecture.png) |
| Entity-relationship model | [`er-diagram.svg`](er-diagram.svg) | [`er-diagram.png`](er-diagram.png) |
| Image upload sequence | [`upload-sequence.svg`](upload-sequence.svg) | [`upload-sequence.png`](upload-sequence.png) |
| Presigned delivery sequence | [`presigned-delivery.svg`](presigned-delivery.svg) | [`presigned-delivery.png`](presigned-delivery.png) |

## Re-rendering the PNGs

The renderer uses the locally installed Google Chrome through `playwright-core`; no remote
service or account is involved.

```bash
cd frontend
node scripts/render-diagrams.mjs
```

The script reads the four SVGs and overwrites the PNGs in this folder at `deviceScaleFactor: 2`.
If Chrome is installed somewhere else, update the `chrome` path at the top of
`frontend/scripts/render-diagrams.mjs`.

## Design notes

* Canvas: warm off-white `#F7F4EE` with a subtle dot grid.
* Text: navy `#15172A`; secondary text `#626579`.
* Accents: indigo `#5B4BD6`, electric blue `#38BDF8`, S3 amber `#A5622F`, success green `#2F7A59`.
* Typeface fallback: Segoe UI / Inter, with Consolas for object keys.
* The sequence diagrams describe the **implemented** call order, including validation, thumbnail
  generation, SQLite commit, presigning and error paths.

The architecture and ER diagrams are also described in
[`docs/architecture.md`](../../docs/architecture.md) and
[`docs/database-design.md`](../../docs/database-design.md).
