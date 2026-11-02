# MARS-X — From NASA Data to Mission Decisions
NASA Space Apps Challenge 2026 · *Interplanetary Survival Guide: Martian Map*

Lean core build: real WebGL 3D Mars (React Three Fiber), clickable sites, 3-route planner with a weighted,
explainable scoring model (`src/lib/mars.ts`), hazard breakdown and data-provenance labels.

    npm install && npm run dev      # also: npm run build, npm test

## Honesty notes
- The app is in **DEMO mode**: elevation/slope come from a procedural model, not NASA data. No NASA API is called yet.
- Site coordinates are approximate public facts; verify against the USGS/IAU gazetteer before citing.
- Drop a real colour map at `public/textures/mars.jpg` to replace the procedural surface.
- Next data targets: MOLA/HRSC DEM (USGS Astrogeology), HiRISE/CTX, THEMIS, CRISM via NASA PDS — add as samplers behind `terrainKm`.
- Not yet built: AI assistant, astronaut mode, mission simulation/report, base analysis, layer toggles, search, comparison.
