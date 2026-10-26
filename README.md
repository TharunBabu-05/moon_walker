# SELENE · From dust to orbit

A locally run three-dimensional Moon exploration. Walk, lope, and jump across cratered lunar highlands; watch a jointed astronaut place their feet and kick up slowly falling dust; then pull back to the NASA mapped Moon and continue out to the Earth–Moon system.

**Play online:** [SELENE · From dust to orbit](https://tharunbabu-05.github.io/moon_walker/)

## Run

Install the project dependencies once, prepare the NASA textures, then start the local server:

```powershell
npm install
npm run prepare:assets
npm start
```

Open [http://localhost:8000](http://localhost:8000). Three.js is bundled locally; network access is needed only for the one time NASA map download.

## Views and controls

- **1** or the First person button: look out through the visor. Click to capture the mouse, or drag to look.
- **2** or the Astronaut button: follow the explorer. Drag to orbit, scroll to move the camera from a few metres to 80 metres away.
- **3** or the Orbit button: rotate around the entire lunar globe. Scroll all the way out to see the Moon and Earth together.
- **W A S D** or arrow keys: walk relative to the view. **Shift**: lope. **Space**: jump under lunar gravity.
- On a touch screen, drag to look or orbit, spread/pinch to zoom, and use the on-screen walk pad.
- **V** changes views. **H** hides the interface. **Esc** releases mouse look. The **?** button opens the field guide.

## About the surface

The global lunar body uses NASA Scientific Visualization Studio's LRO Wide Angle Camera natural-colour map and Lunar Orbiter Laser Altimeter elevation product. The data is resampled for a real-time browser display; the small, walkable highlands are a generated landing site, with nested half-metre terrain detail, irregular impact craters, regolith texture, gravel, fractured rocks, and foot-level tread marks. Orbital camera distances and Earth–Moon separation use mean body radii and mean separation. At true scale, the Moon appears very small beside Earth.

NASA map source and attribution: [CGI Moon Kit, NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4720/). Three.js source and license: [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt).

## Checks

```powershell
npm run check
npm test
npm run test:browser
```

The browser check requires Google Chrome and captures the exploration views in `artifacts/`.
