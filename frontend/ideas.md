# QSwarm Design Direction

## Three Initial Approaches

### Theme Name: Pit Lane Systems
Very Brief Intro: A high-contrast motorsport editorial language for a serious urban optimization engine. It treats routing like race engineering: measured, kinetic, and ruthlessly legible.
Probability: 0.07

### Theme Name: Gridless Night Atlas
Very Brief Intro: A dark cartographic atlas with quiet luminous traces, atmospheric network layers, and a more contemplative research-infrastructure mood.
Probability: 0.03

### Theme Name: Civic Signal Lab
Very Brief Intro: A monochrome civic-technology journal with paper-like surfaces, fluorescent signal marks, and analytical storytelling built for public-sector credibility.
Probability: 0.08

## Chosen Approach: Pit Lane Systems

### Design Movement
Swiss International Typographic Style crossed with contemporary motorsport editorial art direction and the information density of control-room instrumentation.

### Core Principles
1. **Performance before decoration.** Every visual element should clarify speed, routing, congestion, or system state.
2. **Asymmetric editorial rhythm.** Use offset columns, oversized numerals, and full-bleed visual fields rather than centered card grids.
3. **Hard-edged precision.** Hairline rules, clipped corners, measured labels, and compact technical metadata make the product feel engineered.
4. **Motion as evidence.** Animation should show routes redistributing, zones responding, and metrics converging—not add ambient spectacle.

### Color Philosophy
Near-black charcoal is the track surface: calm, confident, and intentionally non-dashboard. Off-white carries the main argument with editorial clarity. A single electric lime, **#C8FF00**, is reserved for active system states, route highlights, and proof points so that optimization reads as a signal, not a wash. Traffic colors stay semantic—green, yellow, orange, red—and appear only inside the simulation. Muted grey is used for context and restraint.

### Layout Paradigm
A vertical race-day narrative: each section is a numbered stage with a left-edge signal rail, irregular content widths, and large visual spans that cross the page. Content alternates between dense technical panels and generous negative space. The live map behaves like a timing screen embedded in the story, not a dashboard shell.

### Signature Elements
- A recurring **lime timing rail** with section numbers and tiny system annotations.
- **Route traces** drawn as thin technical lines with animated dash offsets and small pulse nodes.
- **Telemetry labels** in uppercase mono text, paired with oversized condensed numbers.

### Interaction Philosophy
Interactions should feel like changing a system parameter. Buttons respond with a tight mechanical press, route lines brighten on hover, zones clarify when selected, and simulation states announce themselves through restrained signal changes. Controls are touch-friendly and never hide critical context behind unexplained icons.

### Animation
Use CSS transforms, opacity, and SVG stroke-dashoffset for most motion. Entrance reveals are short and directional, as if panels slide into alignment. Route particles drift on a slow linear path, then accelerate briefly when re-optimization completes. Incident responses should emphasize only the affected zone while unaffected routes continue. All non-essential motion is disabled under `prefers-reduced-motion`, preserving the message with static traces and readable states.

### Typography System
Display: **Space Grotesk** at 600–700 for headings and giant statistics; it is geometric, forceful, and more editorial than a generic UI face. Body: **IBM Plex Sans** at 400–500 for compact, readable explanation. Telemetry: **IBM Plex Mono** at 400–600 for labels, timestamps, statuses, and metric metadata. Hierarchy: display headlines use tight tracking and 0.88–0.95 line-height; technical labels use 0.12em uppercase tracking; body copy stays between 16–20px with generous line-height.

### Brand Essence
**QSwarm turns fleet routing into system engineering for cities that cannot afford selfish shortest paths.** Personality: exacting, kinetic, civic-minded.

### Brand Voice
Headlines are declarative, compact, and slightly confrontational. CTAs sound like operator commands. Microcopy distinguishes demo state from live connectivity without hedging or hype. Example lines: **“DON’T ROUTE VEHICLES INDIVIDUALLY. ROUTE THE CITY AS A SYSTEM.”** and **“INJECT AN INCIDENT. WATCH THE AFFECTED ZONE RECOVER.”**

### Wordmark & Logo
The wordmark is a custom uppercase lockup with a split-tail **Q** suggesting a route fork and a double-chevron **S** implying swarm movement. The symbol is a compact lime route-knot: three parallel paths bending into one shared node, with one offset particle marking the elite solution. Use the symbol alone for favicon and small-screen brand moments; pair it with the wordmark in the nav.

### Signature Brand Color
**QSwarm Lime — #C8FF00.** It is the color of the system making a better decision: active, scarce, and immediately ownable against charcoal.

## File-Level Style Reminders

- `client/src/index.css`: Define the charcoal/off-white/lime system, type families, route-trace motion, hard-edge surfaces, and reduced-motion behavior.
- `client/src/App.tsx`: Keep the experience as a single scroll-driven narrative with semantic section anchors and a persistent lightweight navigation shell.
- `client/src/pages/Home.tsx`: Orchestrate modular sections; avoid a monolithic dashboard or repeated rounded cards.
- `client/src/components/`: Favor focused sections and reusable editorial primitives with explicit state and accessible controls.
- `client/src/lib/`: Keep demo data and mock API abstractions replaceable by a future FastAPI/WebSocket backend.
