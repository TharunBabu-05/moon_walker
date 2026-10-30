# Developing SELENE

[← Visual project guide](../README.md)

SELENE is a static browser application. The local Node server serves its files; it is not a multiplayer game server. Runtime models, textures and browser libraries are bundled in the repository.

## Project map

| Location | Responsibility |
| --- | --- |
| `src/main.js` | Application loop, input, cameras and feature integration |
| `src/terrain.js`, `src/landscape.js`, `src/surface-worker.js` | Generated terrain, streaming and worker preparation |
| `src/astronaut.js`, `src/motion.js`, `src/physics.js` | Suits, procedural animation and explorer movement |
| `src/rover.js`, `src/world.js`, `src/vehicle-contact.js` | Exploration buggy, suspension and rock contact |
| `src/rocks.js`, `src/rock-layout.js`, `src/rock-heightfield.js` | Rock rendering, deterministic placement and cached contact surfaces |
| `src/sampling.js`, `src/sample-world.js`, `src/ballistics.js` | Collection, inventory, thrown stones and hit detection |
| `src/missions.js` | Sequential survey assignments and delivery |
| `src/atlas.js`, `src/navigation.js`, `src/surface-map.js` | Lunar atlas, waypoints and route guidance |
| `src/flags.js`, `src/lunar-sites.js`, `src/station.js` | Historical exhibits, lunar references and fictional outpost |
| `src/multiplayer.js` | Crew connections and expedition synchronization |
| `src/racing.js`, `src/race-physics.js`, `src/race-models.js` | Race UI, authoritative simulation, prediction and vehicles |
| `src/stadium-layout.js`, `src/track-boundary.js`, `src/track-fence-models.js` | Stadium landscape and shared visible/collidable course boundaries |
| `src/audio.js`, `src/hud-layout.js` | Audio mixing and adjustable HUD |
| `assets/`, `vendor/` | Bundled game resources and third-party libraries |
| `checks/` | Simulation regressions and browser checks |
| `docs/media/` | Compressed README images, GIFs and their source manifest |
| `video_proof/`, `artifacts/` | Local source recordings and generated development captures |

## Run and verify

```sh
npm install
npm start
```

Open `http://localhost:8000`. In a second terminal:

```sh
npm run check
npm test
```

`npm test` includes the race, vehicle–rock and track-boundary suites through `posttest`. Run browser checks against the local server as appropriate to the change:

| Command | Coverage |
| --- | --- |
| `npm run test:browser` | General exploration and camera checks |
| `npm run test:fieldwork` | Collection, soil, throws and assignments |
| `npm run test:locomotion` | Camera preservation and movement regressions |
| `npm run test:ground-recovery` | Terrain penetration and recovery |
| `npm run test:suspension` | Connected wheel assemblies and suspension travel |
| `npm run test:hud-audio` | Responsive panels, mini-map and audio |
| `npm run test:expedition` | Two-peer movement, buggies and shared contact |
| `npm run test:upgrade` | Outpost airlocks, collision and atlas |
| `npm run test:navigation` | Pins, routes and historical exhibits |
| `npm run test:racing` | Race rules, progress and prediction |
| `npm run test:racing-browser` | Boarding, readiness, countdown, driving, fences and exit |
| `npm run test:racing-multiplayer` | Two-browser race with real RTCDataChannels |

Browser checks use Playwright and generally target an installed Google Chrome. The racing checks also accept `SELENE_BROWSER_CHANNEL=msedge`. They save evidence in the ignored `artifacts/` directory. Race fixtures spawn test explorers near the paddock; production has no stadium teleport or separate race scene.

Multiplayer checks normally need internet access for PeerJS signalling. The race multiplayer check accepts `SELENE_LOCAL_SIGNAL=1` to use a local signalling fixture while still exercising actual RTCDataChannels. Test signalling and spawn fixtures are never loaded by the game.

## Simulation boundaries

### Surface, rocks and vehicles

The generated 22 km field uses a continuous terrain floor. Movement and subsequent contact corrections enforce this floor, including recovery when a body is displaced below it. Raised rock tops are evaluated separately so a side impact does not teleport an explorer onto a boulder.

