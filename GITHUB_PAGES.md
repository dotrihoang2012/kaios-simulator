# Deploy KaiOS Settings UI to GitHub Pages

The KaiOS simulator (this repository) expects the Settings app to be loaded inside an `<iframe>` that shares the same origin as the surrounding page. When the project is served from **GitHub Pages** (`https://<user>.github.io/<repo>/`), the origin is automatically consistent, so the Settings UI works without any special flags or `srcdoc` tricks.

## How to deploy

1. **Build the static Settings bundle** (if you haven't already):
   ```bash
   node settings-host/build-web.mjs
   ```
   This generates the `web-settings/` folder containing the full Gaia Settings app with all shims inlined.

2. **Make the `web-settings/` directory part of the site that GitHub Pages serves.**
   - **Option A – `docs/` folder** (the default for GitHub Pages):
     ```bash
     mkdir -p docs
     cp -r web-settings docs/
     cp index.html docs/
     ```
     Commit the `docs/` folder and enable *Source → /docs folder* in the repository settings.
   - **Option B – `gh‑pages` branch**:
     ```bash
     git checkout -b gh-pages
     git push -u origin gh-pages
     ```
     Ensure the branch contains `index.html` and the `web-settings/` folder.

3. **Verify the site**:
   - Open the URL `https://<user>.github.io/<repo>/`.
   - Click on the **Settings** app icon.
   - The Settings UI should appear, and you should be able to navigate with the arrow keys and the **Enter** button.

## Why no `srcdoc` is needed
When the site is served over HTTP, the `<iframe>` created in `stBuildWebview()` loads the Settings app via:
```js
wv.src = ST_URL; // e.g. https://<user>.github.io/<repo>/web-settings/settings/index.html
```
Since both pages share the same origin, the Gaia JavaScript can freely access the DOM, focus elements, and handle keyboard events. This mirrors the behavior of a real KaiOS device.

## Important note for local testing
If you open `index.html` directly from the file system (`file://`), Chrome blocks cross‑origin access and the Settings UI will appear frozen. For quick local testing you can either:
- Start a simple HTTP server (e.g. `npx http-server . -p 8080`) and open `http://localhost:8080/`.
- Or keep the previous `srcdoc` approach, but it is **not** required for the GitHub Pages deployment.

---
*This file is meant as a quick reference for contributors and for the CI deployment pipeline.*