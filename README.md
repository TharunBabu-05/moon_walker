# SELENE · From dust to orbit

A browser based Moon expedition. Walk and jump across cratered highlands, inspect detailed rock models, drive a lunar buggy, and invite friends to the same landing site. Pull back to the NASA mapped Moon and continue out to the Earth–Moon system.

**Play online:** [SELENE · From dust to orbit](https://tharunbabu-05.github.io/moon_walker/)

## Run

The hosted version needs no installation. All textures, models, and browser libraries are included in this repository. To run locally:

```powershell
npm install
npm start
```

Open [http://localhost:8000](http://localhost:8000). Solo exploration works without external services once the files are available. Multiplayer needs internet access. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Explore with friends

1. Everyone opens [the hosted game](https://tharunbabu-05.github.io/moon_walker/) and selects **Step onto the Moon**.
2. One player selects **CREW**, enters a callsign, and selects **Start an expedition**.
3. Select **Copy invite**, then send that link to friends. You can also share the 8 character expedition code.
4. Friends open the invite, step onto the Moon, enter their callsign, and select **Join crew**. With a code, open **CREW**, enter the code, and select **Join crew**.
5. Players appear with callsigns, map markers, and their own buggies. Up to eight explorers can share an expedition.

The host must keep the game tab open and active. Everyone should refresh to the same version before joining. Leaving or closing the host tab ends that expedition; remaining players can keep exploring solo. There is no permanent account, saved world, automatic public matchmaking, or host migration.

GitHub Pages serves the game files. PeerJS Cloud provides connection signaling, and WebRTC carries state directly between browsers. No server keys or account setup are required. There is no dedicated TURN relay configured, so some restrictive school, office, carrier, or VPN networks can prevent connections. The lobby reports failures; try another network or host if joining fails. See [PeerJS documentation](https://peerjs.com/client/getting-started) and [network FAQ](https://peerjs.com/client/faq).

## Views and controls

- **1** or the First person button: look out through the visor. Click to capture the mouse, or drag to look.
- **2** or the Astronaut button: follow the explorer. Drag to orbit, scroll to move the camera from a few metres to 80 metres away.
- **3** or the Orbit button: rotate around the entire lunar globe. Scroll all the way out to see the Moon and Earth together.
- **W A S D** or arrow keys: walk relative to the view. **Shift**: lope. **Space**: jump under lunar gravity.
- **E** or **Enter buggy**: enter your buggy within about four metres. **Locate my buggy** turns your view toward it; the gold map marker shows its position.
- While driving: **W / S** accelerate and reverse; **A / D** steer; **Space** brakes; **Shift** raises the speed limit. Stop on the ground, then press **E** to climb out. The 1.65-second animation releases the wheel, turns the body and places the boots beside the buggy; it waits for clear footing. You can drive in first person or follow view.
- On a touch screen, drag to look or orbit, spread/pinch to zoom, and use the on-screen walk pad.
- **M**, **ATLAS**, or the local relief map opens the lunar atlas. The **Surface map** opens at your current position. Click clear terrain to pin a destination, or enter signed east/north coordinates. Drag to pan, scroll to zoom, and select **Centre on me** to find yourself. A suggested route and distance appear on the bottom-left mini-map; reaching the pin completes the objective. **Moon atlas** contains the real mission locations, country filters and **Locate on the 3D Moon**.
- In the atlas, choose **Visit research station** to move to the concept outpost. Walk up the ramp; the two proximity airlocks open automatically. The white square on the local map marks the station.
- **V** changes views. **H** hides the interface. **Esc** releases mouse look. The **?** button opens the field guide.

## Sound and interface layout

Open **SOUND** in the top-right tools for master volume, suit ambience, mute and a test sound. Audio starts after **Step onto the Moon** and pauses when the tab loses focus. Footsteps follow boot contact; sampling foley follows the reach, grasp, scoop, pour and release stages. Jumps, landings, rock impacts, suit hits, buggy entry, rover motor/rolling and interface clicks have feedback. Nearby shared rock impacts fade with distance and pan relative to your view. Outdoor effects are a cinematic suit feed, not sound travelling through lunar vacuum.

The 17 locally bundled [Kenney CC0 recordings](assets/audio/README.md) total about 125 KB. Buffers are decoded once; the motor, airflow and aiming tone reuse a persistent Web Audio graph. One-shot voices are capped and cleaned up after playback. Volume and mute are saved on your device.

All side menus share a scrollable right-side stack. Select any panel heading to collapse or expand it, or **PANELS − / +** to hide or restore the whole stack. **TOOLS − / +** collapses the top-right controls in place. On narrower screens the expanded tools form a dropdown. The camera selector stays centered independently of the title and tools.

The mini-map starts at bottom left. Drag its title bar to move it; **− / +** changes its size and **RESET** returns it to the default location and size. Keyboard users can focus the title bar and use arrow keys to move it or **Home** to reset. Click the map image to open the atlas. Panel states, map position and size are saved locally and clamped to fit after resizing the window. The title and bottom-center captions retain their positions.

## Suit costumes

Use the **Costume** button or press **C** to switch between two crew-visible suits. Costume 1 is the original SELENE EVA suit. Costume 2 adds a padded white suit, reflective dark helmet, gold pressure seals, a multi-gauge chest console, reinforced glove cuffs and layered boots. Your selection is saved on this device.

## Collect lunar samples

Stop on foot within one metre of a loose, hand-sized stone. A gold ring shows the nearest specimen you can reach. The astronaut turns toward it automatically; rotating the follow camera to see your face does not change which stone you can collect. Picking, bagging and retrieving preserve your orbit angle and zoom. The loose specimens use the same photographed rock materials as the larger formations; fixed boulders and decorative gravel cannot be collected.

| Key | Action |
| --- | --- |
| **F** | Crouch, pick up a small stone in the right glove, and stand |
| **B** | Put the held stone in the sample bag |
| **R** | Take the last stored stone back out |
| **Hold T** | Temporarily aim through the visor and charge a throw. Release to throw; your previous view, orbit angle and zoom return after the animation. Esc cancels. |
| **G** | Draw the pocket shovel, scoop regolith, pour it into the soil bag and stow the tool |

The **Field sampling** panel also provides touch buttons. Each bag holds 12 samples. Keep both boots planted while sampling; bag a held stone before boarding the buggy. The first-person camera follows the crouch and looks toward the work. Walking uses planted stance feet, terrain-aware knee bends, toe clearance and opposite-arm swing driven by foot placement.

Thrown stones use 1.62 m/s² gravity, spin, substepped collision, terrain-normal bounce, friction and ballistic impact dust. Holding **T** pauses the explorer, raises the stone, charges its release speed, and draws the same ballistic path used for the actual throw. Stones collide with terrain, conservative boulder/structure/buggy bounds and other explorers; suit impacts trigger a short recoil animation. This is an approximate game simulation, with spherical stone bounds and procedural character poses, not motion capture, full rigid-body dynamics or a suit-injury simulation. The compact pocket shovel and hand pickup are gameplay adaptations, not a reconstruction of an Apollo sampling procedure.

The host owns reservations, inventory, assignments, throws and hit detection. Guests send action requests; nearby stones and action progress are synchronized at 10 Hz and moving stones are interpolated between updates. Two people cannot claim the same stone. Joining or leaving an expedition starts a fresh sample session; bags are not saved across reloads. A departing explorer's held/stored stones return to the ground. Uncollected distant specimens are recycled to bound the active field to 240 objects. Everyone must refresh to **expedition protocol 9** and open a new room after updating.

## Field assignments

The mission card gives three sequential survey tasks. Accept an assignment, follow the gold marker and mini-map route, then bag the requested stones and soil inside its survey circle. Return to the sample depot outside the research station to deliver each completed assignment. The card, gold world marker and mini-map always show the active collection area or return point.

## Surface detail

The global lunar body uses NASA Scientific Visualization Studio's LRO Wide Angle Camera natural-colour map and Lunar Orbiter Laser Altimeter elevation product. The walkable highlands are a generated landscape with nested half-metre terrain detail, irregular impact craters, desaturated ground materials, close gravel, and tread marks. Chunk meshes, rock fields, route planning and relief-map sampling are prepared in workers, so crossing their update boundaries does not rebuild tens of thousands of vertices in the render frame.

Close boulders use three Poly Haven Moon Rock models with 2K colour, normal, and roughness materials. The rocks have real mesh volume, cast shadows, block walking and driving, and support top contact through triangle ray queries. Walker collisions refine the broad circular bounds against the model under the boots, allowing you to jump onto reachable rock tops and stand there. Vehicles retain conservative bounds; this is not a full rigid body solver. Rock placement uses fixed world cells, so the crew sees the same formations and they do not move when terrain chunks refresh. Distant rocks use cheaper geometry.

The buggy uses a bicycle steering model, low traction, terrain based wheel suspension, and 1.62 m/s² ballistic gravity when airborne. It is a simplified vehicle simulation. Each explorer controls their own vehicle; it is not a shared passenger vehicle. Footprints and dust are local visual effects and are not synchronized.

Orbital camera distances and Earth–Moon separation use mean body radii and mean separation. At true scale, the Moon appears very small beside Earth.

NASA map source and attribution: [CGI Moon Kit, NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4720/). Three.js source and license: [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt).

All model, material, and library credits are in [assets/ATTRIBUTION.md](assets/ATTRIBUTION.md). To regenerate the bundled assets from their sources, run `npm run prepare:assets` for NASA maps or `npm run prepare:expedition` for rocks, ground materials, the model loader, and PeerJS. These commands need internet access.

## Navigation and historical flags

Surface pins use local metres in the generated 22 km field area; they do not claim a geographic position in a photographed landing site. Routes use bounded A* search over slope and known obstacle clearance. The route is guidance, not autopilot, and far-away rocks may only be known when their world cells load. The path updates when you stray away, and arrival is reported within three metres. Waypoints are private to your view.

Eight 3D flag exhibits are placed on a nearby historical trail: the six Apollo deployments and the Chang'e 5 and 6 lander-mounted displays. Each global atlas entry links to its historical source and can set a route to the corresponding local exhibit. These are labelled reconstructions, with support bars and static fabric folds; their local positions are not presented as the actual landing coordinates or their appearance as their present condition. The Apollo 11 entry notes the original flag falling during liftoff.

## Multiplayer movement and contact

Buggy rock contact uses 0.40 m of chassis clearance and a 0.22 m tyre-step limit. Low stones between the wheel tracks can pass underneath; small bumps beneath a tyre feed the wheel and chassis suspension height. Tilt reduces clearance on the lower side. Larger rocks retain solid collision. These are tuned game approximations rather than a full tyre-deformation simulation.

Each wheel is attached by parallel upper/lower wishbones, a steering knuckle and a telescoping damper inside a seven-turn coil spring. Fixed-length arms constrain hub movement to an arc in the tilted chassis frame. Spring/damper integration smooths rebound, with mechanical travel stops and bounded airborne droop; tyre contact drives compression. This is a constrained visual suspension driven by the existing vehicle physics, not a full multibody force simulation.

The continuous terrain height is enforced as a solid lower bound during movement and after contact corrections. If an explorer or buggy is displaced below it, the game restores surface contact and clears downward velocity, including while menus pause movement. Raised rock tops remain separate from this floor so side contact does not teleport a falling explorer to a boulder's summit. Regression checks cover crater routes, world edges and deliberately displaced bodies; this does not claim exhaustive testing of every position in the procedural landscape.

Remote motion uses sequenced, timestamped snapshots at up to 20 Hz and a 120 ms interpolation buffer. Position interpolation uses velocity; rover steering, chassis pose, wheel travel and the seated driver use the same playback time. Brief gaps extrapolate for at most 100 ms, then freeze instead of continuing indefinitely. Steering-wheel grip targets drive two-bone arm IK.

Player capsules in the horizontal plane and oriented buggy chassis bounds resolve overlap, normal impulses and friction at 120 Hz locally. The host reconciles contacts between owners and sends acknowledged delta corrections. This is simplified planar contact physics, not a full rigid-body vehicle simulator: there is no chassis rollover, deformation or angular impact response. Latency, packet loss and a backgrounded host can still affect the experience. GitHub Pages distributes files; it does not relay movement packets.

## Lunar atlas and research outpost

The atlas contains 14 curated features and landing sites, with signed coordinates, mission attribution, source links and globe markers. It distinguishes IAU-approved names from documented landing locations and approximate historical positions. Country labels identify programs, not ownership. The generated walking area is not a reconstruction of any marked landing site.

SELENE Research Outpost is a fictional surface habitat informed by NASA lunar infrastructure concepts. It includes a panelled pressure vessel, windows, raised floor, access ramp, proximity doors, equipment racks, sample bench, lighting, photovoltaic wings, radiator and communications dish. It is not an existing lunar station or a simulation of pressure or life support. Each peer sees the same structure; doors react to nearby explorers.

Implementation decisions and primary references: [Research notes](RESEARCH.md).

## Crater stadium: race with your crew

The stadium is a permanent structure on the exploration Moon, with a **1.2 km radius**, 95 roofed grandstand sections, floodlight towers and roughly 19,000 seated spacesuit spectators. Its entrance is **300 m east of the habitat centre**. It uses the same scene, terrain mesh, lighting and ground physics as exploration. There is no portal, separate arena scene, or remote boarding button.

1. Open **STADIUM** in the top-right tools. Choose **Host / join CREW**; one friend hosts and copies the invite link, and the others join that expedition.
2. Choose **Route to parked vehicles**. Walk or use the exploration buggy to reach the stadium paddock. Get out of the exploration buggy, stow any held sample, and approach one of the eight parked racers.
3. Press **E** within 6 m to board. Each driver presses **Y** or **Ready** (R remains retrieve stone on foot). The lobby shows everyone in the crew, their vehicle and readiness.
4. The host clicks **Host: start race**. All drivers share a five-second countdown and two laps through 16 ordered checkpoints. **Solo practice** is available when playing alone.
5. **W/S** drives/reverses, **A/D** steers, **Space** brakes, and **E** gets out after stopping. **1/2/3** retains the existing camera modes. You step out beside the vehicle where it stopped.

The four exposed-frame designs are Rustwalker, six-wheel Iron Mule, roofed Dune Jackal and Red Prospector. They use muted copper, green, gray and red finishes, oversized wheels, articulated wishbones, visible coil springs/dampers, roll cages, batteries and cargo. Driver hands follow the steering grips.

The route crosses raw regolith, crater slopes, depressions and large rock arches. Sparse survey stakes and checkpoint signs mark the route; there is no asphalt ribbon. Amber ground rings warn of falling boulders. Falling rocks and racer impacts damage vehicles; destruction triggers a **four-second recovery at the destruction position**, followed by two seconds of protection. Unoccupied vehicles and arch pillars remain solid. The previous separate-scene circuit, weapons, boost pads and AI opponents have been removed.

The host runs the shared 60 Hz race simulation independently of rendering and sends snapshots at up to 20 Hz. Guests predict their controls and reconcile on packet arrival; remote vehicles use buffered interpolation. The host should keep the game open and active. There is no host migration, dedicated server, ranked matchmaking or persistent race history. This is game vehicle physics with lunar gravity and terrain contact, not a full engineering tyre simulation.

Stadium geometry is instanced or batched; detailed crowd sections and car geometry appear nearby, with simpler distant representations. Browser performance still depends on the GPU and chosen detail setting.

Race checks: `npm run test:racing`, `npm run test:racing-browser`, and `npm run test:racing-multiplayer`. Browser race fixtures start test explorers beside the paddock to exercise boarding without a long approach; production has no teleport. The multiplayer check uses real browser RTCDataChannels. Set `SELENE_LOCAL_SIGNAL=1` to exchange test signalling locally if the public PeerJS service is unavailable. The signalling and spawn fixtures are never loaded by the production game.

## Checks

```powershell
npm run check
npm test
npm run test:browser
npm run test:fieldwork
npm run test:locomotion
npm run test:ground-recovery
npm run test:suspension
npm run test:hud-audio
npm run test:expedition
npm run test:upgrade
npm run test:navigation
```

Browser checks require Google Chrome and save screenshots in `artifacts/`. The expedition check requires internet access and verifies two real WebRTC peers, movement and buggy state replication, invitation joining, buffered rover playback, seated grip contact, shared physical contact, and departure cleanup. The upgrade check walks through both station airlocks, checks wall collision and atlas controls, and captures desktop/mobile screenshots. GitHub Pages deploys pushes to `main` automatically.

## Deployment history

The failure notification at 09:01 IST on 26 October 2026 was the first attempt of run `40264479504`. Its `configure-pages` step returned `404 Not Found` before Pages was enabled. Attempt 2 succeeded at 09:03 IST, and subsequent deployments succeeded. Check the latest [Pages workflow runs](https://github.com/TharunBabu-05/moon_walker/actions/workflows/pages.yml) rather than an old email when determining current hosting status.

### Stadium lights and rock contact

The stadium has 24 inward-facing floodlight banks. Four nearby spotlights illuminate the ground, cars and suits at a time, keeping the shader light count fixed. Eighteen large, tilted bedrock shelves surround the regolith course; their height is shared by rendering and ground contact.

Race buggies and the exploration rover now check actual rock footprints, with separate tyre paths and underbody clearance. Low stones between the tyres pass underneath; smaller tyre bumps lift the suspension; taller stones block the wheels or chassis. Swept contact prevents fast cars from skipping through narrow obstacles. Static rock collision uses height fields sampled from the photographed meshes during loading, rather than full model raycasts every frame. Arch supports also use model-derived contact. These remain a game approximation, not a full rigid-body tyre/deformable-soil simulation.

Rock locations are deterministic across viewers and independent of streamed graphics. The host checks stones around each racer even when that driver is far away; client prediction uses the same geometry. All players must refresh after this update and create a new crew invite (protocol 12).