Walkers use triangle queries for reachable rock-top contact. Vehicles use cached height fields sampled from the photographed rock meshes, separate tyre paths, chassis clearance and swept movement. Small stones can pass beneath the body between tyres, while taller obstructions remain solid. Rock placement is deterministic across views and independent of rendered terrain chunks.

The exploration buggy has 0.40 m nominal underbody clearance and a 0.22 m tyre-step limit. Race vehicles use their own dimensions. Wishbones constrain visible hub travel; springs, dampers and travel stops smooth wheel movement. This is a custom game simulation, not a full multibody solver: tyre deformation, deformable soil, chassis damage deformation and engineering-grade rollover dynamics are not simulated.

The stadium's 3.8 m fences share the same segment definitions across rendering, walkers, exploration vehicles, the race host and guest prediction. Eighteen sloping bedrock shelves share their height with ground contact. Static arch geometry also contributes model-derived contact. Four nearby light sources are selected from 24 visible floodlight banks.

### Samples and animation

Character animation is procedural, including planted feet, terrain-aware knees, steering-grip arm IK, crouching, pickup, bagging and shovel sequences. It is not motion capture or a reconstruction of Apollo sampling procedure.

Thrown samples use lunar gravity, substeps, spin, bounce, friction and impact dust. Stone bounds and some object contacts are conservative approximations. Suit hits cause a recoil pose, not an injury simulation. Footprints and dust are local effects.

The host owns sample reservations, bags, missions, throws and hits. Shared sample state is sent at 10 Hz, with moving stones interpolated. The active loose field is bounded to 240 objects. Leaving a session releases an explorer's collected stones; joining or leaving starts a fresh local sampling session. Inventories are not persisted across reloads.

### Multiplayer

PeerJS Cloud provides signalling and WebRTC carries data between browsers. The host must remain open and active. No dedicated TURN relay is configured, so restrictive networks may block connections. There is no host migration or persistent server-side world.

Exploration motion uses sequenced snapshots at up to 20 Hz and a 120 ms remote interpolation buffer. Brief gaps extrapolate for at most 100 ms before freezing. Local planar body contacts use 120 Hz resolution with host-reconciled corrections.

Racing runs a shared 60 Hz host simulation and sends snapshots at up to 20 Hz. Guests predict their input and reconcile on new snapshots; remote vehicles use buffered interpolation. Latency, packet loss, hardware and background-tab throttling still affect results. All peers must refresh to the same build and create a new invitation after protocol-changing updates.

### Maps, history and audio

Local routes use bounded A* over slope and known obstacles. They are guidance rather than autopilot; distant obstacles may become known as their cells load. Waypoints are private to each viewer. Local metres do not correspond to photographed landing coordinates.

Atlas entries distinguish documented mission sites, IAU-approved names and approximate historical positions. Flag exhibits are reconstructions. SELENE Research Outpost is fictional, and does not simulate pressure or life support. Source references are retained in [research notes](../RESEARCH.md).

Seventeen locally bundled Kenney sounds total roughly 125 KB. Buffers decode once, recurring suit/vehicle sounds reuse a Web Audio graph, and one-shot voices are capped. Outdoor feedback represents a cinematic suit feed. Volume, mute, costume and HUD preferences are stored locally.

## Assets and documentation media

Regenerate the game assets from their sources with `npm run prepare:assets` for NASA maps or `npm run prepare:expedition` for expedition resources. These operations need internet access. See [asset attribution](../assets/ATTRIBUTION.md).

README images and GIFs have a separate [source manifest and conversion guide](media/README.md). They are documentation assets and are not loaded by the game. The original recordings stay unchanged.

## GitHub Pages

[The Pages workflow](../.github/workflows/pages.yml) packages the playable files on pushes to `main` and supports manual dispatch. It copies the entry HTML, styles, `src/`, `assets/` and `vendor/`; README media and raw recordings are excluded from the playable deployment.

Check [workflow runs](https://github.com/TharunBabu-05/moon_walker/actions/workflows/pages.yml) for deployment status. GitHub Pages hosts the static application; it does not provide the multiplayer simulation or relay movement packets.
