# Valley Science — Simulation Coding Prompt (All 3 Modules)
# Use this prompt in Cursor to build each standalone HTML5 simulation.
# Copy the relevant module section and paste it as instructions.

---

## GLOBAL ARCHITECTURE (applies to ALL modules)

### File Format
- **One standalone HTML file per module**: `module{id}_sim.html`
- Everything in one file: HTML + CSS + JavaScript. Zero external dependencies except Google Fonts.
- Must work offline once loaded (no fetch calls, no CDN physics libraries).

### Design System: V7 Unified Hybrid (Duolingo × NASA)
**Workspace (UI chrome, sidebar, overlays):**
- Background: `#F7F9FC` (near-white blue-gray)
- Card background: `#FFFFFF` with `border: 1.5px solid #E2E8F0`, `border-radius: 16px`, `box-shadow: 0 6px 0 #E2E8F0` (chunky 3D Duolingo shadow)
- Primary action button: `background: #58CC02` (Duolingo green), white text, `border-radius: 14px`, `font-weight: 800`
- Secondary/outline button: `border: 2px solid #E2E8F0`, `color: #AFAFAF`
- Font: `'Nunito', system-ui, sans-serif` via Google Fonts (`wght@400;600;700;800;900`)
- Text color: `#4B4B4B` (body), `#3C3C3C` (headings)
- Accent coral: `#FFA07A` | Accent cyan: `#22D3EE`

**Simulation Canvas (dark NASA-style):**
- Canvas background: `#0B0F19` (deep space navy)
- Grid lines: `rgba(56, 189, 248, 0.06)`
- Primary object outline: `#38BDF8` (sky cyan)
- Force vectors: `#F59E0B` (amber) with arrowheads
- Velocity vectors: `#22D3EE` (cyan)
- Text on canvas: `#CBD5E1` (slate-300), monospace
- HUD overlays on canvas: `rgba(15,23,42,0.85)` with `backdrop-filter: blur(8px)`, `border: 1px solid rgba(56,189,248,0.15)`, `border-radius: 12px`

### State Machine (6 screens)
Every module follows this exact screen flow:
```
S-INTRO → S-HYPO → S-SIM → S-OBSERVE → S-QUIZ → S-RESULTS
```

1. **S-INTRO** (Mission Briefing): Full-screen Duolingo card. Title, NGSS badge, narrative scenario text, animated mascot/icon, "Begin Mission →" button.
2. **S-HYPO** (Hypothesis): "Before we start — what do you think will happen?" Free-text textarea (no character minimum). "Lock In Hypothesis →" button.
3. **S-SIM** (Interactive Simulation): Split layout — left: dark canvas (70% width), right: Duolingo sidebar (30% width). Sidebar has: variable sliders, live data readouts, observation textarea, and a **sticky action bar at the bottom** with the primary "Next" button that is ALWAYS visible (prevents softlock). Canvas runs the physics engine at 60fps via requestAnimationFrame.
4. **S-OBSERVE** (Observation Write-up): "What did you observe?" Large textarea for student reflection. "Continue →" button.
5. **S-QUIZ** (3-question quiz): One question at a time. Mix of multiple-choice and free-response. Each question in a Duolingo card. Immediate feedback (correct = green flash, wrong = coral flash + explanation).
6. **S-RESULTS** (Score & Summary): Animated SVG score ring (0-100%), star rating, hypothesis recall, "Exit Module" button.

### Sidebar Architecture (CRITICAL — prevents softlock)
```
#sidebar
├── #sidebar-scroll  (flex:1, overflow-y:auto)  ← scrollable content
│   ├── slider controls
│   ├── live data HUD
│   └── observation textarea
└── #sidebar-action  (flex-shrink:0, sticky bottom) ← ALWAYS visible
    ├── primary action button ("Initialize" / "Record" / "Finish")
    └── Ask Valerie button (secondary)
```

### Ask Valerie Button
- Styled as secondary outline button in the sticky action bar
- On click: opens a **popup modal** (NOT a countdown timer) with message "Valerie is Sleeping 😴 — She'll be back when the full platform launches!"
- Modal has a "Got it" dismiss button and auto-closes after 4 seconds
- Modal uses `position: absolute` inside `#s-sim`, NOT `position: fixed` on body (avoids z-index stacking bugs)

