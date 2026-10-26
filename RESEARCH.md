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
