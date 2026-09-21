# TANDEM project page

Anonymous project page for *TANDEM: Task and Motion Planning with As-Needed Demonstrations for Efficient Vision-Language-Action Model Fine-tuning*.

Static site: `index.html` + `static/`. There is no build step and no dependencies. Figures in `static/images/` are cropped from the paper PDF (Figs. 1–3).

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

Every push to `main` deploys via `.github/workflows/deploy.yml` (Settings → Pages → Source: *GitHub Actions*). The paper PDF is gitignored and never published.

## Before de-anonymizing

- Fill in authors and affiliations in the hero (`index.html`).
- Enable the Paper / Code buttons (remove the `soon` class and add `href`s).
- Link DATAFARM in the Method section.
- Update the BibTeX entry.
- Remove `<meta name="robots" content="noindex, nofollow">` if you want the page indexed.
- Remove `tandem.pdf` from the repo if it should not be public yet.