### Physics Engine Pattern
All modules use the same deterministic integration loop:
```javascript
const DT = 1/60;
function physicsTick() {
    // 1. Read slider values
    // 2. Compute derived quantities (net force, acceleration, etc.)
    // 3. Euler integration: v += a * DT; pos += v * DT;
    // 4. Clamp values to canvas bounds
    // 5. Update HUD readouts
}
function renderFrame() {
    // Clear canvas
    // Draw grid, objects, vectors, labels
    // Request next frame
    physicsTick();
    requestAnimationFrame(renderFrame);
}
```

### Responsive Canvas
```javascript
window.addEventListener('resize', () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
});
```

### roundRect Polyfill (required for older browsers)
```javascript
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r) {
        r = Math.min(r, w/2, h/2);
        this.beginPath();
        this.moveTo(x+r,y);
        this.arcTo(x+w,y,x+w,y+h,r);
        this.arcTo(x+w,y+h,x,y+h,r);
        this.arcTo(x,y+h,x,y,r);
        this.arcTo(x,y,x+w,y,r);
        this.closePath();
        return this;
    };
}
```

### Version Tag
Fixed bottom-right corner: `position:fixed; bottom:12px; right:16px; z-index:9999; font-size:10px; font-family:monospace; color:rgba(56,189,248,0.55); background:rgba(11,15,25,0.7);`

### Animations
- Screen transitions: `fadeUp` (opacity 0→1, translateY 18px→0, 0.5s ease)
- Buttons: `pop` on hover (scale 0.85→1.06→1.0)
- Canvas elements: smooth interpolation, not teleporting
- Score ring on results: animated stroke-dashoffset over 1.5s

---

## MODULE 3001 — BALANCED FORCES (Tug-of-War)

### NGSS Standard
MS-PS2-1 | Newton's First Law — Balanced forces, net force, equilibrium

### Narrative
**Title:** THE HOVERING TUG-BOT
**Scenario:** A 50 kg inspection robot is tethered between two magnetic winches on a frictionless orbital rail. Both winches are pulling — yet the robot glides at a rock-steady 2 m/s without speeding up or slowing down. Ground control says the forces are "balanced." But if forces are pulling on it from both sides, how can it keep moving at all?
**Mission:** Adjust the left and right force sliders until the robot's acceleration reads exactly 0 m/s² — then explain why a net force of zero does NOT mean the robot must stop.

### Target Misconception
Students confuse "balanced forces" with "no forces at all." They believe an object must be stationary for forces to be balanced — missing that constant-velocity motion also satisfies ΣF = 0.

### Physics Engine Specifics
```
Variables:
  F_left: slider 0–100 N (step 1)
  F_right: slider 0–100 N (step 1)
  mass: fixed 50 kg (displayed, not adjustable)
  friction: 0 (frictionless rail)

Computation per tick:
  F_net = F_right - F_left          // positive = rightward
  a = F_net / mass                  // m/s²
  v += a * DT                       // Euler integration
  pos += v * DT                     // position update
  pos = clamp(pos, leftWall, rightWall)  // bounce or stop at walls

Canvas rendering:
  - Horizontal rail (gray line, full width)
  - Robot: rounded rectangle at pos, outlined in #38BDF8
  - Left force arrow: amber (#F59E0B), length proportional to F_left, pointing left
  - Right force arrow: amber, length proportional to F_right, pointing right
  - Net force arrow: below robot, cyan (#22D3EE), pointing in direction of F_net
  - If F_net ≈ 0: show "EQUILIBRIUM ✓" badge on canvas in green
  - Velocity readout: top-left HUD on canvas
  - Acceleration readout: top-right HUD on canvas
```

### Sidebar Controls
- **Left Force slider**: 0–100 N, label shows current value
- **Right Force slider**: 0–100 N, label shows current value
- **Live Data HUD**: Net Force (N), Acceleration (m/s²), Velocity (m/s), Position (m)
- **Observation textarea**: "What do you notice about the robot's motion when forces are balanced?"

### Valerie Socratic Clues (pre-scripted, no AI)
Trigger: `net_force crosses 0 N threshold`
1. "The robot is moving but not accelerating. If no net force is needed to KEEP an object moving — what IS net force needed for?"
2. "Look at the acceleration readout. It reads 0 m/s². Now look at velocity — is the robot stopped or still moving?"
3. "You set left = right and got a = 0. Try making them unequal. What happens to velocity now?"

