/**
 * Valley Science - Batch Module Generator
 * Generates 20 standalone offline-capable interactive science simulations (modules 3001 through 3020)
 * Aligned with Utah SEEd 3rd Grade Standards, V7 Hybrid Design, Academic Vocabulary Enforcement,
 * 2s Interstellar Cinematic Transitions, In-Lab Controls (2:3 layout), Frosted Overlays, and Enter-key submissions.
 */

import fs from 'fs';
import path from 'path';

interface ModuleDef {
  id: number;
  code: string; // e.g. "3.1.1"
  standard: string; // e.g. "Utah SEEd 3.1.1 · Grade 3"
  strand: string; // e.g. "Strand 1: Weather and Climate"
  title: string;
  conceptTitle: string;
  briefScenario: string;
  challengeObjective: string;
  targetVocab: string[]; // 4 core Tier-2/Tier-3 terms
  hypPrompt: string;
  hypPlaceholder: string;
  stepLabels: string[];
  leftControl: {
    title: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    defaultVal: number;
    step: number;
  };
  rightControl: {
    title: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    defaultVal: number;
    step: number;
  };
  telemetry: {
    label1: string;
    label2: string;
    label3: string;
    label4: string;
  };
  video: {
    title: string;
    subtitle: string;
    captions: { start: number; end: number; text: string }[];
  };
  quiz: {
    question: string;
    hint: string;
    keywords: string[];
  }[];
  discoveryLogPrompt: string;
  takeaway: string;
  canvasType: string; // e.g. 'weather_station', 'climate_zones', 'flood_barrier', 'life_cycle', etc.
}

