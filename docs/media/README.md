# README media

[← Project guide](../../README.md)

This directory holds the self-contained images and animated GIFs displayed in the project README. The playable game does not load these files, and the Pages workflow excludes `docs/` from its deployment package.

## Animated title

[selene-header.svg](selene-header.svg) is an original, self-contained vector banner. It uses CSS animation for stars, an orbiting spacecraft, a moving rover and a radio pulse. It has no scripts, remote fonts or external image dependencies. Its title and scene remain visible when animation is disabled, and it respects `prefers-reduced-motion`. Edit the SVG directly; the raster media conversion script does not overwrite it.

## Sources

All four videos supplied in `video_proof/` are converted at their full duration to silent, looping GIFs:

| Source recording | GIF | Approximate duration |
| --- | --- | --- |
| `video_proof/moon_walker_intro.mp4` | [Expedition tour](expedition-tour.gif) | 12.25 s |
| `video_proof/moon_walker.mp4` | [Moonwalk](moonwalk.gif) | 8.87 s |
| `video_proof/moon_walker_vid-2.mp4` | [Buggy drive and exit](buggy-drive.gif) | 17.47 s |
| `video_proof/moon_walker_vid-3.mp4` | [Footprint trail](footprints.gif) | 7.23 s |

The four user screenshots from the same folder supply the explorer portrait, crew photo and two buggy images. Supporting images come from the project's development captures in `artifacts/`. Some captures predate the latest UI, suits or stadium changes; they are labelled as development/gameplay media rather than new feature guarantees. Model detail views are identified in their captions.

[sources.json](sources.json) records every source filename, output filename, crop rectangle, video duration, frame rate and GIF width. The original source recordings and screenshots are unchanged. The source folders may be local-only; the README references only the generated files in this directory, so it does not depend on those folders being published.

## Conversion

Install the project's dependencies with `npm install`. Obtain FFmpeg separately and set `FFMPEG_PATH` to the executable, or put it at `.cache/ffmpeg.exe` on Windows (`.cache/ffmpeg` elsewhere). The conversion script does not download or install tools.

```powershell
$env:FFMPEG_PATH = 'C:\path\to\ffmpeg.exe'
node scripts/prepare-readme-media.mjs
```

On macOS/Linux:

```sh
FFMPEG_PATH=/path/to/ffmpeg node scripts/prepare-readme-media.mjs
```

Run from the repository root. You need the original source media listed in the manifest to regenerate it. Use `images` or `gifs` as the final argument to rebuild only that group.

Still images are resized to at most 1,200 px wide, without enlargement, and encoded as WebP at quality 83. Browser chrome and desktop elements are cropped out of the supplied recordings where present. GIFs use 560 px width and 12 fps; FFmpeg generates an intermediate palette-based animation, and Sharp optimizes it to 64 colours with inter-frame compression. Output frame timing rounds to GIF's 10 ms time units. GIFs preserve the source sequence but cannot carry audio.

Documentation media is separate from runtime assets. The original game-model, texture and audio attributions remain in [assets/ATTRIBUTION.md](../../assets/ATTRIBUTION.md). Do not interpret screenshots as a separate licence grant for the code or third-party assets.
