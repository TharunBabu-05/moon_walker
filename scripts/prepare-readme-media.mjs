// Documentation assets only. Original recordings and game assets are never overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = path.join(root, 'docs/media');
const cache = path.join(root, '.cache/readme-media');
const manifest = JSON.parse(await fs.readFile(path.join(dir, 'sources.json'), 'utf8'));
const mode = process.argv[2] || 'all';
if (!['all', 'images', 'gifs'].includes(mode)) throw new Error('Use all, images or gifs.');
const ffmpeg = process.env.FFMPEG_PATH || path.join(root, '.cache', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

function outputPath(name) {
  if (name !== path.basename(name)) throw new Error(`Output must be a filename: ${name}`);
  return path.join(dir, name);
}

await fs.mkdir(dir, { recursive: true });
await fs.mkdir(cache, { recursive: true });
if (mode !== 'gifs') for (const item of manifest.images) {
  let image = sharp(path.join(root, item.source));
  if (item.crop) image = image.extract(item.crop);
  await image.resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 83, effort: 5 }).toFile(outputPath(item.output));
  console.log(item.output);
}

if (mode !== 'images') for (const item of manifest.clips) {
  const crop = item.crop ? `crop=${item.crop.width}:${item.crop.height}:${item.crop.left}:${item.crop.top},` : '';
  const filter = `${crop}fps=${item.fps || 12},scale=${item.width || 640}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`;
  const intermediate = path.join(cache, item.output);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(item.start), '-t', String(item.duration), '-i', path.join(root, item.source), '-an', '-filter_complex', filter, '-loop', '0', intermediate], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg failed for ${item.source}`);
  await sharp(intermediate, { animated: true }).gif({ effort: 8, colours: 64, dither: 0, interFrameMaxError: 4 }).toFile(outputPath(item.output));
  console.log(item.output);
}