### Quiz Questions
1. (MC) "A box slides at constant speed across a frictionless surface. What is the net force?" → Zero net force
2. (FR) "Two teams pull a rope with equal force (50 N each). What happens and why?"
3. (MC) "A 20 kg object has 40 N pushing right and 40 N pushing left. What is its acceleration?" → 0 m/s²

### Mastery Criteria
Student articulates: balanced forces (ΣF = 0) → zero acceleration → NO CHANGE in velocity. Object can be moving at constant velocity with zero net force. Balanced ≠ stationary.

---

## MODULE 3007 — MAGNETIC FORCE & DISTANCE (Magnet Rail)

### NGSS Standard
MS-PS2-5 | Non-contact forces, magnetic fields, force decreases with distance (qualitative)

### Narrative
**Title:** THE FADING GRIP
**Scenario:** Two powerful neodymium magnets sit on a frictionless measurement rail. At 1 cm apart the force sensor reads 8.0 N — strong enough to leap across the gap. A student slides one magnet to 2 cm apart and expects the force to halve. Instead the sensor plummets to roughly 1.0 N. Something about this force is far more dramatic than a simple linear drop-off.
**Mission:** Drag the movable magnet along the rail and record force readings at 5 different distances. Identify the mathematical pattern and predict the force at a distance you have NOT yet measured.

### Target Misconception
Students assume magnetic force decreases linearly with distance ("twice as far = half the force"). They fail to recognize the steep nonlinear drop-off.

### Physics Engine Specifics
```
Variables:
  distance: controlled by dragging magnet on canvas (1–20 cm range)
  F_max: 8.0 N (force at 1 cm reference distance)
  r_ref: 1.0 cm

Computation:
  // Simplified inverse-cube model (dipole–dipole axial approximation)
  // At MS level this is qualitative — students see the pattern, not the formula
  F = F_max * (r_ref / distance)^3
  // For simulation: use exponent 3 (inverse cube) for field,
  // but display force which follows ~1/r^4 between dipoles
  // Compromise: use exponent 3 for cleaner student discovery

Canvas rendering:
  - Horizontal rail (full width)
  - Fixed magnet: left side, red (N) / blue (S) poles, stationary
  - Movable magnet: draggable along rail, red (N) / blue (S) poles
  - Force vector arrow: between magnets, amber (#F59E0B)
    - Length proportional to F (logarithmic scaling so it's visible at large distances)
    - Arrow gets THICKER at close range
  - Magnetic field lines: curved dashed lines from N to S pole
    - Density decreases with distance (more lines = stronger field)
  - Distance label: between magnets, showing current separation in cm
  - Force readout: HUD overlay showing F in newtons (2 decimal places)
  - Data table overlay: students "pin" readings at each distance
    - Columns: Distance (cm) | Force (N) | Ratio to Previous
    - Up to 8 pinned readings
    - "Pin Reading 📌" button appears when magnet is stationary for >0.5s
```

### Sidebar Controls
- **Distance readout**: current separation (cm), updates in real time as student drags
- **Force readout**: current magnetic force (N)
- **Data Collection Table**: pinned readings with distance and force columns
- **"Pin Reading 📌" button**: saves current distance/force pair to table
- **Prediction textarea**: "Before measuring at __ cm, predict the force value:"
- **Observation textarea**: "Describe the pattern you see in your data table."

### Valerie Socratic Clues
Trigger: `force_magnitude drops below 10% of max`
1. "You expected the force to halve when you doubled the distance. Look at the actual reading — is it half? More? Less? By how much?"
2. "Compare your 1 cm reading to your 2 cm reading. Now compare 2 cm to 4 cm. Is the RATIO the same?"
3. "If the force dropped by a factor of 8 when you doubled the distance — predict what happens at 3 cm. Now measure it."

### Quiz Questions
1. (MC) "If you move two magnets from 1 cm to 2 cm apart, the force:" → Drops to about one-eighth
2. (FR) "A student moves magnets from 2 cm to 6 cm (tripling distance). Describe and explain the force change."
3. (MC) "Which statement is true about magnetic force?" → It acts through empty space without physical contact

### Mastery Criteria
Student explains: magnetic force decreases NONLINEARLY with distance — it drops off much faster than halving. Student provides data evidence showing the rapid decay pattern.

---

## MODULE 3222 — NEWTON'S SECOND LAW: F = ma (Rocket Sled)

### NGSS Standard
MS-PS2-2 | Force, mass, acceleration — direct and inverse proportionality

