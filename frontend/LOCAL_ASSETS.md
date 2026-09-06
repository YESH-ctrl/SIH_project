# QSwarm image assets

The QSwarm generated images are bundled in `client/public/assets/` so they are included in the Vite build and work when the project is deployed or served locally.

| File | Usage |
|---|---|
| `qswarm-hero-network.webp` | Hero background |
| `qswarm-logistics-hero.webp` | Heavy-vehicle constraint panel |
| `qswarm-optimization-landscape.webp` | QPSO optimization panel |
| `qswarm-aerial-intersection.webp` | Raipur timeline |
| `qswarm-mark.webp` | Header brand mark |

Components reference these files through `/assets/...` URLs. No `/manus-storage/...` runtime dependency is required.