export const MODULES: ModuleDef[] = [
  // Module 3001: Forces and Motion (Reference Prototype)
  {
    id: 3001,
    code: "3.3.1",
    standard: "Utah SEEd 3.3.1 · Grade 3 · Module 3001",
    strand: "Strand 3: Force Affects Motion",
    title: "Balanced Forces & Equilibrium",
    conceptTitle: "Balanced Forces",
    briefScenario: "Orbital Tug-Bot 3001 is suspended on a frictionless linear test track. Opposing thrusters apply continuous vector magnitudes — yet sensor telemetry confirms the cart maintains steady equilibrium.",
    challengeObjective: "Calibrate both vector thrusters to establish zero net force (ΣF = 0 N) and verify Newton's First Law of Motion.",
    targetVocab: ["Equilibrium", "Net Force", "Vector Magnitude", "Inertia"],
    hypPrompt: "What physical outcome occurs when opposing forces exert identical vector magnitude on an object?",
    hypPlaceholder: "I hypothesize the net force will reach equilibrium because...",
    stepLabels: ["1. System Calibration", "2. Vector Escalation", "3. Dynamic Deviation", "4. Equilibrium Alignment", "5. Balanced State Verification", "6. Empirical Synthesis"],
    leftControl: { title: "Port Vector Thruster", label: "Left Vector Magnitude", unit: "N", min: 0, max: 100, defaultVal: 0, step: 1 },
    rightControl: { title: "Starboard Vector Thruster", label: "Right Vector Magnitude", unit: "N", min: 0, max: 100, defaultVal: 0, step: 1 },
    telemetry: { label1: "Net Force ΣF", label2: "Acceleration", label3: "Velocity Vector", label4: "Displacement" },
    video: {
      title: "Balanced Forces & Equilibrium in Physical Systems",
      subtitle: "Deterministic analysis of vector summation in dynamic and static frames",
      captions: [
        { start: 0, end: 5, text: "Forces possess vector magnitude and directional orientation." },
        { start: 5, end: 10, text: "Opposing vector forces undergoing vector summation cancel each other out." },
        { start: 10, end: 15, text: "When ΣF = 0 N, the system achieves mechanical equilibrium." },
        { start: 15, end: 21, text: "In equilibrium, acceleration is zero, preserving velocity inertia." },
        { start: 21, end: 30, text: "Newton's First Law: No net force produces zero acceleration." }
      ]
    },
    quiz: [
      {
        question: "Define 'mechanical equilibrium' using the term 'net force vector'. What mathematical condition must be satisfied?",
        hint: "Reference ΣF = F_right - F_left and its relation to zero acceleration.",
        keywords: ["equilibrium", "net force", "zero", "vector", "cancel", "acceleration"]
      },
      {
        question: "A spacecraft drifts through deep interstellar space at a constant velocity of 500 m/s with thrusters off. Are the forces in equilibrium? Explain using 'inertia'.",
        hint: "Consider Newton's First Law: does constant velocity require a net force?",
        keywords: ["equilibrium", "balanced", "inertia", "constant velocity", "zero net force", "no acceleration"]
      },
      {
        question: "In the experiment, when both thrusters fired at 60 N in opposite vectors, why was the resultant acceleration vector exactly 0.00 m/s²?",
        hint: "Apply Newton's Second Law formula a = ΣF / m with opposing 60 N vectors.",
        keywords: ["net force", "cancel", "equal", "opposite", "zero", "acceleration", "vector magnitude"]
      }
    ],
    discoveryLogPrompt: "Synthesize empirical evidence: Explain why opposing 60 N force vectors produce zero net acceleration, citing mechanical equilibrium.",
    takeaway: "Opposing vector forces with equal magnitude cancel completely (ΣF = 0 N). Zero net force produces zero acceleration, proving Newton's First Law.",
    canvasType: "tugbot_linear"
  },

  // Module 3002: Weather Patterns & Atmospheric Conditions (SEEd 3.1.1)
  {
    id: 3002,
    code: "3.1.1",
    standard: "Utah SEEd 3.1.1 · Grade 3 · Module 3002",
    strand: "Strand 1: Weather and Climate",
    title: "Atmospheric Thermodynamics & Weather Patterns",
    conceptTitle: "Weather Patterns",
    briefScenario: "Meteorologists in Salt Lake City observe rapid atmospheric shifts over the Wasatch Front. Air mass temperature differentials and barometric pressure drops trigger localized precipitation cycles.",
    challengeObjective: "Regulate thermal energy and barometric air pressure to analyze how atmospheric variables dictate condensation and precipitation patterns.",
    targetVocab: ["Atmosphere", "Barometric Pressure", "Precipitation", "Meteorologist"],
    hypPrompt: "How does a sudden drop in barometric pressure combined with low thermal temperature affect precipitation states?",
    hypPlaceholder: "I predict precipitation will transition into snow because lower atmospheric temperature...",
    stepLabels: ["1. Weather Station Setup", "2. Thermal Escalation", "3. Pressure Deviation", "4. Frontal Convergence", "5. Precipitation Analysis", "6. Meteorological Synthesis"],
    leftControl: { title: "Atmospheric Temperature", label: "Ambient Temp (°C)", unit: "°C", min: -20, max: 40, defaultVal: 15, step: 1 },
    rightControl: { title: "Barometric Pressure", label: "Pressure (kPa)", unit: "kPa", min: 85, max: 105, defaultVal: 101, step: 1 },
    telemetry: { label1: "Relative Humidity", label2: "Dew Point", label3: "Precipitation Rate", label4: "Air Density" },
    video: {
      title: "Atmospheric Thermodynamics & Frontal Systems",
      subtitle: "Monitoring thermodynamic phase transitions in meteorological systems",
      captions: [
        { start: 0, end: 5, text: "The atmosphere is a dynamic envelope of gases surrounding Earth." },
        { start: 5, end: 10, text: "Barometric pressure gradients drive wind vectors and air mass motion." },
        { start: 10, end: 15, text: "When warm, humid air masses cool below dew point, condensation occurs." },
        { start: 15, end: 21, text: "Precipitation takes the form of rain, snow, sleet, or hail." },
        { start: 21, end: 30, text: "Meteorologists interpret barometric drops to forecast severe storm tracks." }
      ]
    },
    quiz: [
      {
        question: "Explain how a meteorologist utilizes barometric pressure measurements to predict upcoming atmospheric precipitation.",
        hint: "Connect falling air pressure to rising humid air and cloud condensation.",
        keywords: ["barometric pressure", "meteorologist", "precipitation", "atmosphere", "density", "condensation"]
      },
      {
        question: "When atmospheric temperature plummets below 0°C during an active storm, what phase transition alters the precipitation state?",
        hint: "Describe liquid water freezing into crystalline solid ice or snow.",
        keywords: ["freezing", "solid", "precipitation", "snow", "temperature", "phase transition"]
      },
      {
        question: "Distinguish between daily atmospheric weather and long-term seasonal averages using exact meteorological terminology.",
        hint: "Differentiate short-term hourly/daily fluctuations from multi-decade climatic patterns.",
        keywords: ["weather", "atmosphere", "climate", "short-term", "temperature", "meteorologist"]
      }
    ],
    discoveryLogPrompt: "Document the thermodynamic correlation between dropping barometric pressure and elevated precipitation rates.",
    takeaway: "Atmospheric instability caused by low barometric pressure and cooling temperatures accelerates condensation, producing heavy precipitation.",
    canvasType: "atmosphere_cloud"
  },

  // Module 3003: Collecting Weather Data & Instruments (SEEd 3.1.1)
  {
    id: 3003,
    code: "3.1.1",
    standard: "Utah SEEd 3.1.1 · Grade 3 · Module 3003",
    strand: "Strand 1: Weather and Climate",
    title: "Meteorological Instrumentation & Data Acquisition",
    conceptTitle: "Weather Instruments",
    briefScenario: "An automated alpine weather station on Mt. Olympus deploys anemometers, hygrometers, and sounding balloons to transmit sensor telemetry to regional forecast centers.",
    challengeObjective: "Calibrate cup anemometer rotation and weather balloon radiosonde altitude to construct accurate empirical atmospheric data tables.",
    targetVocab: ["Anemometer", "Radiosonde", "Telemetry", "Data Acquisition"],
    hypPrompt: "How does wind velocity vector magnitude correlate with structural wind resistance recorded by telemetry instruments?",
    hypPlaceholder: "I hypothesize the anemometer angular frequency increases linearly with wind speed because...",
    stepLabels: ["1. Sensor Baseline", "2. Wind Velocity Sweep", "3. Balloon Ascent", "4. Telemetry Calibration", "5. Empirical Data Capture", "6. Instrument Synthesis"],
    leftControl: { title: "Wind Velocity Generator", label: "Wind Velocity (m/s)", unit: "m/s", min: 0, max: 50, defaultVal: 5, step: 1 },
    rightControl: { title: "Sounding Balloon Altitude", label: "Balloon Altitude (m)", unit: "m", min: 0, max: 5000, defaultVal: 500, step: 50 },
    telemetry: { label1: "Wind Velocity", label2: "Air Temp (°C)", label3: "Barometric kPa", label4: "Telemetry Sync" },
    video: {
      title: "Scientific Data Collection with Weather Instruments",
      subtitle: "High-precision instrumentation capturing atmospheric parameters across altitude gradients",
      captions: [
        { start: 0, end: 5, text: "Accurate forecasting requires continuous meteorological data acquisition." },
        { start: 5, end: 10, text: "Anemometers quantify wind speed; weather vanes establish directional vectors." },
        { start: 10, end: 15, text: "Sounding balloons ascend into the stratosphere carrying radiosondes." },
        { start: 15, end: 21, text: "Sensor telemetry streams temperature, pressure, and moisture gradients." },
        { start: 21, end: 30, text: "Empirical sensor data feeds predictive supercomputer climate models." }
      ]
    },
    quiz: [
      {
        question: "Explain the functional distinction between an anemometer and a barometer in meteorological data acquisition.",
        hint: "One measures mechanical kinetic energy of wind; the other measures gas force per unit area.",
        keywords: ["anemometer", "barometer", "wind velocity", "pressure", "data acquisition", "atmosphere"]
      },
      {
        question: "Why do scientists deploy radiosonde weather balloons rather than relying solely on terrestrial surface weather stations?",
        hint: "Consider how atmospheric conditions change with vertical altitude.",
        keywords: ["radiosonde", "altitude", "troposphere", "atmosphere", "telemetry", "vertical"]
      },
      {
        question: "What failure in scientific validity occurs if a weather station's telemetry sensor is poorly calibrated during a blizzard?",
        hint: "Discuss measurement error, inaccurate forecasting, and systematic data skew.",
        keywords: ["telemetry", "calibration", "data", "error", "accuracy", "meteorological"]
      }
    ],
    discoveryLogPrompt: "Analyze the altitude gradient data: How do barometric pressure and ambient temperature shift systematically as balloon altitude increases?",
    takeaway: "Atmospheric sounding reveals that temperature and pressure decrease predictably with altitude, captured via high-precision telemetry instruments.",
    canvasType: "anemometer_station"
  },

  // Module 3004: Weather Forecasts & Data Analysis (SEEd 3.1.1)
  {
    id: 3004,
    code: "3.1.1",
    standard: "Utah SEEd 3.1.1 · Grade 3 · Module 3004",
    strand: "Strand 1: Weather and Climate",
    title: "Synoptic Forecasting & Barometric Analysis",
    conceptTitle: "Weather Forecasts",
    briefScenario: "Regional meteorologists cross-examine multi-day historical data arrays in Salt Lake City, tracking pre-frontal wind shear and pressure drops before an incoming blizzard.",
    challengeObjective: "Isolate pre-storm data anomalies across temperature, wind velocity, and barometric trends to predict storm arrival windows.",
    targetVocab: ["Weather Forecast", "Air Pressure", "Wind Vector", "Data Analysis"],
    hypPrompt: "What specific pattern in air pressure and wind vector magnitude precedes a severe winter storm?",
    hypPlaceholder: "I predict that as a cold front approaches, air pressure will plummet while wind speed...",
    stepLabels: ["1. Data Matrix Review", "2. Vector Tracking", "3. Pressure Drop Isobars", "4. Frontal Interception", "5. Forecast Calculation", "6. Predictive Synthesis"],
    leftControl: { title: "Frontal Approach Distance", label: "Front Proximity (km)", unit: "km", min: 10, max: 300, defaultVal: 200, step: 5 },
    rightControl: { title: "Isobar Pressure Gradient", label: "Pressure Delta (hPa)", unit: "hPa", min: 0, max: 30, defaultVal: 5, step: 1 },
    telemetry: { label1: "Forecast Probability", label2: "Wind Shear Vector", label3: "Arrival Window", label4: "Confidence Index" },
    video: {
      title: "Mathematical Foundations of Weather Forecasting",
      subtitle: "Decoding multi-variable data patterns to build reliable probability models",
      captions: [
        { start: 0, end: 5, text: "A weather forecast is an evidence-based probability prediction." },
        { start: 5, end: 10, text: "Meteorologists track isobars—lines of equal barometric air pressure." },
        { start: 10, end: 15, text: "Steep pressure gradients generate high-velocity wind vectors." },
        { start: 15, end: 21, text: "Approaching cold fronts force warm air upward, spawning frontal squalls." },
        { start: 21, end: 30, text: "Synthesizing multi-day sensor arrays maximizes forecast reliability." }
      ]
    },
    quiz: [
      {
        question: "How does a steep isobaric pressure gradient generate high-magnitude wind vectors during storm development?",
        hint: "Air flows rapidly from high-pressure zones to low-pressure zones.",
        keywords: ["pressure", "wind vector", "gradient", "isobar", "air pressure", "velocity"]
      },
      {
        question: "Why is a weather forecast termed a 'probabilistic prediction' rather than an absolute mathematical guarantee?",
        hint: "Explain non-linear atmospheric variables, unexpected trajectory shifts, and localized geography.",
        keywords: ["forecast", "probability", "data analysis", "variable", "atmosphere", "uncertainty"]
      },
      {
        question: "Based on Salt Lake City data arrays, what combination of barometric shift and wind vector signals immediate snow onset?",
        hint: "Reference falling barometric pressure paired with intensifying northerly wind vectors.",
        keywords: ["falling pressure", "wind vector", "temperature drop", "snow", "front", "data"]
      }
    ],
    discoveryLogPrompt: "Examine your simulated isobar model: Conclude why air masses rush violently toward zones of lowest barometric pressure.",
    takeaway: "Steep barometric pressure differentials drive high wind vector velocities and force frontal collisions, allowing reliable weather forecasts.",
    canvasType: "isobar_map"
  },

  // Module 3005: Global Climate Patterns & Zones (SEEd 3.1.2)
  {
    id: 3005,
    code: "3.1.2",
    standard: "Utah SEEd 3.1.2 · Grade 3 · Module 3005",
    strand: "Strand 1: Weather and Climate",
    title: "Global Biomes & Climate Pattern Dynamics",
    conceptTitle: "Climate Patterns",
    briefScenario: "Earth-observing satellite radiometers map planetary thermal radiation. Equatorial continents absorb dense solar irradiance, while high-latitude polar ice sheets reflect solar energy back into space.",
    challengeObjective: "Manipulate planetary solar insolation angles and precipitation baselines to delineate 30-year climate zones across continental landmasses.",
    targetVocab: ["Climate Zone", "Solar Irradiance", "Seasonal Precipitation", "Latitude"],
    hypPrompt: "Why does the annual average temperature of a geographic region depend directly on its latitude relative to the equator?",
    hypPlaceholder: "I hypothesize equatorial regions maintain higher temperatures because solar irradiance strikes at...",
    stepLabels: ["1. Equatorial Alignment", "2. Insolation Sweep", "3. Precipitation Mapping", "4. Regional Comparison", "5. 30-Year Averaging", "6. Climatological Synthesis"],
    leftControl: { title: "Geographic Latitude", label: "Latitude (°N/S)", unit: "°", min: 0, max: 90, defaultVal: 40, step: 1 },
    rightControl: { title: "Annual Insolation Flux", label: "Solar Flux (W/m²)", unit: "W/m²", min: 80, max: 400, defaultVal: 240, step: 5 },
    telemetry: { label1: "30-Yr Mean Temp", label2: "Solar Incident Angle", label3: "Annual Rainfall", label4: "Climate Class" },
    video: {
      title: "Global Climate Patterns & Planetary Solar Flux",
      subtitle: "How orbital mechanics and axial tilt determine 30-year regional climate baselines",
      captions: [
        { start: 0, end: 5, text: "Climate represents the statistical 30-year weather average of a region." },
        { start: 5, end: 10, text: "Equatorial latitudes receive direct, perpendicular solar irradiance." },
        { start: 10, end: 15, text: "Polar latitudes receive oblique, dispersed solar rays across broad areas." },
        { start: 15, end: 21, text: "Atmospheric convection cells redistribute heat toward temperate zones." },
        { start: 21, end: 30, text: "Consistent long-term precipitation and thermal metrics define climate zones." }
      ]
    },
    quiz: [
      {
        question: "Differentiate scientific 'climate' from daily 'weather' using duration and statistical averaging in your answer.",
        hint: "Weather is measured hourly/daily; climate requires 30-year empirical records.",
        keywords: ["climate", "weather", "30-year", "average", "statistical", "seasonal precipitation"]
      },
      {
        question: "How does solar irradiance angle at 0° latitude compare with 80° latitude, and how does this dictate regional climate?",
        hint: "Perpendicular rays concentrate thermal energy, while oblique rays scatter energy over wider surface area.",
        keywords: ["solar irradiance", "latitude", "perpendicular", "equator", "polar", "angle"]
      },
      {
        question: "Why would comparing New York City and San Diego climate data require 30 years of temperature curves rather than one January afternoon?",
        hint: "Individual weather anomalies can deviate, but multi-decade curves reveal true systemic climate.",
        keywords: ["climate zone", "30-year", "data", "average", "weather anomaly", "seasonal"]
      }
    ],
    discoveryLogPrompt: "Document how increasing geographic latitude from 0° to 85° systematically degrades thermal equilibrium and solar flux.",
    takeaway: "Planetary curvature causes solar irradiance to scatter at higher latitudes, establishing distinct 30-year thermal and precipitation climate zones.",
    canvasType: "globe_insolation"
  },

  // Module 3006: The Five Main Climate Types (SEEd 3.1.2)
  {
    id: 3006,
    code: "3.1.2",
    standard: "Utah SEEd 3.1.2 · Grade 3 · Module 3006",
    strand: "Strand 1: Weather and Climate",
    title: "Classification of Planetary Climate Systems",
    conceptTitle: "The Five Climate Types",
    briefScenario: "Climatologists categorize Earth's landmasses into five primary regimes: Tropical, Arid/Dry, Temperate, Continental, and Polar, defined by strict precipitation and thermal thresholds.",
    challengeObjective: "Classify unknown continental test biomes by measuring seasonal precipitation volumes and annual thermal swings against Köppen standards.",
    targetVocab: ["Tropical Climate", "Continental Climate", "Polar Climate", "Arid Climate"],
    hypPrompt: "What environmental trait distinguishes continental climate zones from coastal temperate zones at the same latitude?",
    hypPlaceholder: "I hypothesize that continental climates experience extreme seasonal temperature ranges because...",
    stepLabels: ["1. Biome Sampling", "2. Thermal Range Test", "3. Precipitation Audit", "4. Köppen Classification", "5. Continental Boundary", "6. Biome Synthesis"],
    leftControl: { title: "Ocean Proximity Offset", label: "Distance to Ocean (km)", unit: "km", min: 0, max: 1500, defaultVal: 500, step: 25 },
    rightControl: { title: "Annual Moisture Budget", label: "Precipitation (cm)", unit: "cm", min: 5, max: 350, defaultVal: 80, step: 5 },
    telemetry: { label1: "Thermal Oscillation", label2: "Dry Season Index", label3: "Climate Regime", label4: "Biome Match" },
    video: {
      title: "The Five Primary Global Climate Classifications",
      subtitle: "Analyzing precipitation patterns and seasonal thermal oscillations across continental plates",
      captions: [
        { start: 0, end: 5, text: "Earth exhibits five major climate zones based on thermal energy and rainfall." },
        { start: 5, end: 10, text: "Tropical zones remain persistently warm with intense convective rainfall." },
        { start: 10, end: 15, text: "Arid deserts experience severe moisture deficits under 25 cm annually." },
        { start: 15, end: 21, text: "Continental interiors face scorching summers and freezing winters." },
        { start: 21, end: 30, text: "Polar zones endure sustained sub-zero temperatures and cryospheric ice." }
      ]
    },
    quiz: [
      {
        question: "Define the thermal and precipitation characteristics that classify an ecosystem as an 'arid climate'.",
        hint: "Note annual rainfall below 25 cm (10 inches) and high evapotranspiration.",
        keywords: ["arid climate", "precipitation", "desert", "dry", "evaporation", "deficit"]
      },
      {
        question: "Why do continental climates experience far wider seasonal temperature oscillations than maritime temperate climates?",
        hint: "Water has high specific heat capacity, stabilizing coastal air, while continental land heats and cools rapidly.",
        keywords: ["continental climate", "temperate", "ocean", "specific heat", "thermal oscillation", "landmass"]
      },
      {
        question: "Identify the critical environmental constraint preventing dense vegetative canopy growth in polar climate zones.",
        hint: "Sustained sub-freezing temperatures, permafrost, and minimal liquid precipitation.",
        keywords: ["polar climate", "freezing", "permafrost", "precipitation", "temperature", "vegetation"]
      }
    ],
    discoveryLogPrompt: "Synthesize why continental landmasses far from ocean bodies undergo dramatic winter-to-summer thermal extremes.",
    takeaway: "Maritime oceans buffer temperate climates, whereas vast continental landmasses produce extreme seasonal thermal swings.",
    canvasType: "climate_zones_strip"
  },

  // Module 3007: Severe Weather Hazards (SEEd 3.1.3)
  {
    id: 3007,
    code: "3.1.3",
    standard: "Utah SEEd 3.1.3 · Grade 3 · Module 3007",
    strand: "Strand 1: Weather and Climate",
    title: "Severe Meteorological Hazards & Vortex Dynamics",
    conceptTitle: "Severe Weather Hazards",
    briefScenario: "A multi-cell thunderstorm over the Salt Lake Valley undergoes explosive supercell cyclogenesis. Intense updrafts generate rotating mesocyclones capable of spawning destructive tornadoes and flash floods.",
    challengeObjective: "Analyze convective available potential energy (CAPE) and wind shear vectors to predict vortex formation and structural hazard risks.",
    targetVocab: ["Severe Weather", "Mesocyclone", "Tornado", "Flash Flood"],
    hypPrompt: "What thermodynamic interaction between rapid atmospheric updrafts and rotating wind shear generates a tornado?",
    hypPlaceholder: "I hypothesize that when rising warm updrafts encounter perpendicular horizontal wind shear...",
    stepLabels: ["1. Supercell Ingestion", "2. Updraft Acceleration", "3. Mesocyclone Spin", "4. Funnel Touchdown", "5. Hazard Radius Mapping", "6. Safety Protocol Synthesis"],
    leftControl: { title: "Convective Updraft Power", label: "Updraft Velocity (m/s)", unit: "m/s", min: 10, max: 70, defaultVal: 35, step: 1 },
    rightControl: { title: "Rotational Wind Shear", label: "Helicity Shear (m²/s²)", unit: "m²/s²", min: 50, max: 450, defaultVal: 200, step: 5 },
    telemetry: { label1: "Vortex Intensity", label2: "Fujita Rating", label3: "Flash Flood Risk", label4: "Alert Status" },
    video: {
      title: "Atmospheric Physics of Severe Weather Hazards",
      subtitle: "Unraveling the thermodynamic energy driving tornadoes, supercells, and flash floods",
      captions: [
        { start: 0, end: 5, text: "Severe weather encompasses dangerous atmospheric phenomena causing destruction." },
        { start: 5, end: 10, text: "Supercell storms harbor powerful vertical updrafts exceeding 50 m/s." },
        { start: 10, end: 15, text: "Wind shear tilts rotating columns of air into vertical mesocyclones." },
        { start: 15, end: 21, text: "Tornado funnels descend, concentrating kinetic energy at ground contact." },
        { start: 21, end: 30, text: "Torrential convective rainfall saturates river basins, triggering flash floods." }
      ]
    },
    quiz: [
      {
        question: "Define 'severe weather' and explain why tornadoes are classified among the most catastrophic meteorological hazards.",
        hint: "Discuss rotational kinetic energy, destructive pressure drops, and wind speeds exceeding 200 mph.",
        keywords: ["severe weather", "tornado", "hazard", "wind velocity", "destruction", "kinetic energy"]
      },
      {
        question: "How does rapid convective rainfall over compacted urban soils produce sudden flash flood hazards?",
        hint: "Water influx surpasses soil absorption capacity, causing rapid surface runoff into rivers.",
        keywords: ["flash flood", "precipitation", "runoff", "saturation", "basin", "severe weather"]
      },
      {
        question: "What protective action should citizens execute immediately upon issuance of a formal Doppler tornado warning?",
        hint: "Seek subterranean shelter or lowest interior structural room away from exterior glass.",
        keywords: ["tornado", "shelter", "basement", "warning", "protection", "severe weather"]
      }
    ],
    discoveryLogPrompt: "Describe how elevating updraft velocity and rotational wind shear transforms a standard thunderstorm into a tornadic mesocyclone.",
    takeaway: "Intense vertical atmospheric updrafts combined with rotational wind shear generate destructive mesocyclones, demanding early warning systems.",
    canvasType: "vortex_tornado"
  },

  // Module 3008: Engineering Solutions for Weather Hazards (SEEd 3.1.3)
  {
    id: 3008,
    code: "3.1.3",
    standard: "Utah SEEd 3.1.3 · Grade 3 · Module 3008",
    strand: "Strand 1: Weather and Climate",
    title: "Structural Engineering Against Hydrological Hazards",
    conceptTitle: "Engineering for Weather Hazards",
    briefScenario: "Cedar Rapids, Iowa faces historic Cedar River cresting. Civil engineers must evaluate structural flood mitigation prototypes—sandbag levees, architectural stilts, and river diversion dams—under strict economic constraints.",
    challengeObjective: "Optimize structural flood barrier prototypes to achieve complete hydrological containment while satisfying strict criteria and budgetary constraints.",
    targetVocab: ["Criteria", "Constraints", "Prototype", "Mitigation"],
    hypPrompt: "Which engineering solution best satisfies the criteria of total residential flood protection while operating within a $3M budget constraint?",
    hypPlaceholder: "I hypothesize that architectural stilts will satisfy criteria better than river dams because their capital cost...",
    stepLabels: ["1. Problem Definition", "2. Criteria & Constraints", "3. Barrier Simulation", "4. Hydrostatic Stress Test", "5. Economic Audit", "6. Engineering Decision"],
    leftControl: { title: "River Flood Crest Surge", label: "Hydrostatic Height (m)", unit: "m", min: 1, max: 8, defaultVal: 4, step: 0.5 },
    rightControl: { title: "Structural Budget Allocation", label: "Capital Expenditure ($M)", unit: "$M", min: 1, max: 6, defaultVal: 3, step: 0.5 },
    telemetry: { label1: "Containment Efficiency", label2: "Structural Stress", label3: "Budget Adherence", label4: "Environmental Score" },
    video: {
      title: "Civil Engineering for Severe Weather Hazard Mitigation",
      subtitle: "Iterative prototype testing against real-world criteria and resource constraints",
      captions: [
        { start: 0, end: 5, text: "Engineers design solutions to protect human communities from natural hazards." },
        { start: 5, end: 10, text: "Criteria are required performance targets, such as complete water exclusion." },
        { start: 10, end: 15, text: "Constraints are physical limits, including financial budget and construction time." },
        { start: 15, end: 21, text: "Prototypes undergo simulated hydrodynamic stress testing before deployment." },
        { start: 21, end: 30, text: "Optimizing balance between cost, ecology, and structural resilience achieves success." }
      ]
    },
    quiz: [
      {
        question: "In engineering design, rigorously distinguish between project 'criteria' and project 'constraints'.",
        hint: "Criteria represent success goals; constraints represent boundaries like budget, time, and materials.",
        keywords: ["criteria", "constraints", "prototype", "budget", "goals", "limits"]
      },
      {
        question: "Why was the $5 million river diversion dam rejected despite high containment efficiency in the Cedar Rapids case study?",
        hint: "It exceeded the non-negotiable $3 million municipal budget constraint and damaged riverine ecosystems.",
        keywords: ["constraints", "budget", "cost", "criteria", "environment", "dam"]
      },
      {
        question: "Explain why temporary sandbag barriers, while inexpensive ($1M), require continuous iterative maintenance during prolonged floods.",
        hint: "Sandbags are permeable under hydrostatic pressure and degrade over multi-week floods.",
        keywords: ["prototype", "sandbags", "mitigation", "hydrostatic", "criteria", "failure"]
      }
    ],
    discoveryLogPrompt: "Synthesize the engineering trade-offs: Why do architectural stilts meet the $3M budget constraint and long-term durability criteria better than sandbags?",
    takeaway: "Successful engineering hazard solutions balance operational performance criteria against non-negotiable financial and temporal constraints.",
    canvasType: "flood_levee"
  },

  // Module 3009: Animal and Plant Life Cycles (SEEd 3.2.1)
  {
    id: 3009,
    code: "3.2.1",
    standard: "Utah SEEd 3.2.1 · Grade 3 · Module 3009",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Biological Life Cycles & Reproductive Continuity",
    conceptTitle: "Life Cycles",
    briefScenario: "Ecologists track amphibians and angiosperm flora across Great Salt Lake riparian wetlands, mapping the universal cyclical progression of birth, developmental growth, reproduction, and mortality.",
    challengeObjective: "Model developmental progression and gamete pollination to maintain population carrying capacity across generations.",
    targetVocab: ["Life Cycle", "Reproduction", "Organism", "Extinction"],
    hypPrompt: "What universal biological consequence occurs to a species population if environmental hazards disrupt the reproduction phase?",
    hypPlaceholder: "I hypothesize that if organisms fail to reach reproductive maturity, the population will...",
    stepLabels: ["1. Germination & Birth", "2. Biomass Growth", "3. Reproductive Maturation", "4. Seed Dispersal & Oviposition", "5. Generation Transition", "6. Biological Synthesis"],
    leftControl: { title: "Nutrient & Hydration Flux", label: "Nutrient Availability (%)", unit: "%", min: 10, max: 100, defaultVal: 70, step: 1 },
    rightControl: { title: "Reproductive Mating Rate", label: "Fertility Index (%)", unit: "%", min: 0, max: 100, defaultVal: 50, step: 1 },
    telemetry: { label1: "Organism Population", label2: "Growth Velocity", label3: "Generational Turnover", label4: "Mortality Rate" },
    video: {
      title: "The Universal Biological Progression of Life Cycles",
      subtitle: "Tracing continuity from embryonic birth through developmental growth to reproductive renewal",
      captions: [
        { start: 0, end: 5, text: "All living organisms undergo a repeating developmental life cycle." },
        { start: 5, end: 10, text: "The universal sequence spans birth, growth, reproduction, and death." },
        { start: 10, end: 15, text: "Plants develop roots and foliage from seeds; animals mature into adults." },
        { start: 15, end: 21, text: "Reproduction ensures genetic transmission to subsequent generations." },
        { start: 21, end: 30, text: "Failure to reproduce across successive generations results in biological extinction." }
      ]
    },
    quiz: [
      {
        question: "State the four universal sequential phases of an organism's life cycle and define the evolutionary significance of 'reproduction'.",
        hint: "Birth, growth, reproduction, death; reproduction transmits genetic traits and prevents extinction.",
        keywords: ["life cycle", "birth", "growth", "reproduction", "death", "organism"]
      },
      {
        question: "How does the life cycle of an apple tree compare to that of an amphibian (frog), despite physical structural differences?",
        hint: "Both progress from embryonic seed/egg through vegetative/tadpole growth to reproductive adult.",
        keywords: ["life cycle", "plant", "animal", "reproduction", "seed", "egg"]
      },
      {
        question: "What ecological catastrophe threatens an organism population if mortality rates permanently outpace reproductive output?",
        hint: "Declining carrying capacity terminating in species extinction.",
        keywords: ["extinction", "mortality", "reproduction", "population", "survival", "life cycle"]
      }
    ],
    discoveryLogPrompt: "Document how environmental nutrient availability accelerates the transition from developmental growth to reproductive viability.",
    takeaway: "Every organism follows the invariant cycle of birth, growth, reproduction, and death; reproductive success is mandatory to avert species extinction.",
    canvasType: "tree_frog_cycle"
  },

  // Module 3010: Insect Metamorphosis (SEEd 3.2.1)
  {
    id: 3010,
    code: "3.2.1",
    standard: "Utah SEEd 3.2.1 · Grade 3 · Module 3010",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Complete Holometabolous Metamorphosis",
    conceptTitle: "Insect Metamorphosis",
    briefScenario: "Entomologists monitor Monarch butterfly cohorts through four discrete developmental stages: embryonic egg, voracious larval caterpillar, chrysalis pupa, and reproductive winged imago.",
    challengeObjective: "Regulate hormonal ecdysone levels and food consumption to transition an insect through complete metamorphosis without pupal mortality.",
    targetVocab: ["Metamorphosis", "Larva", "Pupa", "Chrysalis"],
    hypPrompt: "How does the complete anatomical restructuring during the pupal chrysalis phase enable ecological resource partitioning between larva and adult?",
    hypPlaceholder: "I hypothesize the pupal phase reconfigures mouthparts and locomotion so adult butterflies do not compete with...",
    stepLabels: ["1. Oviposition Egg", "2. Larval Feeding Phase", "3. Pupal Chrysalis Formation", "4. Cellular Histolysis & Restructuring", "5. Imago Eclosion", "6. Entomological Synthesis"],
    leftControl: { title: "Larval Foliage Ingestion", label: "Caloric Intake (g)", unit: "g", min: 0, max: 50, defaultVal: 25, step: 1 },
    rightControl: { title: "Juvenile Hormone Delta", label: "Hormone Level (µg)", unit: "µg", min: 0, max: 100, defaultVal: 50, step: 1 },
    telemetry: { label1: "Developmental Phase", label2: "Histoblast Density", label3: "Biomass Mass", label4: "Eclosion Readiness" },
    video: {
      title: "Cellular Mechanics of Holometabolous Metamorphosis",
      subtitle: "Examining total morphological transformation across four discrete life stages",
      captions: [
        { start: 0, end: 5, text: "Metamorphosis describes profound anatomical changes during insect maturation." },
        { start: 5, end: 10, text: "The larva emerges from the egg dedicated exclusively to biomass accumulation." },
        { start: 10, end: 15, text: "Upon reaching critical mass, the larva encases in a protective chrysalis as a pupa." },
        { start: 15, end: 21, text: "Inside the pupa, larval tissues dissolve and imaginal discs form adult anatomy." },
        { start: 21, end: 30, text: "The winged adult emerges specialized for dispersal, pollination, and reproduction." }
      ]
    },
    quiz: [
      {
        question: "Define 'complete metamorphosis' and identify the four sequential stages in order from oviposition to maturity.",
        hint: "Egg, larva (caterpillar), pupa (chrysalis), adult (imago).",
        keywords: ["metamorphosis", "larva", "pupa", "chrysalis", "egg", "adult"]
      },
      {
        question: "What critical physiological process occurs within the chrysalis while the pupa is outwardly motionless?",
        hint: "Larval cells undergo enzymatic breakdown and imaginal discs construct wings, legs, and reproductive organs.",
        keywords: ["pupa", "chrysalis", "cellular", "reorganize", "wings", "metamorphosis"]
      },
      {
        question: "How does metamorphic specialization prevent ecological food competition between larval caterpillars and adult butterflies?",
        hint: "Larvae chew vegetative foliage; adults feed on liquid floral nectar.",
        keywords: ["larva", "caterpillar", "nectar", "foliage", "competition", "metamorphosis"]
      }
    ],
    discoveryLogPrompt: "Record observations of the transformation from larval caterpillar into pupa: How does cellular restructuring in the chrysalis produce winged anatomy?",
    takeaway: "Complete metamorphosis completely transforms larval body plans inside the pupal chrysalis into winged reproductive adults.",
    canvasType: "butterfly_morph"
  },

  // Module 3011: Inherited Traits & Family Patterns (SEEd 3.2.2)
  {
    id: 3011,
    code: "3.2.2",
    standard: "Utah SEEd 3.2.2 · Grade 3 · Module 3011",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Genetic Inheritance & Phenotypic Patterns",
    conceptTitle: "Inherited Traits",
    briefScenario: "Geneticists at the Hogle Zoo analyze pedigree charts for primate family groups, tracking facial pigment, fur coloration, and phalange dimensions transmitted from parents to offspring.",
    challengeObjective: "Track parental trait transmission across multigenerational data arrays to identify dominant inherited physical characteristics in offspring.",
    targetVocab: ["Inherited Trait", "Offspring", "Phenotype", "Genetics"],
    hypPrompt: "Why does an offspring exhibit a mosaic of inherited traits from both maternal and paternal organisms rather than an exact replica of one?",
    hypPlaceholder: "I hypothesize that offspring inherit genetic information from both parents, causing physical traits to...",
    stepLabels: ["1. Parental Phenotyping", "2. Allele Transmission", "3. Offspring Trait Expression", "4. Pedigree Correlation", "5. Variation Mapping", "6. Genetic Synthesis"],
    leftControl: { title: "Maternal Trait Expression", label: "Maternal Pigment Index", unit: "%", min: 0, max: 100, defaultVal: 40, step: 1 },
    rightControl: { title: "Paternal Trait Expression", label: "Paternal Pigment Index", unit: "%", min: 0, max: 100, defaultVal: 80, step: 1 },
    telemetry: { label1: "Inherited Fur Color", label2: "Facial Pigment Match", label3: "Phalange Dimension", label4: "Parental Alignment" },
    video: {
      title: "Biological Foundations of Inherited Physical Traits",
      subtitle: "Tracing hereditary information transfer across generations of organisms",
      captions: [
        { start: 0, end: 5, text: "Traits are physical or behavioral characteristics passed from parent to offspring." },
        { start: 5, end: 10, text: "To inherit means to receive genetic information from biological forebears." },
        { start: 10, end: 15, text: "Offspring receive roughly half their inherited information from each parent." },
        { start: 15, end: 21, text: "Eye coloration, leaf morphology, and fur patterns reflect inherited traits." },
        { start: 21, end: 30, text: "Pedigree analysis reveals predictable patterns of genetic transmission." }
      ]
    },
    quiz: [
      {
        question: "Define what it means for an organism to 'inherit' a physical trait from its parents.",
        hint: "Transmission of biological genetic instructions from maternal and paternal ancestors.",
        keywords: ["inherit", "inherited trait", "parents", "offspring", "genetic", "characteristics"]
      },
      {
        question: "In the Hogle Zoo monkey pedigree data, why did offspring #4 possess black fur when the mother had brown fur?",
        hint: "The offspring inherited paternal genetic information for black fur pigmentation.",
        keywords: ["inherit", "paternal", "father", "offspring", "fur color", "trait"]
      },
      {
        question: "Name two inherited traits visible in botanical saplings that verify parentage with a mature oak tree.",
        hint: "Leaf lobe morphology, bark texture, and acorn fruit type.",
        keywords: ["leaf shape", "inherited trait", "sapling", "oak tree", "offspring", "botanical"]
      }
    ],
    discoveryLogPrompt: "Synthesize empirical pedigree data: How do inherited traits mathematically reflect contributions from both parental organisms?",
    takeaway: "Offspring inherit combinations of physical traits from both biological parents, creating distinct familial phenotypic patterns.",
    canvasType: "primate_pedigree"
  },

  // Module 3012: Variations in Traits (SEEd 3.2.2)
  {
    id: 3012,
    code: "3.2.2",
    standard: "Utah SEEd 3.2.2 · Grade 3 · Module 3012",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Intraspecies Variation & Trait Distributions",
    conceptTitle: "Variations in Traits",
    briefScenario: "Agronomists examine a monoculture field of 10,000 sunflowers. Despite sharing identical parentage, individual plants exhibit measurable phenotypic variation in stem height, petal morphology, and seed yield.",
    challengeObjective: "Quantify and graph normal trait distribution curves to prove that biological siblings naturally exhibit physical variations.",
    targetVocab: ["Variation", "Trait", "Phenotype", "Distribution"],
    hypPrompt: "Why do biological siblings from identical parents exhibit distinct physical variations rather than cloned traits?",
    hypPlaceholder: "I hypothesize that offspring receive different combinations of inherited parental information, resulting in...",
    stepLabels: ["1. Population Sampling", "2. Height Distribution", "3. Pigment Variance", "4. Petal Morphology Plot", "5. Statistical Spread", "6. Variation Synthesis"],
    leftControl: { title: "Genetic Shuffling Index", label: "Allele Recombination (%)", unit: "%", min: 0, max: 100, defaultVal: 50, step: 1 },
    rightControl: { title: "Sample Cohort Size", label: "Sample Cohort (N)", unit: "plants", min: 10, max: 500, defaultVal: 100, step: 10 },
    telemetry: { label1: "Mean Stem Height", label2: "Variance σ²", label3: "Standard Deviation", label4: "Distribution Spread" },
    video: {
      title: "Biological Drivers of Variation within Species",
      subtitle: "Why genetic shuffling produces unique phenotypic differences among siblings",
      captions: [
        { start: 0, end: 5, text: "Variation refers to differences in traits among individuals of the same species." },
        { start: 5, end: 10, text: "Even offspring from the same parents inherit unique combinations of traits." },
        { start: 10, end: 15, text: "Puppies in a single litter display varying coat markings, paw sizes, and mass." },
        { start: 15, end: 21, text: "Sunflowers in a single meadow exhibit variance in petal count and stem height." },
        { start: 21, end: 30, text: "Trait variation provides the raw foundation for natural selection and survival." }
      ]
    },
    quiz: [
      {
        question: "Define biological 'variation' and provide one concrete example from a litter of canine offspring.",
        hint: "Differences in physical characteristics like coat color, ear floppiness, or snout length among siblings.",
        keywords: ["variation", "traits", "offspring", "litter", "difference", "inherited"]
      },
      {
        question: "Why is natural variation within a plant population advantageous if a novel fungal pathogen infects the meadow?",
        hint: "Some variant individuals may possess traits granting natural immunity, preventing total population collapse.",
        keywords: ["variation", "survival", "pathogen", "population", "immunity", "trait"]
      },
      {
        question: "Explain why sunflowers sharing the same parents do not grow to the exact same millimeter height.",
        hint: "Unique genetic combinations paired with subtle micro-environmental variance produce trait distributions.",
        keywords: ["variation", "height", "genetic", "distribution", "parents", "phenotype"]
      }
    ],
    discoveryLogPrompt: "Analyze the bell curve distribution: Conclude why phenotypic variation is ubiquitous across all sexually reproducing populations.",
    takeaway: "Genetic shuffling ensures no two offspring are identical, producing measurable variations across every biological population.",
    canvasType: "sunflower_bellcurve"
  },

  // Module 3013: Environmental Influences on Traits (SEEd 3.2.3)
  {
    id: 3013,
    code: "3.2.3",
    standard: "Utah SEEd 3.2.3 · Grade 3 · Module 3013",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Environmental Factors & Phenotypic Plasticity",
    conceptTitle: "Environmental Traits",
    briefScenario: "The Garza family cultivates identical genetic carrot seeds across two garden planter boxes. Planter Box 1 receives daily irrigation; Planter Box 2 suffers drought, stunting taproot biomass.",
    challengeObjective: "Isolate irrigation frequency and soil compaction variables to prove that external environmental conditions physically modify organism phenotypes.",
    targetVocab: ["Environmental Trait", "Stunting", "Phenotypic Plasticity", "Organism"],
    hypPrompt: "How does insufficient water availability stunt physical trait development in genetically identical plants?",
    hypPlaceholder: "I hypothesize that without adequate water, cellular expansion is halted, causing stunted...",
    stepLabels: ["1. Soil Preparation", "2. Hydration Regimes", "3. Biomass Accumulation", "4. Taproot Extraction", "5. Comparative Morphology", "6. Environmental Synthesis"],
    leftControl: { title: "Irrigation Frequency", label: "Weekly Watering (Days)", unit: "days", min: 1, max: 7, defaultVal: 4, step: 1 },
    rightControl: { title: "Soil Mineral Density", label: "Nutrient Saturation (%)", unit: "%", min: 10, max: 100, defaultVal: 60, step: 1 },
    telemetry: { label1: "Root Biomass (g)", label2: "Root Length (cm)", label3: "Stunting Factor", label4: "Foliage Density" },
    video: {
      title: "Environmental Modification of Biological Traits",
      subtitle: "Investigating how external resource availability alters physical growth and morphology",
      captions: [
        { start: 0, end: 5, text: "An organism's physical traits are shaped by both genetics and the environment." },
        { start: 5, end: 10, text: "Environmental traits develop in response to external factors like food and water." },
        { start: 10, end: 15, text: "Insufficient hydration stunts plant growth regardless of genetic potential." },
        { start: 15, end: 21, text: "Domestic pets provided excessive caloric intake become overweight and lethargic." },
        { start: 21, end: 30, text: "Phenotypic expression reflects the continuous interaction of genome and habitat." }
      ]
    },
    quiz: [
      {
        question: "Define an 'environmental trait' and contrast it with a purely inherited trait using botanical examples.",
        hint: "Leaf shape is inherited; stunted height due to drought is an environmental trait.",
        keywords: ["environmental trait", "inherited", "stunting", "water", "environment", "phenotype"]
      },
      {
        question: "Based on the Garza family investigation, why did Carrot A grow significantly smaller than Carrot B?",
        hint: "Carrot A's garden box received significantly less weekly irrigation, stunting cellular expansion.",
        keywords: ["water", "stunting", "garden box", "environmental trait", "growth", "carrot"]
      },
      {
        question: "How can two identical twin animals with the exact same genes end up with completely different adult body weights?",
        hint: "Disparities in nutritional intake, physical exercise, and environmental stressors.",
        keywords: ["environment", "nutrition", "exercise", "weight", "genes", "environmental trait"]
      }
    ],
    discoveryLogPrompt: "Document the empirical relationship: How does increasing weekly watering days from 1 to 7 overcome phenotypic stunting in carrots?",
    takeaway: "Resource constraints like water and nutrients can severely stunt physical growth, demonstrating that environment directly impacts traits.",
    canvasType: "carrot_growth"
  },

  // Module 3014: Learned Behaviors vs. Inherited Traits (SEEd 3.2.3)
  {
    id: 3014,
    code: "3.2.3",
    standard: "Utah SEEd 3.2.3 · Grade 3 · Module 3014",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Neurobehavioral Conditioning vs. Innate Instinct",
    conceptTitle: "Learned Behaviors",
    briefScenario: "Behavioral biologists replicate Pavlovian acoustic conditioning with canine cohorts, contrasting innate involuntary salivation reflexes with acquired learned behavioral responses.",
    challengeObjective: "Pair acoustic auditory stimuli with food rewards to measure the exact trials required to condition an acquired learned behavior.",
    targetVocab: ["Learned Behavior", "Conditioned Response", "Innate Reflex", "Instinct"],
    hypPrompt: "How does repeated pairing of an environmental stimulus convert a neutral cue into a learned conditioned response?",
    hypPlaceholder: "I hypothesize that repeated associative reinforcement will condition the subject to respond to the auditory bell even when...",
    stepLabels: ["1. Baseline Reflex Audit", "2. Stimulus Pairing", "3. Reinforcement Iterations", "4. Extinction Testing", "5. Associative Threshold", "6. Behavioral Synthesis"],
    leftControl: { title: "Auditory Stimulus Frequency", label: "Bell Tone Frequency (Hz)", unit: "Hz", min: 200, max: 2000, defaultVal: 880, step: 10 },
    rightControl: { title: "Reinforcement Pairing Count", label: "Training Trials (N)", unit: "trials", min: 1, max: 30, defaultVal: 10, step: 1 },
    telemetry: { label1: "Salivation Volume (ml)", label2: "Response Latency (ms)", label3: "Conditioning Index", label4: "Behavior Class" },
    video: {
      title: "Innate Instincts vs. Acquired Learned Behaviors",
      subtitle: "Examining neuro-associative learning and environmental behavioral adaptation",
      captions: [
        { start: 0, end: 5, text: "Not all organism behaviors are inherited genetically through DNA." },
        { start: 5, end: 10, text: "Innate instincts like breathing and nursing occur automatically from birth." },
        { start: 10, end: 15, text: "Learned behaviors are acquired through practice, trial, and environmental feedback." },
        { start: 15, end: 21, text: "Ivan Pavlov demonstrated conditioned learned responses in dogs using acoustic bells." },
        { start: 21, end: 30, text: "Mastering language, riding bicycles, and swimming are quintessential learned behaviors." }
      ]
    },
    quiz: [
      {
        question: "Rigorously distinguish between an 'innate instinct' and an 'acquired learned behavior' with animal examples.",
        hint: "Spiders spinning webs is innate; dogs drooling to a bell or humans riding a bicycle is learned.",
        keywords: ["learned behavior", "innate reflex", "instinct", "conditioning", "inherited", "practice"]
      },
      {
        question: "Describe the experimental protocol Ivan Pavlov utilized to prove salivation could become a conditioned response.",
        hint: "Paired the sound of a ringing bell with meat powder until the bell alone provoked salivation.",
        keywords: ["Pavlov", "learned behavior", "bell", "conditioned response", "stimulus", "salivation"]
      },
      {
        question: "Explain why an Olympic hurdle racehorse requires both inherited physical traits and years of acquired training.",
        hint: "Inherits long skeletal leg bones; acquires muscular conditioning and coordination through trained learned behavior.",
        keywords: ["inherited trait", "learned behavior", "training", "muscle", "horse", "phenotype"]
      }
    ],
    discoveryLogPrompt: "Synthesize conditioning trial data: How many repeated reinforcement trials were necessary before the acoustic cue reliably triggered the conditioned behavior?",
    takeaway: "Innate instincts are genetically inherited, whereas learned behaviors require environmental repetition, training, and synaptic reinforcement.",
    canvasType: "pavlov_dog"
  },

  // Module 3015: Physical Traits and Survival (SEEd 3.2.4)
  {
    id: 3015,
    code: "3.2.4",
    standard: "Utah SEEd 3.2.4 · Grade 3 · Module 3015",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Adaptive Camouflage & Differential Predation",
    conceptTitle: "Traits and Survival",
    briefScenario: "Forest field biologists monitor Peromyscus deer mice across varying substrate backgrounds. Melanic brown mice blend seamlessly into dark forest humus, evading nocturnal avian raptor predation.",
    challengeObjective: "Manipulate substrate color and rodent fur pigment variations to measure survival percentages under active predatory pressure.",
    targetVocab: ["Camouflage", "Predator", "Differential Survival", "Adaptation"],
    hypPrompt: "How does phenotypic fur camouflage directly influence an organism's survival probability and subsequent reproductive fitness?",
    hypPlaceholder: "I hypothesize that mice matching substrate pigmentation will evade detection by avian predators, allowing higher...",
    stepLabels: ["1. Substrate Calibration", "2. Prey Population Release", "3. Raptor Predation Run", "4. Survival Quantification", "5. Reproductive Succession", "6. Evolutionary Synthesis"],
    leftControl: { title: "Rodent Melanin Index", label: "Fur Pigment (0=Light, 100=Dark)", unit: "idx", min: 0, max: 100, defaultVal: 50, step: 1 },
    rightControl: { title: "Substrate Albedo Background", label: "Soil Color (0=Sand, 100=Soil)", unit: "albedo", min: 0, max: 100, defaultVal: 80, step: 1 },
    telemetry: { label1: "Detection Contrast", label2: "Capture Rate (%)", label3: "Survival Ratio", label4: "Offspring Yield" },
    video: {
      title: "Physical Trait Adaptations and Predatory Evasion",
      subtitle: "How morphological camouflage directly dictates differential survival and reproductive success",
      captions: [
        { start: 0, end: 5, text: "Physical variations among individuals influence survival and reproductive success." },
        { start: 5, end: 10, text: "Camouflage enables organisms to blend into background environmental substrates." },
        { start: 10, end: 15, text: "A brown mouse in a dark forest evades predatory owls better than a light mouse." },
        { start: 15, end: 21, text: "Surviving organisms mature, secure mates, and transmit adaptive traits to offspring." },
        { start: 21, end: 30, text: "Over successive generations, advantageous survival traits become predominant." }
      ]
    },
    quiz: [
      {
        question: "Define 'adaptive camouflage' and explain how it alters visual contrast for nocturnal avian predators.",
        hint: "Minimizes optical contrast between prey silhouette and background substrate, reducing predatory detection.",
        keywords: ["camouflage", "predator", "contrast", "survival", "adaptation", "detection"]
      },
      {
        question: "In the forest simulation, why did brown-furred mice produce three times more second-generation offspring than gray mice?",
        hint: "Brown mice evaded predators, survived to adulthood, and successfully reproduced.",
        keywords: ["survival", "reproduction", "offspring", "predator", "camouflage", "fitness"]
      },
      {
        question: "Besides animal camouflage, describe how botanical traits like sharp cactus spines provide defensive survival adaptations.",
        hint: "Mechanical deterrents prevent herbivores from consuming vegetative tissues and moisture reserves.",
        keywords: ["adaptation", "spine", "predator", "herbivore", "survival", "physical trait"]
      }
    ],
    discoveryLogPrompt: "Document predator capture ratios: Conclude why matching fur pigmentation to substrate albedo directly increases reproductive longevity.",
    takeaway: "Cryptic camouflage drastically lowers predatory mortality, enabling organisms to survive to maturity and successfully reproduce.",
    canvasType: "camouflage_predator"
  },

  // Module 3016: Behavioral Traits and Group Survival (SEEd 3.2.4)
  {
    id: 3016,
    code: "3.2.4",
    standard: "Utah SEEd 3.2.4 · Grade 3 · Module 3016",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Cooperative Ethology & Group Defense",
    conceptTitle: "Behavioral Traits",
    briefScenario: "Wildlife biologists in Yellowstone observe Canis lupus wolf packs coordinating hunting vectors against massive bison, while lone dispersing wolves face elevated mortality and foraging deficits.",
    challengeObjective: "Optimize pack hunting coordination and defensive perimeter formations to analyze how cooperative social behaviors enhance individual survival.",
    targetVocab: ["Behavioral Trait", "Cooperative Hunting", "Pack Dynamics", "Group Defense"],
    hypPrompt: "Why does social group formation yield higher foraging success and caloric intake per capita than solitary foraging?",
    hypPlaceholder: "I hypothesize that coordinated group behaviors allow packs to overcome defensive barriers of large prey that...",
    stepLabels: ["1. Pack Roster Formation", "2. Foraging Range Sweep", "3. Coordinated Flanking Vector", "4. Prey Encircling", "5. Caloric Sharing Audit", "6. Ethological Synthesis"],
    leftControl: { title: "Pack Group Cohort Size", label: "Pack Members (N)", unit: "wolves", min: 1, max: 12, defaultVal: 6, step: 1 },
    rightControl: { title: "Prey Biomass Mass", label: "Prey Target Mass (kg)", unit: "kg", min: 50, max: 900, defaultVal: 500, step: 25 },
    telemetry: { label1: "Hunt Success Probability", label2: "Injury Risk Index", label3: "Caloric Return / Wolf", label4: "Pack Fitness" },
    video: {
      title: "Cooperative Behavioral Adaptations in Social Organisms",
      subtitle: "Examining how pack cohesion and coordinated vigilance enhance species survival",
      captions: [
        { start: 0, end: 5, text: "Behavioral traits encompass actions organisms perform to survive." },
        { start: 5, end: 10, text: "Many carnivores and herbivores form social groups for collective advantage." },
        { start: 10, end: 15, text: "Wolf packs cooperate to encircle and capture large ungulate prey like bison." },
        { start: 15, end: 21, text: "Herds of musk oxen form defensive horns-out perimeters protecting calves." },
        { start: 21, end: 30, text: "Group behavioral adaptations dramatically reduce individual mortality rates." }
      ]
    },
    quiz: [
      {
        question: "Define a 'behavioral trait' and explain how living in a pack serves as an evolutionary survival adaptation.",
        hint: "Action-based adaptation; collective hunting, mutual defense, and shared vigilance.",
        keywords: ["behavioral trait", "pack", "survival", "cooperative", "hunting", "adaptation"]
      },
      {
        question: "Why does a solitary wolf attempting to hunt a 500 kg bison suffer a 90% failure and injury rate compared to a pack of six?",
        hint: "Bison defensive mass exceeds single-predator force capacity; packs divide attention and exhaust prey.",
        keywords: ["pack", "cooperative hunting", "prey", "bison", "injury", "mass"]
      },
      {
        question: "Describe how migrating avian flocks flying in V-formation utilize aerodynamic group behaviors to conserve metabolic energy.",
        hint: "Upwash vortex from preceding bird's wings reduces aerodynamic drag for followers.",
        keywords: ["migration", "behavioral trait", "group defense", "flock", "aerodynamic", "energy"]
      }
    ],
    discoveryLogPrompt: "Analyze the mathematical threshold: How does scaling pack size from 1 to 6 wolves dramatically flip hunting success from 10% to over 85%?",
    takeaway: "Cooperative group behaviors amplify physical capabilities, allowing social organisms to capture prey and defend against predators far beyond solitary limits.",
    canvasType: "wolf_pack_hunt"
  },

  // Module 3017: Habitats as Interdependent Systems (SEEd 3.2.5)
  {
    id: 3017,
    code: "3.2.5",
    standard: "Utah SEEd 3.2.5 · Grade 3 · Module 3017",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Ecological Niches & Morphological Adaptation",
    conceptTitle: "Habitats and Survival",
    briefScenario: "Comparative zoologists contrast Arctic snowshoe hares (Lepus americanus) with Mojave jackrabbits (Lepus californicus). Disparities in ear pinnae surface area and paw dimensions match Arctic snow versus desert heat.",
    challengeObjective: "Subject variant hare morphologies to extreme thermal and snowpack environments to prove that anatomical adaptations restrict survival to specific habitat systems.",
    targetVocab: ["Habitat System", "Morphological Adaptation", "Thermoregulation", "Ecological Niche"],
    hypPrompt: "How does the massive ear pinna surface area of a desert jackrabbit facilitate thermoregulation in arid environments while causing lethal hypothermia in Arctic tundra?",
    hypPlaceholder: "I hypothesize high surface-area ear pinnae dissipate excess vascular body heat in hot deserts, but in freezing snow...",
    stepLabels: ["1. Biome Microclimate Setup", "2. Pinnae Surface Area Test", "3. Snowpack Foot Loading", "4. Thermal Energy Loss Plot", "5. Habitat Swap Stress Test", "6. Ecosystem Synthesis"],
    leftControl: { title: "Ambient Habitat Temp", label: "Thermal Baseline (°C)", unit: "°C", min: -30, max: 45, defaultVal: 35, step: 1 },
    rightControl: { title: "Substrate Snowpack Depth", label: "Snow Depth (cm)", unit: "cm", min: 0, max: 120, defaultVal: 0, step: 5 },
    telemetry: { label1: "Core Body Temp (°C)", label2: "Thermal Loss Rate (W)", label3: "Locomotive Sinking (cm)", label4: "Survival Metric" },
    video: {
      title: "Anatomical Specialization within Habitat Systems",
      subtitle: "Why morphological traits perfectly tuned to one biome become lethal liabilities in another",
      captions: [
        { start: 0, end: 5, text: "A habitat is an interconnected system where organisms depend on environmental features." },
        { start: 5, end: 10, text: "The snowshoe hare possesses broad, padded feet acting as snowshoes across deep drifts." },
        { start: 10, end: 15, text: "Its compact rounded ears minimize vascular heat loss in Arctic sub-zero winds." },
        { start: 15, end: 21, text: "The desert jackrabbit possesses elongated ears that radiate surplus heat into arid skies." },
        { start: 21, end: 30, text: "Organisms flourish in their adapted habitat system, but perish if abruptly relocated." }
      ]
    },
    quiz: [
      {
        question: "Define 'habitat system' and explain why organisms cannot survive equally well in every global biome.",
        hint: "Organisms possess specialized anatomical traits tuned to specific temperature, moisture, and substrate niches.",
        keywords: ["habitat system", "adaptation", "survive", "biome", "system", "niche"]
      },
      {
        question: "Compare the vascular ear structures of the desert jackrabbit and the Arctic snowshoe hare in the context of thermoregulation.",
        hint: "Large desert ears vent excess heat; small Arctic ears preserve vital body heat.",
        keywords: ["thermoregulation", "ears", "jackrabbit", "snowshoe hare", "heat loss", "habitat"]
      },
      {
        question: "Using evidence from morphological adaptations, explain why a polar bear cannot survive long-term in a temperate deciduous forest.",
        hint: "Dense blubber causes overheating; white fur eliminates hunting camouflage in green forests; diet requires maritime seals.",
        keywords: ["polar bear", "habitat system", "adaptation", "blubber", "overheating", "camouflage"]
      }
    ],
    discoveryLogPrompt: "Explain what occurred during the habitat swap simulation when the desert jackrabbit was placed in -25°C snowpack.",
    takeaway: "Organisms form interdependent systems with their native habitats; morphological adaptations that ensure survival in one biome become lethal in another.",
    canvasType: "rabbit_habitat_swap"
  },

  // Module 3018: Environmental Changes and Ecosystem Impacts (SEEd 3.2.6)
  {
    id: 3018,
    code: "3.2.6",
    standard: "Utah SEEd 3.2.6 · Grade 3 · Module 3018",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Anthropogenic & Natural Ecosystem Disturbances",
    conceptTitle: "Environmental Changes",
    briefScenario: "Riparian ecologists analyze the Swaner Wetlands in Park City, tracking ecosystem restoration after historic agricultural drainage altered water tables and displaced tiger salamanders.",
    challengeObjective: "Design and implement hydrological wetland recovery solutions to restore native biodiversity after catastrophic environmental disturbance.",
    targetVocab: ["Environmental Change", "Ecosystem Disturbance", "Ecological Restoration", "Displacement"],
    hypPrompt: "How does human disruption of hydrological riparian systems impact specialized aquatic indicator species like the tiger salamander?",
    hypPlaceholder: "I hypothesize that draining riparian wetlands eliminates breeding pools, forcing amphibians to...",
    stepLabels: ["1. Disturbance Baseline", "2. Habitat Fragmentation", "3. Biodiversity Census", "4. Hydrological Restoration", "5. Species Re-colonization", "6. Conservation Synthesis"],
    leftControl: { title: "Wetland Drainage Intensity", label: "Ditch Extraction Rate (%)", unit: "%", min: 0, max: 100, defaultVal: 50, step: 1 },
    rightControl: { title: "Riparian Replanting Effort", label: "Willow Shrub Planting (N)", unit: "shrubs", min: 0, max: 1000, defaultVal: 200, step: 20 },
    telemetry: { label1: "Water Table Depth (m)", label2: "Tiger Salamander Pop", label3: "Biodiversity Index", label4: "Ecosystem Health" },
    video: {
      title: "Ecological Succession Following Environmental Disturbance",
      subtitle: "Examining natural wildfires, beaver engineering, and human-led conservation restoration",
      captions: [
        { start: 0, end: 5, text: "Environments undergo continuous changes from wildfires, droughts, and human action." },
        { start: 5, end: 10, text: "When habitats alter abruptly, some species adapt, others relocate, and many perish." },
        { start: 10, end: 15, text: "Beavers act as ecosystem engineers, damming waterways to create biodiverse ponds." },
        { start: 15, end: 21, text: "Human land development frequently fragments forests and dries critical wetlands." },
        { start: 21, end: 30, text: "Ecological restoration projects successfully rehabilitate damaged habitat systems." }
      ]
    },
    quiz: [
      {
        question: "Define 'environmental change' and provide both a natural cause (e.g., wildfire) and an anthropogenic cause (e.g., land clearing).",
        hint: "Natural: forest fires, droughts, beaver dams. Anthropogenic: urban expansion, oil spills, ditch draining.",
        keywords: ["environmental change", "wildfire", "human", "ecosystem disturbance", "habitat", "restoration"]
      },
      {
        question: "How did the 1988 Yellowstone fires trigger differential survival between mobile elk and winter-foraging moose?",
        hint: "Elk fled quickly to meadows; moose suffered winter starvation because their riparian willow food source was incinerated.",
        keywords: ["wildfire", "Yellowstone", "willow", "moose", "survival", "environmental change"]
      },
      {
        question: "Describe how citizens at the Swaner Nature Preserve in Park City engineered a solution to reverse historic wetland destruction.",
        hint: "Filled old agricultural irrigation ditches, planted native willows, and re-established tiger salamander ponds.",
        keywords: ["ecological restoration", "Swaner", "wetlands", "salamander", "ditches", "solution"]
      }
    ],
    discoveryLogPrompt: "Document the biodiversity rebound curve as riparian willow replanting and ditch closures restored wetland water tables.",
    takeaway: "Environmental disturbances radically alter species survival, but targeted ecological engineering can successfully rehabilitate degraded habitats.",
    canvasType: "wetland_restoration"
  },

  // Module 3019: Gravity and Downward Motion (SEEd 3.3.3)
  {
    id: 3019,
    code: "3.3.3",
    standard: "Utah SEEd 3.3.3 · Grade 3 · Module 3019",
    strand: "Strand 3: Force Affects Motion",
    title: "Centripetal Gravitational Acceleration",
    conceptTitle: "Gravity and Downward Motion",
    briefScenario: "Geophysicists deploy spherical Earth gravitational sensors across various continental coordinates. Regardless of surface longitude or latitude, dropped test masses accelerate radially inward toward Earth's center.",
    challengeObjective: "Release test masses at differing global coordinates to prove that 'downward' universally points toward the geometric center of spherical Earth.",
    targetVocab: ["Gravitational Force", "Center of Earth", "Radial Vector", "Acceleration"],
    hypPrompt: "Why does an observer standing in Antarctica experience the identical downward gravitational pull as an observer in the Arctic?",
    hypPlaceholder: "I hypothesize that gravitational force acts radially toward the center of the spherical Earth, so 'down' always means...",
    stepLabels: ["1. Orbital Coordinate Lock", "2. Test Mass Positioning", "3. Free-Fall Release", "4. Vector Trajectory Tracking", "5. Radial Alignment Audit", "6. Gravitational Synthesis"],
    leftControl: { title: "Planetary Coordinate Latitude", label: "Latitude Position (°)", unit: "°", min: -90, max: 90, defaultVal: 45, step: 1 },
    rightControl: { title: "Test Mass Magnitude", label: "Mass (kg)", unit: "kg", min: 1, max: 100, defaultVal: 10, step: 1 },
    telemetry: { label1: "Gravity Vector (g)", label2: "Impact Velocity (m/s)", label3: "Vector Angle to Core", label4: "Free-Fall Time" },
    video: {
      title: "Planetary Gravitational Physics on a Spherical Earth",
      subtitle: "Demonstrating why Earth's gravitational field directs all masses toward its center of gravity",
      captions: [
        { start: 0, end: 5, text: "Gravity is a fundamental non-contact force pulling matter inward." },
        { start: 5, end: 10, text: "Earth's spherical mass exerts a gravitational vector toward its center." },
        { start: 10, end: 15, text: "The term 'downward' is a local description directed toward Earth's core." },
        { start: 15, end: 21, text: "Observers in Utah, Australia, and Antarctica all experience gravity toward center." },
        { start: 21, end: 30, text: "Overcoming gravity requires applying an upward force exceeding Earth's pull." }
      ]
    },
    quiz: [
      {
        question: "Scientifically explain why people standing on the opposite side of Earth (e.g., in the Southern Hemisphere) do not fall off into space.",
        hint: "Earth's gravitational force pulls radially toward the center of the spherical Earth, defining local downward.",
        keywords: ["gravity", "center of Earth", "spherical", "downward", "force", "radial vector"]
      },
      {
        question: "When a family sleds down a steep winter hill, what force causes all members to accelerate to the bottom regardless of weight?",
        hint: "Earth's gravitational force pulls downward along the incline vector toward Earth's center.",
        keywords: ["gravity", "downward", "gravitational force", "sled", "hill", "acceleration"]
      },
      {
        question: "How do humans routinely overcome Earth's gravitational force during everyday locomotion like jumping or stair climbing?",
        hint: "Musculoskeletal upward forces exerted against the ground exceed Earth's downward gravitational pull momentarily.",
        keywords: ["overcoming gravity", "force", "jump", "upward force", "gravity", "mass"]
      }
    ],
    discoveryLogPrompt: "Analyze the radial vector plot on the spherical Earth: Prove why 'downward' vectors at +90° and -90° latitude point toward the exact same core.",
    takeaway: "Earth's gravitational force pulls all matter toward the center of the spherical Earth, establishing the universal definition of downward.",
    canvasType: "spherical_gravity"
  },

  // Module 3020: Noncontact Forces - Magnets & Static Electricity (SEEd 3.3.4 & 3.3.5)
  {
    id: 3020,
    code: "3.3.4",
    standard: "Utah SEEd 3.3.4 & 3.3.5 · Grade 3 · Module 3020",
    strand: "Strand 3: Force Affects Motion",
    title: "Noncontact Field Interactions & Magnetic Devices",
    conceptTitle: "Noncontact Forces",
    briefScenario: "High-speed Maglev transportation engineers test repulsive neodymium magnetic arrays and electrostatic charge fields to achieve wheel-less frictionless levitation.",
    challengeObjective: "Align magnetic dipoles (North-North vs North-South) and distance offsets to calculate magnetic force vector field strength without physical contact.",
    targetVocab: ["Noncontact Force", "Magnetic Field", "Poles (Attract/Repel)", "Electrostatic Force"],
    hypPrompt: "How does the distance separation between two aligned magnetic poles dictate the repulsive force vector magnitude?",
    hypPlaceholder: "I hypothesize that as the distance between identical magnetic poles decreases, the repulsive force will...",
    stepLabels: ["1. Dipole Orientation", "2. Separation Sweep", "3. Vector Field Line Plot", "4. Maglev Levitation Test", "5. Distance-Force Curve", "6. Electromagnetic Synthesis"],
    leftControl: { title: "Pole Separation Gap", label: "Distance (mm)", unit: "mm", min: 2, max: 80, defaultVal: 20, step: 1 },
    rightControl: { title: "Magnetic Dipole Strength", label: "Field Strength (Tesla)", unit: "T", min: 0.1, max: 2.0, defaultVal: 1.0, step: 0.1 },
    telemetry: { label1: "Magnetic Force (N)", label2: "Field Potential", label3: "Levitation Height", label4: "Interaction Type" },
    video: {
      title: "Noncontact Vector Fields: Magnetism and Static Electricity",
      subtitle: "Discovering how unseen vector fields exert push and pull forces across empty space",
      captions: [
        { start: 0, end: 5, text: "Forces can be categorized into contact forces and noncontact forces." },
        { start: 5, end: 10, text: "Noncontact forces like gravity, magnetism, and static electricity act at a distance." },
        { start: 10, end: 15, text: "Magnets possess north and south poles: like poles repel, opposite poles attract." },
        { start: 15, end: 21, text: "Maglev trains harness magnetic repulsion to levitate frictionless above tracks." },
        { start: 21, end: 30, text: "Noncontact field strength intensifies drastically as separation distance decreases." }
      ]
    },
    quiz: [
      {
        question: "Define a 'noncontact force' and identify three fundamental examples in nature.",
        hint: "Forces that act across empty space without physical contact: gravity, magnetism, and electric/static force.",
        keywords: ["noncontact force", "gravity", "magnetic force", "electrostatic force", "distance", "poles"]
      },
      {
        question: "Explain what occurs when two identical North magnetic poles are brought into close proximity versus a North and South pole.",
        hint: "Like poles repel (push away); opposite poles attract (pull together).",
        keywords: ["repel", "attract", "poles", "north", "south", "magnetic force"]
      },
      {
        question: "How do civil engineers utilize magnetic repulsion in roller coasters and high-speed Maglev trains to prevent collisions?",
        hint: "Mounting identical poles creates a noncontact braking force that repels moving vehicles without mechanical friction.",
        keywords: ["maglev", "magnetic device", "repel", "poles", "friction", "noncontact force"]
      }
    ],
    discoveryLogPrompt: "Document the non-linear relationship: As distance between opposing magnets halves from 40 mm to 20 mm, what happens to the repulsive force in Newtons?",
    takeaway: "Noncontact magnetic and electrostatic forces exert powerful attractive and repulsive vectors across space, intensifying sharply at close range.",
    canvasType: "magnetic_dipole_field"
  }
];