### Narrative
**Title:** THE RUNAWAY SLED
**Scenario:** A rocket sled on a frictionless test track carries different cargo loads. Engineers fire the same 100 N thruster but get wildly different accelerations: 10 kg of cargo → 10 m/s²; 50 kg → 2 m/s². The chief engineer asks: is there a single equation that predicts acceleration for ANY combination of force and mass?
**Mission:** Independently adjust thrust force (10–200 N) and sled mass (5–100 kg). Collect at least 4 data points showing BOTH the force–acceleration AND mass–acceleration relationships. Build an evidence-based F = ma graph.

### Target Misconception
Students memorize F = ma as a formula but don't treat it as a causal relationship. They fail to predict that doubling mass halves acceleration, or doubling force doubles acceleration.

### Physics Engine Specifics
```
Variables:
  F_thrust: slider 10–200 N (step 5)
  mass: slider 5–100 kg (step 1)
  friction: 0 (frictionless track)

Computation per tick:
  a = F_thrust / mass              // Newton's Second Law
  v += a * DT                      // velocity integration
  pos += v * DT                    // position integration
  pos = clamp(pos, 0, trackLength)
  // Auto-reset when sled reaches end of track

Canvas rendering:
  - Horizontal track with distance markers every 10m
  - Sled: rounded rectangle, size visually scales with mass
    - Light cargo (5-20 kg): small sled, bright cyan outline
    - Medium (20-50 kg): medium sled
    - Heavy (50-100 kg): large sled, thicker outline
  - Thruster flame: animated particles behind sled, size ∝ F_thrust
  - Acceleration vector: amber arrow above sled, length ∝ a
  - Velocity vector: cyan arrow below sled, length ∝ v (grows as sled speeds up)
  - Real-time graph overlay (toggleable):
    - Small chart in bottom-right of canvas
    - X-axis: time (s), Y-axis: velocity (m/s)
    - Line graph updates live as sled moves
  - Data collection: "Record Data Point 📊" button pins {F, m, a, v} to table
```

### Sidebar Controls
- **Thrust Force slider**: 10–200 N, label shows current value
- **Sled Mass slider**: 5–100 kg, label shows current value
- **Live Data HUD**:
  - Force (N): [value]
  - Mass (kg): [value]
  - Acceleration (m/s²): [value]
  - Velocity (m/s): [value]
  - Distance (m): [value]
- **"Launch Sled 🚀" button**: starts/resets the sled run
- **"Record Data Point 📊" button**: saves current {F, m, a} to data table
- **Data table**: columns Force (N) | Mass (kg) | Acceleration (m/s²)
- **Observation textarea**: "What patterns do you see in your data?"

### Valerie Socratic Clues
Trigger: `velocity exceeds 15 m/s`
1. "You just doubled the force but acceleration didn't change much. Check your mass slider — did you change mass too?"
2. "Compare Run 1 (low mass, high force) to Run 2 (high mass, same force). Which accelerated more? By what factor?"
3. "Hold mass constant and double the force. What happened to acceleration? Is it a line or a curve?"

### Quiz Questions
1. (MC) "A 10 kg cart is pushed with 30 N. What is its acceleration?" → 3 m/s²
2. (FR) "Keep force the same, triple the mass. Predict acceleration using F = ma."
3. (MC) "If you double BOTH force and mass simultaneously, acceleration:" → Stays the same

### Mastery Criteria
Student demonstrates BOTH relationships: (1) a doubles when F doubles at constant m, (2) a halves when m doubles at constant F. Student uses data to explain a = F/m as causal, not just a formula.

---

## IMPLEMENTATION CHECKLIST

For each module file, ensure:
- [ ] All 6 screens render correctly (INTRO → HYPO → SIM → OBSERVE → QUIZ → RESULTS)
- [ ] Physics engine runs at 60fps with no jank
- [ ] Sidebar action bar is ALWAYS visible (sticky bottom, no softlock)
- [ ] Ask Valerie popup works (modal, not countdown)
- [ ] Canvas resizes on window resize
- [ ] roundRect polyfill included
- [ ] Version tag in bottom-right corner
- [ ] Quiz scoring feeds into animated results ring
- [ ] All text is readable (contrast ratios ≥ 4.5:1)
- [ ] Works in Chrome, Firefox, Safari, Edge (ES6+)
- [ ] File size < 150 KB per module (no bloat)
- [ ] Google Fonts Nunito loads with preconnect
