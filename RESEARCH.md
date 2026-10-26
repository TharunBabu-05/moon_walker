# Movement, lunar landmarks, and habitat references

## Network playback

The old observer path eased an astronaut toward the latest packet while setting the rover directly to its latest position. At a low send rate, this made the chassis jump and the driver lag independently. Static GitHub Pages hosting is separate from the PeerJS/WebRTC data path.

The implementation follows the interpolation-buffer and velocity-interpolation principles in Glenn Fiedler's [Snapshot Interpolation](https://gafferongames.com/post/snapshot_interpolation/). It keeps ordered snapshots, estimates a sender-clock offset, renders 120 ms behind delivery, interpolates positions with bounded Hermite curves, and interpolates heading along the shortest angle. A maximum 100 ms extrapolation limits drift during packet loss. Teleports and riding changes reset the buffer. Vehicles and their occupants share a sampled state and a chassis transform.

The host's contact reconciliation is informed by the distinction between simulation state and rendered state in [State Synchronization](https://gafferongames.com/post/state_synchronization/). The game still trusts each client's movement. It has no dedicated authoritative server, anti-cheat, host migration, or configured TURN relay. Keeping the host game tab active avoids browser background throttling. Long network stalls cannot be hidden by interpolation.

## Contact model

[Box2D collision documentation](https://box2d.org/documentation/group__collision.html) and [simulation documentation](https://box2d.org/documentation/md_simulation.html) describe separating normals, contact impulses, friction, restitution, and reducing low-speed bounce. These inform the custom solver; Box2D is not a runtime dependency.

The game uses oriented chassis rectangles and astronaut circles in the horizontal plane, with vertical overlap checks. A minimum separating axis resolves penetration. Normal impulses use low restitution (zero for low-speed contact), with capped tangential friction. Approximate suit-plus-astronaut and loaded-rover masses are gameplay assumptions, not measured vehicle specifications. Local prediction treats remote bodies as obstacles; the host resolves dynamic pairs and sends serial-numbered delta corrections acknowledged in subsequent state packets. Terrain flight still uses 1.62 m/s² gravity and a 1/120 s fixed step.

This model prevents ordinary overlapping pedestrians and buggies, including rotated chassis. It does not simulate a full six-degree-of-freedom chassis, wheel contact manifolds, torque from off-centre impacts, damage, or rollovers. Tests cover angled contacts, height clearance, momentum exchange, parked-vehicle impact, delta replay, jitter, packet loss and reordered packets.

## Names and coordinates

- [IAU Gazetteer of Planetary Nomenclature: lunar Statio features](https://planetarynames.wr.usgs.gov/SearchResults?Feature+Type=59_Statio&Target=16_Moon): Statio Shiv Shakti, Statio Tranquillitatis, Guang Han Gong, Statio Tianhe, Statio Tianchuan and Statio Tianjiang.
- [NASA: Apollo landing-site coordinates](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html): the six Apollo Lunar Module locations, measured from LRO imagery.
- [NASA LRO: Japan's SLIM lander](https://www.nasa.gov/missions/lro/nasas-lro-spots-japans-moon-lander/): 13.3160° S, 25.2510° E near Shioli crater.
- [NASA: lunar spacecraft catalogue](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html): approximate historical Luna 9 position. This marker is explicitly approximate.
- [IAU Gazetteer: Mare Imbrium](https://planetarynames.wr.usgs.gov/Feature/3678): geographic feature centre; not a spacecraft landing location.
- [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/): the bundled LRO/LOLA imagery used on the globe and atlas.

The atlas is a curated selection, not a complete lunar gazetteer. Longitude is east-positive; the atlas spans −180° to +180°. Each entry carries its source URL. Mission country is an attribution, not a territorial claim. Named globe markers do not identify the generated walkable terrain.

## Concept outpost

NASA's [Artemis infrastructure overview](https://ntrs.nasa.gov/api/citations/20220015432/downloads/ARC%20Overview%20DJK%2010062022%20%26%20Artemis.pdf) and [Artemis science/infrastructure discussion](https://science.nasa.gov/wp-content/uploads/2023/05/NASAHeliophysics__Artemis__DecadalSurveySupplemental.pdf) informed the separation of habitation, mobility, power and communications systems.

The game's station is an original fictional design, not a replica of an operational lunar station or a validated engineering design. It has a roughly 6.4 m diameter pressure-vessel form, raised deck, two proximity doors, ramp, laboratory equipment, solar arrays, radiator and communications dish. It is explorable on foot. Pressure, airlock cycling, power balance, radiation shielding and life support are not simulated.

## Terrain continuity and navigation revision

The crater generator previously added the ejecta blanket only for radius ratio u > 1. That introduced an actual height discontinuity (about 1.7 m for the nearby large crater), creating the staircase silhouette when triangulated. The blanket now fades in smoothly across the rim, and all crater contributions taper to zero before their outer cutoff. The spatial bins include the maximum irregular radius. The habitat pad now uses an elliptical, gradual transition instead of a square maximum-distance boundary.

The local surface map is separate from the historical geographic atlas because the walking mesh is generated. Navigation uses the same metre coordinates as movement, matching X and Z scale in both maps. Bounded A* search favours lower slopes and checks sampled obstacle clearance; it reports failure rather than presenting an impassable direct line as a solved route. Dismounts transmit a bounded transition state so other explorers can render the same climb-out.

## Historical flag deployment references

- [NASA Apollo program](https://www.nasa.gov/the-apollo-program/): six US flags deployed by Apollo crews.
- [NASA: Apollo 11 surface activities](https://www.nasa.gov/history/50-years-ago-one-small-step-one-giant-leap/): telescoping crossbar and retained folds in the fabric.
- [NASA Apollo Lunar Surface Journal](https://www.nasa.gov/wp-content/uploads/static/history/alsj/ApolloFlags-Condition.html): Aldrin reported the Apollo 11 flag falling during liftoff; current condition is not assumed from a deployment reconstruction.
- [Chinese consulate, citing CNSA](https://brisbane.china-consulate.gov.cn/eng/zlgxwx/202012/t20201208_140511.htm): Chang'e 5's lander-ascender combination displayed a flag before ascent.
- [CNSA Chang'e 6 mission timeline](https://www.cnsa.gov.cn/english/n6465652/n6465653/c10573102/content.html): flag display following far-side sampling.
- [Wuhan government](https://english.wuhan.gov.cn/H_1/NWP/202406/t20240606_2412383.shtml): Chang'e 6's 200 by 300 mm basalt-based flag and its distinction from earlier painted insignia.

The game represents only these sourced deployments as local flag exhibits. It does not infer that every lunar mission planted a pole-mounted flag. The mission-level globe pins are historical site locations, not surveyed flag-pole coordinates.

## Sampling, gait and loose-stone dynamics

- [NASA: Spacewalking tools](https://www.nasa.gov/suits-and-rovers/spacewalking-tools/) documents scoops for soil collection, tongs for individual rocks and extension handles for reach. The requested compact pocket shovel and gloved crouch pickup are explicitly game adaptations. The animation draws the tool, reaches down, scoops, raises the blade, opens the bag, pours and returns the tool.
- [NASA: Lunar atmosphere](https://science.nasa.gov/moon/lunar-atmosphere/) describes the extremely sparse, non-collisional lunar exosphere. The stone simulation omits aerodynamic drag; impact dust follows ballistic arcs instead of drifting like terrestrial smoke.
- [LASP: Apollo 16 dust analysis](https://lasp.colorado.edu/2012/05/07/10143/) describes the ballistic paths of rover dust in Apollo footage. The game uses the existing constant 1.62 m/s² gravity for samples and particles.

Gait remains procedural. Stance feet stay in world space while swing feet use a smooth lift and return. Arm swing opposes the corresponding leg, the torso responds to distance travelled, and pelvis height adapts before knee IK is solved. Sampling explicitly plants the feet, lowers the pelvis and pivots the torso about the hips; two-bone arm IK targets the specimen or tool path. Small finger meshes close around the grip.

The expedition host runs sample physics at 120 Hz. Flight substeps limit travel to less than half a sample radius, including checks against upright player volumes. A host-owned reservation prevents duplicate pickup; inventory is changed at grasp, deposit or release, not at the keypress. Projectiles bounce with restitution 0.24 against terrain and lose tangential speed on contact; these coefficients and the 6.5 m/s throw speed are game tuning, not measured lunar-soil material constants. Surface slopes determine bounce normals. Conservative body bounds simplify rock/rover/structure contact. Hits cause visible recoil without a damage model. Samples are ephemeral expedition state, with no persistent backend.
