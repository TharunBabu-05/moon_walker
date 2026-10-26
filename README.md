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

The host must keep their tab open. Leaving or closing the host tab ends that expedition; remaining players can keep exploring solo. There is no permanent account, saved world, automatic public matchmaking, or host migration.

GitHub Pages serves the game files. PeerJS Cloud provides connection signaling, and WebRTC carries state directly between browsers. No server keys or account setup are required. There is no dedicated TURN relay configured, so some restrictive school, office, carrier, or VPN networks can prevent connections. The lobby reports failures; try another network or host if joining fails. See [PeerJS documentation](https://peerjs.com/client/getting-started) and [network FAQ](https://peerjs.com/client/faq).

## Views and controls

- **1** or the First person button: look out through the visor. Click to capture the mouse, or drag to look.
- **2** or the Astronaut button: follow the explorer. Drag to orbit, scroll to move the camera from a few metres to 80 metres away.
- **3** or the Orbit button: rotate around the entire lunar globe. Scroll all the way out to see the Moon and Earth together.
- **W A S D** or arrow keys: walk relative to the view. **Shift**: lope. **Space**: jump under lunar gravity.
- **E** or **Enter buggy**: enter your buggy within about four metres. **Locate my buggy** turns your view toward it; the gold map marker shows its position.
- While driving: **W / S** accelerate and reverse; **A / D** steer; **Space** brakes; **Shift** raises the speed limit. Stop, then press **E** to exit. You can drive in first person or follow view.
- On a touch screen, drag to look or orbit, spread/pinch to zoom, and use the on-screen walk pad.
- **V** changes views. **H** hides the interface. **Esc** releases mouse look. The **?** button opens the field guide.

## About the surface

The global lunar body uses NASA Scientific Visualization Studio's LRO Wide Angle Camera natural-colour map and Lunar Orbiter Laser Altimeter elevation product. The walkable highlands are a generated landscape with nested half-metre terrain detail, irregular impact craters, desaturated ground materials, close gravel, and tread marks.

Close boulders use three Poly Haven Moon Rock models with 2K colour, normal, and roughness materials. The rocks have real mesh volume, cast shadows, block walking and driving, and support top contact through triangle ray queries. Horizontal collisions use conservative bounds, rather than a full rigid body solver. Rock placement uses fixed world cells, so the crew sees the same formations and they do not move when terrain chunks refresh. Distant rocks use cheaper geometry.

The buggy uses a bicycle steering model, low traction, terrain based wheel suspension, and 1.62 m/s² ballistic gravity when airborne. It is a simplified vehicle simulation. Each explorer controls their own vehicle; it is not a shared passenger vehicle. Footprints and dust are local visual effects and are not synchronized.

Orbital camera distances and Earth–Moon separation use mean body radii and mean separation. At true scale, the Moon appears very small beside Earth.

NASA map source and attribution: [CGI Moon Kit, NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4720/). Three.js source and license: [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt).

All model, material, and library credits are in [assets/ATTRIBUTION.md](assets/ATTRIBUTION.md). To regenerate the bundled assets from their sources, run `npm run prepare:assets` for NASA maps or `npm run prepare:expedition` for rocks, ground materials, the model loader, and PeerJS. These commands need internet access.

## Checks

```powershell
npm run check
npm test
npm run test:browser
npm run test:expedition
```

Browser checks require Google Chrome and save screenshots in `artifacts/`. The expedition check requires internet access and verifies two real WebRTC peers, movement and buggy state replication, invitation joining, and departure cleanup. GitHub Pages deploys pushes to `main` automatically.
