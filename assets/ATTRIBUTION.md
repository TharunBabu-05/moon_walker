# Asset sources

The orbital Moon colour and height maps are derived from the [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), using LRO WAC and LOLA products.

Detailed rock geometry and materials are from Poly Haven under [CC0](https://polyhaven.com/license):

- [Moon Rock 01](https://polyhaven.com/a/moon_rock_01)
- [Moon Rock 03](https://polyhaven.com/a/moon_rock_03)
- [Moon Rock 05](https://polyhaven.com/a/moon_rock_05)

These photographed rock samples were captured at Spaceport Rostock's lab, according to Poly Haven. They are used here as visual reference assets, resized and desaturated for the generated landscape. The landing site is not a surveyed reconstruction of an actual lunar site.

The ground material uses [Gravelly Sand](https://polyhaven.com/a/gravelly_sand) by Dario Barresi, CC0, with its colour desaturated and its material maps compressed for browser use.

The models retain their original geometry and UVs; image files are converted to WebP. Only the highest available model detail is rendered for each close rock; distant rocks use cheaper generated geometry. Boulders use conservative horizontal collision bounds, with top contact sampled from their rendered triangles.

Three.js and its GLTFLoader / BufferGeometryUtils helpers: [MIT license](../vendor/THREE-LICENSE.txt).

PeerJS 1.5.5: [MIT license](../vendor/PEERJS-LICENSE.txt).

Sound effects: selected recordings from Kenney's [Impact Sounds](https://kenney.nl/assets/impact-sounds) and [Interface Sounds](https://kenney.nl/assets/interface-sounds), CC0. See [audio credits and original licences](audio/README.md). Suit airflow, rover motor and aiming tone are generated for SELENE.
