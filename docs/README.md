# docs/

- `images/` — the screenshots the README embeds.
- `design/` — design records. Superseded by the live docs at the root; kept
  because they carry the measurements and the reasoning that produced the
  current shape.

## Retaking the screenshots

They are element-clipped rather than full-page: a 9.000px strip is unreadable in
a README. Serve both a workspace and the sandbox, then drive a headless browser
over the pages, clipping each shot to a real element plus a margin of the page
gradient at 2× and quantising the PNG afterwards.

```sh
make local          # :9990 — a workspace with real lessons and projects
make sandbox-local  # :9991 — fixtures, for the dashboard and the library
```

The shots are: a lesson, a diagram in isolation, the dashboard, the library, a
project brief, the settings panel open, the component gallery, and the dashboard
at 420px wide. Playwright is not a dependency of this repo — install it globally
when you need it, so a fork studying philosophy does not pull 300MB of Chromium.
