# Contributing to SELENE

Thank you for helping improve the expedition. Contributions can include bug fixes, performance improvements, accessible controls, documentation, verified lunar references and original or appropriately licensed art and audio.

## Before you begin

Check [existing issues](https://github.com/TharunBabu-05/moon_walker/issues) and open pull requests for related work. For a substantial feature or change to physics, multiplayer or the world layout, open an issue describing the intended player experience before implementation.

For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of publishing exploit details in an issue.

## Set up the project

Fork the repository, clone your fork and create a focused branch:

```sh
git clone https://github.com/YOUR-USERNAME/moon_walker.git
cd moon_walker
git switch -c improve/describe-your-change
npm install
npm start
```

Open `http://localhost:8000`. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. See the [development guide](docs/DEVELOPMENT.md) for the source map, simulation details and browser checks.

## Keep changes focused

- Follow the existing JavaScript module and CSS conventions. Prefer existing dependencies and bundled assets; discuss large new libraries first.
- Preserve the shared Moon experience across exploration, vehicles, sampling and stadium racing.
- Keep rendering and collision geometry consistent. Physics changes must account for terrain, small-rock clearance and multiplayer prediction where applicable.
- Avoid expensive work in the animation loop. Reuse objects, bound caches and use existing workers for heavy preparation.
- Check the HUD at both a typical laptop size and a narrow viewport. Keep keyboard controls and on-screen labels consistent.
- Document new controls and player-visible behavior. Distinguish fictional content from documented lunar history and cite primary sources for historical additions.

## Verify your change

Run the basic checks:

```sh
npm run check
npm test
```

Then run the relevant [browser checks](docs/DEVELOPMENT.md#run-and-verify). For changes to shared state, verify two browsers in the same expedition. For rendering or UI changes, include screenshots or a short recording and state the browser, viewport and detail setting. Report performance measurements with their test conditions.

Documentation-only changes need link, image and rendering checks rather than the entire gameplay suite. Do not commit dependency folders, local editor settings, credentials, temporary logs or unrelated generated captures. Add only the files needed for the contribution.

## Open a pull request

Describe the problem, the behavior after the change and how you verified it. Mention related issues and any limitations a reviewer should know. Keep unrelated formatting or refactoring out of the patch. Include evidence for visual changes and reproduction steps for bug fixes.

Useful bug reports include the game URL or commit, browser and operating system, detail setting, steps to reproduce, expected and observed behavior, and whether the issue occurs solo or with a crew. Remove private invite links, personal information and unrelated console output from attachments.

## Asset provenance and licensing

Submit work you created or have permission to contribute. Record third-party model, texture, font and audio sources and their licences in [assets/ATTRIBUTION.md](assets/ATTRIBUTION.md). Preserve required notices. Game screenshots do not grant permission to redistribute assets from another game.

By submitting code for inclusion in SELENE, you agree to make it available under the project's [GNU GPL v3.0 licence](LICENSE). Third-party assets retain their own terms and must be suitable for distribution with the project. Contributions are reviewed by the maintainer; this guide does not guarantee a merge or a response deadline.
