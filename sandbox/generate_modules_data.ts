/**
 * Valley Science — Module content (kid-friendly, Grade 3 / age ~10)
 * Experiments / canvas types stay the same. Language + ~5 unit keywords only.
 */

export interface ModuleDef {
  id: number;
  code: string;
  standard: string;
  strand: string;
  title: string;
  conceptTitle: string;
  briefScenario: string;
  challengeObjective: string;
  targetVocab: string[];
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
  canvasType: string;
  obs1Prompt: string;
  step2Tutor: string;
  step3Tutor: string;
  step5Tutor: string;
  doneTutor: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: 3001,
    code: "3.3.1",
    standard: "Utah SEEd 3.3.1 · Grade 3 · Module 3001",
    strand: "Strand 3: Force Affects Motion",
    title: "Balanced Forces",
    conceptTitle: "Balanced Forces",
    briefScenario: "Two space rockets are hooked to a robot on a super-smooth track. Sometimes it zooms — sometimes it sits still even when both rockets fire!",
    challengeObjective: "Move both rocket sliders until the robot stops speeding up. That means the forces are balanced.",
    targetVocab: ["balanced forces", "net force", "cancel out", "zero", "push"],
    hypPrompt: "What will happen to the robot when both rockets pull with the exact same strength?",
    hypPlaceholder: "I think the robot will... because...",
    stepLabels: ["1. Get Ready", "2. Fire Left Rocket", "3. What Happened?", "4. Balance the Rockets", "5. Zero Net Force!", "6. What You Learned"],
    leftControl: { title: "Left Rocket", label: "Left Force", unit: "N", min: 0, max: 100, defaultVal: 0, step: 1 },
    rightControl: { title: "Right Rocket", label: "Right Force", unit: "N", min: 0, max: 100, defaultVal: 0, step: 1 },
    telemetry: { label1: "Net Force", label2: "Speed Change", label3: "Speed", label4: "How Far" },
    video: {
      title: "What Are Balanced Forces?",
      subtitle: "Equal pushes that cancel out",
      captions: [
        { start: 0, end: 5, text: "A force is a push or a pull." },
        { start: 5, end: 10, text: "Two equal pushes the other way cancel out." },
        { start: 10, end: 15, text: "When they cancel, the net force is zero." },
        { start: 15, end: 21, text: "Zero net force means no speeding up or slowing down." },
        { start: 21, end: 30, text: "That's Newton's First Law!" }
      ]
    },
    quiz: [
      {
        question: "In your own words, what does balanced forces mean? What is the net force?",
        hint: "Think about what happened when both rockets showed the same number.",
        keywords: ["equal", "same", "cancel", "zero", "balanced", "net force"]
      },
      {
        question: "A book sits still on your desk. Are the forces balanced? How do you know?",
        hint: "Is the book speeding up or slowing down?",
        keywords: ["balanced", "zero", "still", "net force", "not moving"]
      },
      {
        question: "Both rockets pulled with 60 N. Why didn't the robot speed up?",
        hint: "What is 60 minus 60?",
        keywords: ["zero", "cancel", "balanced", "equal", "opposite"]
      }
    ],
    discoveryLogPrompt: "Both rockets fire with the same strength, but the robot does not speed up. Why?",
    takeaway: "Equal pushes in opposite directions cancel out. Net force = 0 means no speeding up.",
    canvasType: "tugbot_linear",
    obs1Prompt: "The left rocket pulled hard. What do you think happens if the right rocket pulls just as hard the other way?",
    step2Tutor: "<strong>Step 2: Fire the Left Rocket!</strong><br><br>Drag the <strong>Left</strong> slider up past <strong>60</strong>. Watch which way the robot moves!",
    step3Tutor: "<strong>Look at that!</strong><br><br>The robot sped up one way. Write what you noticed below — you can still watch the experiment!",
    step5Tutor: "<strong>Balanced!</strong><br><br>Both sides match and the net force is zero. Write what you discovered.",
    doneTutor: "<strong>You did it!</strong><br><br>Equal opposite pushes cancel. Net force = 0 means no speeding up."
  },

  {
    id: 3002,
    code: "3.1.1",
    standard: "Utah SEEd 3.1.1 · Grade 3 · Module 3002",
    strand: "Strand 1: Weather and Climate",
    title: "Weather Patterns",
    conceptTitle: "Weather Patterns",
    briefScenario: "Outside your window, the sky can change fast — sunny, then rainy, then cold. Weather is what the air is doing right now.",
    challengeObjective: "Move the temperature and air-pressure sliders. Watch how rain or snow shows up.",
    targetVocab: ["weather", "temperature", "air pressure", "rain", "snow"],
    hypPrompt: "What kind of weather do you get when air pressure drops and it gets cold?",
    hypPlaceholder: "I think it will... because...",
    stepLabels: ["1. Get Ready", "2. Change Temperature", "3. What Happened?", "4. Change Pressure", "5. Weather Result", "6. What You Learned"],
    leftControl: { title: "Temperature", label: "Temp", unit: "°C", min: -20, max: 40, defaultVal: 15, step: 1 },
    rightControl: { title: "Air Pressure", label: "Pressure", unit: "kPa", min: 85, max: 105, defaultVal: 101, step: 1 },
    telemetry: { label1: "Humidity", label2: "Dew Point", label3: "Rain / Snow", label4: "Air Density" },
    video: {
      title: "What Makes Weather?",
      subtitle: "Temperature, pressure, and precipitation",
      captions: [
        { start: 0, end: 5, text: "Weather is what the air is doing today." },
        { start: 5, end: 10, text: "Air pressure pushing down can rise or fall." },
        { start: 10, end: 15, text: "Warm wet air that cools can make clouds." },
        { start: 15, end: 21, text: "Clouds can drop rain or snow." },
        { start: 21, end: 30, text: "Falling air pressure often means a storm is coming." }
      ]
    },
    quiz: [
      {
        question: "How can checking air pressure help you guess if it will rain?",
        hint: "Think about what happens when pressure goes down.",
        keywords: ["air pressure", "rain", "weather", "drop", "storm"]
      },
      {
        question: "If it is below freezing during a storm, what falls from the sky instead of rain?",
        hint: "Water can freeze into ice crystals.",
        keywords: ["snow", "freeze", "cold", "temperature", "ice"]
      },
      {
        question: "What is the difference between weather and climate in kid words?",
        hint: "Weather is today. Climate is the usual pattern for many years.",
        keywords: ["weather", "climate", "today", "years", "pattern"]
      }
    ],
    discoveryLogPrompt: "When pressure went down and it got colder, what weather did you see? Why?",
    takeaway: "Temperature and air pressure work together to make rain, snow, or clear skies.",
    canvasType: "atmosphere_cloud",
    obs1Prompt: "You changed the temperature. What changed in the sky or on the numbers?",
    step2Tutor: "<strong>Step 2: Warm it up or cool it down!</strong><br><br>Move the <strong>Temperature</strong> slider past the middle. Watch the sky!",
    step3Tutor: "<strong>Nice work watching!</strong><br><br>Write what you saw. Keep looking at the experiment while you write.",
    step5Tutor: "<strong>Weather locked in!</strong><br><br>Write how temperature and air pressure changed the weather.",
    doneTutor: "<strong>Great job!</strong><br><br>You saw how temp and pressure make different weather."
  },

  {
    id: 3003,
    code: "3.1.2",
    standard: "Utah SEEd 3.1.2 · Grade 3 · Module 3003",
    strand: "Strand 1: Weather and Climate",
    title: "Weather Tools",
    conceptTitle: "Weather Tools",
    briefScenario: "Scientists use tools to measure wind and send balloons high into the sky to learn about the air.",
    challengeObjective: "Spin up the wind tool and raise the balloon. Collect clear weather numbers.",
    targetVocab: ["anemometer", "balloon", "wind", "data", "measure"],
    hypPrompt: "What happens to your wind reading when you make the wind stronger?",
    hypPlaceholder: "I think the number will... because...",
    stepLabels: ["1. Get Ready", "2. Spin the Wind Tool", "3. What Happened?", "4. Raise the Balloon", "5. Check the Data", "6. What You Learned"],
    leftControl: { title: "Wind Speed", label: "Wind", unit: "m/s", min: 0, max: 50, defaultVal: 5, step: 1 },
    rightControl: { title: "Balloon Height", label: "Height", unit: "m", min: 0, max: 5000, defaultVal: 500, step: 50 },
    telemetry: { label1: "Wind Reading", label2: "Balloon Height", label3: "Air Temp Up High", label4: "Data Points" },
    video: {
      title: "Tools That Measure Weather",
      subtitle: "Wind cups and weather balloons",
      captions: [
        { start: 0, end: 5, text: "An anemometer spins to measure wind." },
        { start: 5, end: 10, text: "Faster spin means stronger wind." },
        { start: 10, end: 15, text: "Weather balloons carry sensors into the sky." },
        { start: 15, end: 21, text: "Sensors send data back to Earth." },
        { start: 21, end: 30, text: "Good measurements help us trust the forecast." }
      ]
    },
    quiz: [
      {
        question: "What does an anemometer measure?",
        hint: "Think about the spinning cups in the wind.",
        keywords: ["wind", "anemometer", "speed", "measure"]
      },
      {
        question: "Why send a balloon high into the sky?",
        hint: "Air high up is different from air near the ground.",
        keywords: ["balloon", "high", "data", "air", "measure"]
      },
      {
        question: "Why do scientists write down measurements carefully?",
        hint: "Mistakes in numbers can lead to wrong forecasts.",
        keywords: ["data", "measure", "accurate", "careful", "numbers"]
      }
    ],
    discoveryLogPrompt: "What did your wind tool and balloon teach you about collecting weather data?",
    takeaway: "Tools like anemometers and balloons help us measure the air so we can trust our numbers.",
    canvasType: "anemometer_station",
    obs1Prompt: "You sped up the wind. What changed on the wind reading?",
    step2Tutor: "<strong>Step 2: Make wind!</strong><br><br>Drag the <strong>Wind</strong> slider higher. Watch the cups spin.",
    step3Tutor: "<strong>Data time!</strong><br><br>Write what you saw. The experiment stays visible.",
    step5Tutor: "<strong>Nice data!</strong><br><br>Write how wind and balloon height helped you measure the air.",
    doneTutor: "<strong>Awesome!</strong><br><br>You used real weather tools to gather data."
  },

  {
    id: 3004,
    code: "3.1.3",
    standard: "Utah SEEd 3.1.3 · Grade 3 · Module 3004",
    strand: "Strand 1: Weather and Climate",
    title: "Weather Forecasts",
    conceptTitle: "Weather Forecasts",
    briefScenario: "A storm is coming toward Salt Lake City. Forecasters look at pressure and how close the front is.",
    challengeObjective: "Move the storm closer and change the pressure gap. Predict what weather arrives.",
    targetVocab: ["forecast", "air pressure", "storm", "wind", "pattern"],
    hypPrompt: "If air pressure falls fast and a storm front gets closer, what weather do you expect?",
    hypPlaceholder: "I think we will get... because...",
    stepLabels: ["1. Get Ready", "2. Move the Front", "3. What Happened?", "4. Change Pressure", "5. Make a Forecast", "6. What You Learned"],
    leftControl: { title: "Storm Distance", label: "Distance", unit: "km", min: 10, max: 300, defaultVal: 200, step: 5 },
    rightControl: { title: "Pressure Change", label: "Pressure Drop", unit: "hPa", min: 0, max: 30, defaultVal: 5, step: 1 },
    telemetry: { label1: "Storm Chance", label2: "Wind Guess", label3: "Temp Trend", label4: "Hours Away" },
    video: {
      title: "How Forecasts Work",
      subtitle: "Patterns in the numbers",
      captions: [
        { start: 0, end: 5, text: "A forecast is a smart weather guess." },
        { start: 5, end: 10, text: "Falling pressure often means a storm." },
        { start: 10, end: 15, text: "Closer storm fronts mean stronger winds." },
        { start: 15, end: 21, text: "Looking at many numbers makes better guesses." },
        { start: 21, end: 30, text: "Forecasts can be wrong — weather is tricky!" }
      ]
    },
    quiz: [
      {
        question: "What often happens to the weather when air pressure drops quickly?",
        hint: "Think storms, not sunny calm days.",
        keywords: ["pressure", "storm", "drop", "forecast", "wind"]
      },
      {
        question: "Why do forecasters look at more than one number?",
        hint: "One clue is not enough for a good guess.",
        keywords: ["forecast", "pattern", "data", "many", "numbers"]
      },
      {
        question: "If a storm is 50 km away instead of 250 km, what changes?",
        hint: "Closer usually means sooner and stronger.",
        keywords: ["closer", "storm", "sooner", "wind", "strong"]
      }
    ],
    discoveryLogPrompt: "Using distance and pressure, what forecast would you give? Why?",
    takeaway: "Forecasts use patterns in pressure, wind, and storm distance — not just one number.",
    canvasType: "isobar_map",
    obs1Prompt: "You moved the storm closer. What changed on the forecast numbers?",
    step2Tutor: "<strong>Step 2: Bring the storm closer!</strong><br><br>Slide <strong>Storm Distance</strong> down. Watch the map.",
    step3Tutor: "<strong>What did you notice?</strong><br><br>Write it down. Keep watching the map.",
    step5Tutor: "<strong>Time to forecast!</strong><br><br>Write your weather prediction and why.",
    doneTutor: "<strong>Nice forecast!</strong><br><br>You used patterns like a real weather scientist."
  },

  {
    id: 3005,
    code: "3.1.4",
    standard: "Utah SEEd 3.1.4 · Grade 3 · Module 3005",
    strand: "Strand 1: Weather and Climate",
    title: "Climate Zones",
    conceptTitle: "Climate Zones",
    briefScenario: "Near the equator it stays hot. Near the poles it stays cold. Climate is the usual weather over many years.",
    challengeObjective: "Change latitude and sunlight strength. See which climate zone you create.",
    targetVocab: ["climate", "latitude", "sunlight", "zone", "average"],
    hypPrompt: "If you move closer to the North Pole, what happens to the climate?",
    hypPlaceholder: "I think it will get... because...",
    stepLabels: ["1. Get Ready", "2. Change Latitude", "3. What Happened?", "4. Change Sunlight", "5. Name the Zone", "6. What You Learned"],
    leftControl: { title: "Latitude", label: "Latitude", unit: "°", min: 0, max: 90, defaultVal: 40, step: 1 },
    rightControl: { title: "Sunlight", label: "Sun Power", unit: "W/m²", min: 80, max: 400, defaultVal: 240, step: 5 },
    telemetry: { label1: "Avg Temp", label2: "Climate Zone", label3: "Sun Angle", label4: "Year Rain" },
    video: {
      title: "Climate vs Weather",
      subtitle: "Years of usual weather",
      captions: [
        { start: 0, end: 5, text: "Climate is the usual weather over many years." },
        { start: 5, end: 10, text: "Latitude tells how far you are from the equator." },
        { start: 10, end: 15, text: "More direct sunlight means warmer places." },
        { start: 15, end: 21, text: "Poles get weaker sunlight, so they stay cold." },
        { start: 21, end: 30, text: "Earth has different climate zones." }
      ]
    },
    quiz: [
      {
        question: "How is climate different from weather?",
        hint: "One is today. One is many years.",
        keywords: ["climate", "weather", "years", "average", "usual"]
      },
      {
        question: "Why is it hotter near the equator than near the poles?",
        hint: "Think about how sunlight hits Earth.",
        keywords: ["sunlight", "equator", "latitude", "angle", "warm"]
      },
      {
        question: "If a place is cold most years, what kind of climate zone is it?",
        hint: "Think poles and ice.",
        keywords: ["polar", "cold", "climate", "zone", "years"]
      }
    ],
    discoveryLogPrompt: "What climate zone did your latitude and sunlight create? Why does that make sense?",
    takeaway: "Climate zones depend on latitude and how strong the sunlight is over many years.",
    canvasType: "globe_insolation",
    obs1Prompt: "You changed latitude. Did it get warmer or colder? Why?",
    step2Tutor: "<strong>Step 2: Travel the globe!</strong><br><br>Move the <strong>Latitude</strong> slider toward the pole or equator.",
    step3Tutor: "<strong>Cool change!</strong><br><br>Write what happened to the climate. Keep watching.",
    step5Tutor: "<strong>Name that zone!</strong><br><br>Write which climate zone you made and why.",
    doneTutor: "<strong>Planet explorer!</strong><br><br>You linked latitude and sunlight to climate."
  },

  {
    id: 3006,
    code: "3.1.5",
    standard: "Utah SEEd 3.1.5 · Grade 3 · Module 3006",
    strand: "Strand 1: Weather and Climate",
    title: "Types of Climates",
    conceptTitle: "Types of Climates",
    briefScenario: "Deserts are dry. Rainforests are wet. Oceans nearby can make temperatures milder.",
    challengeObjective: "Change distance from the ocean and yearly rain. Match the place to a climate type.",
    targetVocab: ["desert", "tropical", "polar", "rain", "ocean"],
    hypPrompt: "If a place is far from the ocean and gets almost no rain, what climate is it?",
    hypPlaceholder: "I think it is a... because...",
    stepLabels: ["1. Get Ready", "2. Move From Ocean", "3. What Happened?", "4. Change Rain", "5. Name the Climate", "6. What You Learned"],
    leftControl: { title: "Distance to Ocean", label: "Ocean Distance", unit: "km", min: 0, max: 1500, defaultVal: 500, step: 25 },
    rightControl: { title: "Yearly Rain", label: "Rain", unit: "cm", min: 5, max: 350, defaultVal: 80, step: 5 },
    telemetry: { label1: "Climate Type", label2: "Dry / Wet", label3: "Temp Swing", label4: "Plant Clue" },
    video: {
      title: "Five Big Climate Types",
      subtitle: "Wet, dry, mild, cold",
      captions: [
        { start: 0, end: 5, text: "Earth has several main climate types." },
        { start: 5, end: 10, text: "Deserts get very little rain." },
        { start: 10, end: 15, text: "Tropical places stay warm and often wet." },
        { start: 15, end: 21, text: "Oceans help keep nearby land milder." },
        { start: 21, end: 30, text: "Polar climates stay freezing cold." }
      ]
    },
    quiz: [
      {
        question: "What climate has almost no rain?",
        hint: "Think cactus and sand.",
        keywords: ["desert", "dry", "rain", "arid"]
      },
      {
        question: "How can living near an ocean change the climate?",
        hint: "Oceans warm and cool slowly.",
        keywords: ["ocean", "mild", "temperature", "climate"]
      },
      {
        question: "What is a polar climate like?",
        hint: "Ice, cold, little plant life.",
        keywords: ["polar", "cold", "freezing", "ice"]
      }
    ],
    discoveryLogPrompt: "Which climate type matches your ocean distance and rain? Explain.",
    takeaway: "Rain amount and ocean distance help sort places into climate types like desert or tropical.",
    canvasType: "climate_zones_strip",
    obs1Prompt: "You moved farther from the ocean. What changed?",
    step2Tutor: "<strong>Step 2: Leave the coast!</strong><br><br>Drag <strong>Distance to Ocean</strong> higher.",
    step3Tutor: "<strong>Interesting!</strong><br><br>Write what changed. Keep looking at the map.",
    step5Tutor: "<strong>Classify it!</strong><br><br>Write the climate type and your reason.",
    doneTutor: "<strong>Climate sorter!</strong><br><br>You matched rain and oceans to climate types."
  },

  {
    id: 3007,
    code: "3.1.6",
    standard: "Utah SEEd 3.1.6 · Grade 3 · Module 3007",
    strand: "Strand 1: Weather and Climate",
    title: "Severe Weather",
    conceptTitle: "Severe Weather",
    briefScenario: "Some storms spin into tornadoes. Heavy rain can cause flash floods. These are dangerous.",
    challengeObjective: "Raise updraft and spin. See when a tornado or flood risk appears.",
    targetVocab: ["tornado", "flood", "severe weather", "storm", "warning"],
    hypPrompt: "What happens when a storm has a strong upward wind and lots of spin?",
    hypPlaceholder: "I think a... might form because...",
    stepLabels: ["1. Get Ready", "2. Boost Updraft", "3. What Happened?", "4. Add Spin", "5. Hazard Check", "6. What You Learned"],
    leftControl: { title: "Updraft", label: "Updraft", unit: "m/s", min: 10, max: 70, defaultVal: 35, step: 1 },
    rightControl: { title: "Spin", label: "Spin", unit: "idx", min: 50, max: 450, defaultVal: 200, step: 5 },
    telemetry: { label1: "Tornado Risk", label2: "Flood Risk", label3: "Wind Speed", label4: "Warning Level" },
    video: {
      title: "Dangerous Storms",
      subtitle: "Tornadoes and flash floods",
      captions: [
        { start: 0, end: 5, text: "Severe weather can hurt people and homes." },
        { start: 5, end: 10, text: "Strong upward winds help storms grow." },
        { start: 10, end: 15, text: "Spinning air can become a tornado." },
        { start: 15, end: 21, text: "Too much rain too fast causes flash floods." },
        { start: 21, end: 30, text: "Warnings help you get to a safe place." }
      ]
    },
    quiz: [
      {
        question: "What kind of storm is a spinning funnel cloud that touches the ground?",
        hint: "It looks like a spinning tube.",
        keywords: ["tornado", "spin", "storm", "severe"]
      },
      {
        question: "What can happen if lots of rain falls very fast?",
        hint: "Water rises quickly in streets and streams.",
        keywords: ["flood", "rain", "flash flood", "water"]
      },
      {
        question: "Where should you go during a tornado warning?",
        hint: "Think lowest floor, away from windows.",
        keywords: ["basement", "safe", "warning", "shelter", "tornado"]
      }
    ],
    discoveryLogPrompt: "When did tornado or flood risk get high? What slider settings caused it?",
    takeaway: "Strong updrafts and spin raise tornado risk. Heavy rain raises flood risk. Warnings keep you safe.",
    canvasType: "vortex_tornado",
    obs1Prompt: "You boosted the updraft. What changed in the storm?",
    step2Tutor: "<strong>Step 2: Power the storm!</strong><br><br>Raise the <strong>Updraft</strong> slider. Watch the clouds.",
    step3Tutor: "<strong>Whoa!</strong><br><br>Write what you saw. Keep watching the storm.",
    step5Tutor: "<strong>Hazard check!</strong><br><br>Write when it got dangerous and why.",
    doneTutor: "<strong>Storm smart!</strong><br><br>You learned how severe weather forms — and why warnings matter."
  },

  {
    id: 3008,
    code: "3.1.7",
    standard: "Utah SEEd 3.1.7 · Grade 3 · Module 3008",
    strand: "Strand 1: Weather and Climate",
    title: "Flood Protection",
    conceptTitle: "Flood Protection",
    briefScenario: "A river is rising. Engineers must build a barrier, but money is limited.",
    challengeObjective: "Raise flood height and spend budget on a wall. Stop the flood without going broke.",
    targetVocab: ["flood", "barrier", "budget", "prototype", "protect"],
    hypPrompt: "If the river rises higher than your wall, what happens to the town?",
    hypPlaceholder: "I think the town will... because...",
    stepLabels: ["1. Get Ready", "2. Raise the River", "3. What Happened?", "4. Build the Wall", "5. Did It Hold?", "6. What You Learned"],
    leftControl: { title: "Flood Height", label: "Water Height", unit: "m", min: 1, max: 8, defaultVal: 4, step: 0.5 },
    rightControl: { title: "Build Budget", label: "Budget", unit: "$M", min: 1, max: 6, defaultVal: 3, step: 0.5 },
    telemetry: { label1: "Wall Height", label2: "Money Left", label3: "Town Safe?", label4: "Leak Risk" },
    video: {
      title: "Building Against Floods",
      subtitle: "Goals, limits, and testing",
      captions: [
        { start: 0, end: 5, text: "A prototype is a first try of a design." },
        { start: 5, end: 10, text: "Criteria are the goals you must meet." },
        { start: 10, end: 15, text: "Constraints are the limits, like budget." },
        { start: 15, end: 21, text: "Sandbags and walls can block flood water." },
        { start: 21, end: 30, text: "Test, fix, and test again!" }
      ]
    },
    quiz: [
      {
        question: "What is a constraint in engineering?",
        hint: "Something that limits what you can do.",
        keywords: ["budget", "limit", "constraint", "money"]
      },
      {
        question: "What is a criterion (goal) for a flood wall?",
        hint: "What must the wall successfully do?",
        keywords: ["protect", "stop", "flood", "safe", "goal"]
      },
      {
        question: "Why test a prototype before building the real thing?",
        hint: "Finding problems early saves money and keeps people safer.",
        keywords: ["test", "prototype", "fix", "improve"]
      }
    ],
    discoveryLogPrompt: "Did your wall stop the flood within budget? What would you change?",
    takeaway: "Good designs meet safety goals and stay inside limits like budget.",
    canvasType: "flood_levee",
    obs1Prompt: "You raised the river. What happened to the town?",
    step2Tutor: "<strong>Step 2: Raise the river!</strong><br><br>Move <strong>Flood Height</strong> up. Watch the water.",
    step3Tutor: "<strong>Oh no!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Did the wall hold?</strong><br><br>Write whether your design worked and why.",
    doneTutor: "<strong>Engineer mode!</strong><br><br>You balanced safety goals with budget limits."
  },

  {
    id: 3009,
    code: "3.2.1",
    standard: "Utah SEEd 3.2.1 · Grade 3 · Module 3009",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Life Cycles",
    conceptTitle: "Life Cycles",
    briefScenario: "Living things are born, grow, can make babies, and eventually die. That loop is a life cycle.",
    challengeObjective: "Change food/water and baby-making rate. Keep the population going.",
    targetVocab: ["life cycle", "birth", "grow", "reproduce", "organism"],
    hypPrompt: "If animals never reproduce, what happens to the population over time?",
    hypPlaceholder: "I think the population will... because...",
    stepLabels: ["1. Get Ready", "2. Add Food & Water", "3. What Happened?", "4. Change Baby Rate", "5. Population Check", "6. What You Learned"],
    leftControl: { title: "Food & Water", label: "Nutrients", unit: "%", min: 10, max: 100, defaultVal: 70, step: 1 },
    rightControl: { title: "Baby Rate", label: "Reproduce", unit: "%", min: 0, max: 100, defaultVal: 50, step: 1 },
    telemetry: { label1: "Population", label2: "Babies Born", label3: "Growth Stage", label4: "Survival %" },
    video: {
      title: "The Life Cycle Loop",
      subtitle: "Birth, growth, babies, death",
      captions: [
        { start: 0, end: 5, text: "Every organism has a life cycle." },
        { start: 5, end: 10, text: "Living things are born and grow." },
        { start: 10, end: 15, text: "Many living things reproduce." },
        { start: 15, end: 21, text: "Babies continue the cycle." },
        { start: 21, end: 30, text: "Without babies, a group can disappear." }
      ]
    },
    quiz: [
      {
        question: "Name the main parts of a life cycle in order.",
        hint: "Start with birth.",
        keywords: ["birth", "grow", "reproduce", "death", "life cycle"]
      },
      {
        question: "Do plants and animals both have life cycles?",
        hint: "Seeds and eggs are starts of life.",
        keywords: ["yes", "plant", "animal", "life cycle", "seed"]
      },
      {
        question: "Why is reproduction important for a species?",
        hint: "Think about what happens if no babies are born.",
        keywords: ["reproduce", "babies", "continue", "survive", "population"]
      }
    ],
    discoveryLogPrompt: "How did food/water and baby rate change the population?",
    takeaway: "Life cycles keep species going: birth, growth, reproduction, and death.",
    canvasType: "life_cycle",
    obs1Prompt: "You changed food and water. What happened to the living things?",
    step2Tutor: "<strong>Step 2: Feed them!</strong><br><br>Raise <strong>Food & Water</strong>. Watch them grow.",
    step3Tutor: "<strong>Growing!</strong><br><br>Write what you noticed. Keep watching.",
    step5Tutor: "<strong>Population check!</strong><br><br>Write how the life cycle kept going — or stalled.",
    doneTutor: "<strong>Life cycle pro!</strong><br><br>You saw how birth and babies keep life going."
  },

  {
    id: 3010,
    code: "3.2.2",
    standard: "Utah SEEd 3.2.2 · Grade 3 · Module 3010",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Butterfly Metamorphosis",
    conceptTitle: "Metamorphosis",
    briefScenario: "A caterpillar does not stay a caterpillar. It changes into a butterfly through metamorphosis.",
    challengeObjective: "Change how much the caterpillar eats and hormone level. Reach the adult butterfly stage.",
    targetVocab: ["metamorphosis", "larva", "pupa", "egg", "adult"],
    hypPrompt: "What stage comes after the caterpillar before it becomes a butterfly?",
    hypPlaceholder: "I think the next stage is... because...",
    stepLabels: ["1. Get Ready", "2. Feed the Caterpillar", "3. What Happened?", "4. Change Hormones", "5. New Stage!", "6. What You Learned"],
    leftControl: { title: "Caterpillar Food", label: "Food", unit: "g", min: 0, max: 50, defaultVal: 25, step: 1 },
    rightControl: { title: "Hormone Level", label: "Hormone", unit: "µg", min: 0, max: 100, defaultVal: 50, step: 1 },
    telemetry: { label1: "Life Stage", label2: "Size", label3: "Days Left", label4: "Ready %" },
    video: {
      title: "Complete Metamorphosis",
      subtitle: "Egg → larva → pupa → adult",
      captions: [
        { start: 0, end: 5, text: "Butterflies change form completely." },
        { start: 5, end: 10, text: "The egg hatches into a larva (caterpillar)." },
        { start: 10, end: 15, text: "The pupa is a resting change stage." },
        { start: 15, end: 21, text: "Inside the pupa, the body rebuilds." },
        { start: 21, end: 30, text: "An adult butterfly comes out with wings." }
      ]
    },
    quiz: [
      {
        question: "List the four stages of complete metamorphosis.",
        hint: "Egg is first.",
        keywords: ["egg", "larva", "pupa", "adult", "metamorphosis"]
      },
      {
        question: "What is another name for the butterfly pupa stage?",
        hint: "It often hangs in a hard case.",
        keywords: ["chrysalis", "pupa", "case"]
      },
      {
        question: "Why must a caterpillar eat a lot?",
        hint: "Growing and changing takes energy.",
        keywords: ["food", "grow", "energy", "larva", "eat"]
      }
    ],
    discoveryLogPrompt: "Which settings helped the caterpillar reach the butterfly stage? Why?",
    takeaway: "Metamorphosis is a big body change: egg, larva, pupa, adult.",
    canvasType: "butterfly_morph",
    obs1Prompt: "You fed the caterpillar more. What changed?",
    step2Tutor: "<strong>Step 2: Feed the larva!</strong><br><br>Raise <strong>Caterpillar Food</strong>. Watch it grow.",
    step3Tutor: "<strong>Growing fast!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Stage change!</strong><br><br>Write which stage you reached and how.",
    doneTutor: "<strong>Butterfly scientist!</strong><br><br>You guided complete metamorphosis."
  },

  {
    id: 3011,
    code: "3.2.3",
    standard: "Utah SEEd 3.2.3 · Grade 3 · Module 3011",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Inherited Traits",
    conceptTitle: "Inherited Traits",
    briefScenario: "Baby animals often look like their parents. Traits like fur color can be passed down.",
    challengeObjective: "Set mom and dad trait sliders. See what the baby looks like.",
    targetVocab: ["inherit", "trait", "offspring", "parent", "genes"],
    hypPrompt: "If both parents have dark fur, what fur do you expect in the baby?",
    hypPlaceholder: "I think the baby will have... because...",
    stepLabels: ["1. Get Ready", "2. Set Mom Trait", "3. What Happened?", "4. Set Dad Trait", "5. Baby Traits", "6. What You Learned"],
    leftControl: { title: "Mom Trait", label: "Mom Color", unit: "%", min: 0, max: 100, defaultVal: 40, step: 1 },
    rightControl: { title: "Dad Trait", label: "Dad Color", unit: "%", min: 0, max: 100, defaultVal: 80, step: 1 },
    telemetry: { label1: "Baby Color", label2: "From Mom", label3: "From Dad", label4: "Match Score" },
    video: {
      title: "Traits From Parents",
      subtitle: "What babies inherit",
      captions: [
        { start: 0, end: 5, text: "A trait is a feature of a living thing." },
        { start: 5, end: 10, text: "Some traits come from parents." },
        { start: 10, end: 15, text: "Offspring means the babies." },
        { start: 15, end: 21, text: "Fur color can be inherited." },
        { start: 21, end: 30, text: "Family patterns help us see inheritance." }
      ]
    },
    quiz: [
      {
        question: "What does it mean to inherit a trait?",
        hint: "It comes from mom and/or dad.",
        keywords: ["inherit", "parent", "offspring", "trait", "from"]
      },
      {
        question: "Give one example of an inherited trait.",
        hint: "Think eye color, fur color, or leaf shape.",
        keywords: ["color", "fur", "eyes", "trait", "inherit"]
      },
      {
        question: "Can a baby plant inherit traits from parent plants?",
        hint: "Seeds carry parent information.",
        keywords: ["yes", "plant", "seed", "inherit", "parent"]
      }
    ],
    discoveryLogPrompt: "How did mom and dad traits show up in the offspring?",
    takeaway: "Offspring inherit traits from their parents.",
    canvasType: "primate_pedigree",
    obs1Prompt: "You changed the mom trait. What changed for the family?",
    step2Tutor: "<strong>Step 2: Set mom's trait!</strong><br><br>Move the <strong>Mom</strong> slider. Watch the family chart.",
    step3Tutor: "<strong>Family clue!</strong><br><br>Write what you noticed. Keep watching.",
    step5Tutor: "<strong>Baby check!</strong><br><br>Write how the offspring got traits from parents.",
    doneTutor: "<strong>Inheritance detective!</strong><br><br>You tracked traits from parents to babies."
  },

  {
    id: 3012,
    code: "3.2.4",
    standard: "Utah SEEd 3.2.4 · Grade 3 · Module 3012",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Variation in a Species",
    conceptTitle: "Variation",
    briefScenario: "Even in one field of sunflowers, some are taller and some are shorter. That difference is variation.",
    challengeObjective: "Change genetic mix and sample size. See how spread-out the heights become.",
    targetVocab: ["variation", "trait", "species", "difference", "sample"],
    hypPrompt: "If you look at more plants, do you expect more differences or fewer?",
    hypPlaceholder: "I think I will see... because...",
    stepLabels: ["1. Get Ready", "2. Mix Genes", "3. What Happened?", "4. Grow Sample Size", "5. Spot Variation", "6. What You Learned"],
    leftControl: { title: "Gene Mix", label: "Mix", unit: "%", min: 0, max: 100, defaultVal: 50, step: 1 },
    rightControl: { title: "Sample Size", label: "Plants", unit: "N", min: 10, max: 500, defaultVal: 100, step: 10 },
    telemetry: { label1: "Avg Height", label2: "Shortest", label3: "Tallest", label4: "Spread" },
    video: {
      title: "Why Siblings Differ",
      subtitle: "Variation inside a species",
      captions: [
        { start: 0, end: 5, text: "Variation means differences in traits." },
        { start: 5, end: 10, text: "Members of one species are not identical." },
        { start: 10, end: 15, text: "Gene mixing creates unique combinations." },
        { start: 15, end: 21, text: "Bigger samples show the full range." },
        { start: 21, end: 30, text: "Variation helps some survive when conditions change." }
      ]
    },
    quiz: [
      {
        question: "What is variation?",
        hint: "Differences between living things of the same kind.",
        keywords: ["difference", "variation", "trait", "same species"]
      },
      {
        question: "Can two puppies from the same litter look different?",
        hint: "Yes — variation is normal.",
        keywords: ["yes", "variation", "different", "litter", "trait"]
      },
      {
        question: "Why look at many plants instead of one?",
        hint: "One plant cannot show the whole pattern.",
        keywords: ["sample", "many", "pattern", "variation", "range"]
      }
    ],
    discoveryLogPrompt: "How did gene mix and sample size change the height spread?",
    takeaway: "Variation means individuals of the same species can have different traits.",
    canvasType: "sunflower_bellcurve",
    obs1Prompt: "You changed the gene mix. What happened to the height differences?",
    step2Tutor: "<strong>Step 2: Mix it up!</strong><br><br>Move the <strong>Gene Mix</strong> slider. Watch the chart.",
    step3Tutor: "<strong>Differences!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Variation spotted!</strong><br><br>Write how spread-out the traits became.",
    doneTutor: "<strong>Variation expert!</strong><br><br>You proved same species can look different."
  },

  {
    id: 3013,
    code: "3.2.5",
    standard: "Utah SEEd 3.2.5 · Grade 3 · Module 3013",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Environment Changes Traits",
    conceptTitle: "Environment & Traits",
    briefScenario: "Same carrot seeds, two gardens: one watered well, one too dry. The plants grow differently.",
    challengeObjective: "Change watering days and soil nutrients. See how plant size changes.",
    targetVocab: ["environment", "water", "nutrient", "growth", "trait"],
    hypPrompt: "If you water a plant much less, what happens to its growth?",
    hypPlaceholder: "I think the plant will... because...",
    stepLabels: ["1. Get Ready", "2. Change Watering", "3. What Happened?", "4. Change Nutrients", "5. Compare Plants", "6. What You Learned"],
    leftControl: { title: "Watering Days", label: "Water Days", unit: "days", min: 1, max: 7, defaultVal: 4, step: 1 },
    rightControl: { title: "Soil Nutrients", label: "Nutrients", unit: "%", min: 10, max: 100, defaultVal: 60, step: 1 },
    telemetry: { label1: "Plant Height", label2: "Root Size", label3: "Health", label4: "Color" },
    video: {
      title: "Environment Can Change Growth",
      subtitle: "Same genes, different care",
      captions: [
        { start: 0, end: 5, text: "Not all traits come only from parents." },
        { start: 5, end: 10, text: "The environment can change how a plant grows." },
        { start: 10, end: 15, text: "Water and nutrients matter a lot." },
        { start: 15, end: 21, text: "Too little water can make plants smaller." },
        { start: 21, end: 30, text: "Same seeds can look different in different places." }
      ]
    },
    quiz: [
      {
        question: "Give one environmental thing that can change a plant's size.",
        hint: "Think water, sunlight, or soil food.",
        keywords: ["water", "nutrient", "sunlight", "environment", "soil"]
      },
      {
        question: "If two plants have the same parents but different watering, can they look different?",
        hint: "Yes — environment matters.",
        keywords: ["yes", "environment", "water", "different", "growth"]
      },
      {
        question: "Is plant height always only from genes?",
        hint: "Care and environment also matter.",
        keywords: ["no", "environment", "water", "genes", "both"]
      }
    ],
    discoveryLogPrompt: "How did water and nutrients change your plants?",
    takeaway: "The environment can change how traits show up, even with the same parents.",
    canvasType: "carrot_growth",
    obs1Prompt: "You changed watering. What happened to the plant?",
    step2Tutor: "<strong>Step 2: Change the water!</strong><br><br>Move <strong>Watering Days</strong>. Watch the carrots.",
    step3Tutor: "<strong>See the difference?</strong><br><br>Write what changed. Keep watching.",
    step5Tutor: "<strong>Compare!</strong><br><br>Write how environment changed growth.",
    doneTutor: "<strong>Garden scientist!</strong><br><br>You showed environment changes traits."
  },

  {
    id: 3014,
    code: "3.2.6",
    standard: "Utah SEEd 3.2.6 · Grade 3 · Module 3014",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Learned vs Instinct",
    conceptTitle: "Learned Behavior",
    briefScenario: "Some actions are built-in (instinct). Others are learned by practice, like a dog learning a bell means food.",
    challengeObjective: "Change the bell sound and training trials. See when the learned response appears.",
    targetVocab: ["learned", "instinct", "training", "behavior", "practice"],
    hypPrompt: "If you pair a bell with food many times, what might the dog do when it hears the bell alone?",
    hypPlaceholder: "I think the dog will... because...",
    stepLabels: ["1. Get Ready", "2. Set the Bell", "3. What Happened?", "4. Add Training Trials", "5. Learned Check", "6. What You Learned"],
    leftControl: { title: "Bell Pitch", label: "Bell Hz", unit: "Hz", min: 200, max: 2000, defaultVal: 880, step: 10 },
    rightControl: { title: "Training Trials", label: "Trials", unit: "N", min: 1, max: 30, defaultVal: 10, step: 1 },
    telemetry: { label1: "Learned %", label2: "Instinct Score", label3: "Trials Done", label4: "Response" },
    video: {
      title: "Instinct vs Learned",
      subtitle: "Born knowing vs practice",
      captions: [
        { start: 0, end: 5, text: "Instincts are behaviors animals are born with." },
        { start: 5, end: 10, text: "Learned behaviors come from practice." },
        { start: 10, end: 15, text: "Training pairs a signal with a reward." },
        { start: 15, end: 21, text: "More practice can strengthen learning." },
        { start: 21, end: 30, text: "Both instinct and learning help survival." }
      ]
    },
    quiz: [
      {
        question: "What is an instinct?",
        hint: "A behavior you do not need to be taught.",
        keywords: ["instinct", "born", "automatic", "not learned"]
      },
      {
        question: "What is a learned behavior?",
        hint: "Something practiced or taught.",
        keywords: ["learned", "practice", "training", "teach"]
      },
      {
        question: "Why do more training trials often help?",
        hint: "Practice makes the link stronger.",
        keywords: ["practice", "trials", "learn", "stronger", "repeat"]
      }
    ],
    discoveryLogPrompt: "When did the learned response show up? How is that different from instinct?",
    takeaway: "Instincts are built-in. Learned behaviors come from practice and training.",
    canvasType: "pavlov_dog",
    obs1Prompt: "You changed the bell. What did the dog do at first?",
    step2Tutor: "<strong>Step 2: Set the bell!</strong><br><br>Move the <strong>Bell</strong> slider. Watch the dog.",
    step3Tutor: "<strong>Interesting reaction!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Learned or instinct?</strong><br><br>Write what changed after more trials.",
    doneTutor: "<strong>Behavior buddy!</strong><br><br>You compared learned behavior with instinct."
  },

  {
    id: 3015,
    code: "3.2.7",
    standard: "Utah SEEd 3.2.7 · Grade 3 · Module 3015",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Camouflage",
    conceptTitle: "Camouflage",
    briefScenario: "Mice that blend into the ground are harder for hawks to see. Camouflage can help survival.",
    challengeObjective: "Match fur color to the ground. Raise the survival chance.",
    targetVocab: ["camouflage", "predator", "survive", "blend", "adaptation"],
    hypPrompt: "If a mouse is dark brown on dark soil, will more or fewer mice get caught?",
    hypPlaceholder: "I think fewer mice get caught because...",
    stepLabels: ["1. Get Ready", "2. Change Fur Color", "3. What Happened?", "4. Change Ground Color", "5. Survival Score", "6. What You Learned"],
    leftControl: { title: "Fur Color", label: "Fur", unit: "idx", min: 0, max: 100, defaultVal: 50, step: 1 },
    rightControl: { title: "Ground Color", label: "Ground", unit: "idx", min: 0, max: 100, defaultVal: 80, step: 1 },
    telemetry: { label1: "Match %", label2: "Caught", label3: "Survived", label4: "Hunt Time" },
    video: {
      title: "Blend In to Survive",
      subtitle: "Camouflage and predators",
      captions: [
        { start: 0, end: 5, text: "Camouflage means blending into the background." },
        { start: 5, end: 10, text: "Predators hunt for food." },
        { start: 10, end: 15, text: "Hard-to-see prey survive more often." },
        { start: 15, end: 21, text: "Matching colors is an adaptation." },
        { start: 21, end: 30, text: "Traits that help survival can become common." }
      ]
    },
    quiz: [
      {
        question: "What is camouflage?",
        hint: "Looking like the background.",
        keywords: ["blend", "camouflage", "hide", "background"]
      },
      {
        question: "How can camouflage help an animal survive?",
        hint: "Predators have a harder time finding it.",
        keywords: ["predator", "survive", "hide", "catch", "harder"]
      },
      {
        question: "If ground color changes, what should fur color do to stay safe?",
        hint: "Match the new background.",
        keywords: ["match", "blend", "camouflage", "ground", "color"]
      }
    ],
    discoveryLogPrompt: "Which fur and ground combo survived best? Why?",
    takeaway: "Camouflage helps animals avoid predators by blending in.",
    canvasType: "camouflage_predator",
    obs1Prompt: "You changed fur color. Did more mice get caught or fewer?",
    step2Tutor: "<strong>Step 2: Recolor the fur!</strong><br><br>Move <strong>Fur Color</strong>. Watch the hawk hunt.",
    step3Tutor: "<strong>Hunt results!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Survival score!</strong><br><br>Write which match worked best.",
    doneTutor: "<strong>Camouflage champ!</strong><br><br>You linked blending in to survival."
  },

  {
    id: 3016,
    code: "3.2.8",
    standard: "Utah SEEd 3.2.8 · Grade 3 · Module 3016",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Working in Groups",
    conceptTitle: "Group Behavior",
    briefScenario: "Wolves that hunt together can take down bigger prey than a lone wolf.",
    challengeObjective: "Change pack size and prey size. See when teamwork succeeds.",
    targetVocab: ["group", "cooperate", "pack", "prey", "survive"],
    hypPrompt: "Is a lone wolf or a pack more likely to catch a huge bison?",
    hypPlaceholder: "I think the... because...",
    stepLabels: ["1. Get Ready", "2. Grow the Pack", "3. What Happened?", "4. Change Prey Size", "5. Teamwork Check", "6. What You Learned"],
    leftControl: { title: "Pack Size", label: "Wolves", unit: "N", min: 1, max: 12, defaultVal: 6, step: 1 },
    rightControl: { title: "Prey Size", label: "Prey Mass", unit: "kg", min: 50, max: 900, defaultVal: 500, step: 25 },
    telemetry: { label1: "Hunt Success", label2: "Energy Used", label3: "Food Share", label4: "Risk" },
    video: {
      title: "Teamwork Helps Survival",
      subtitle: "Group hunting and defense",
      captions: [
        { start: 0, end: 5, text: "Some animals live and hunt in groups." },
        { start: 5, end: 10, text: "Cooperating means working together." },
        { start: 10, end: 15, text: "A pack can catch bigger prey." },
        { start: 15, end: 21, text: "Groups can also watch for danger." },
        { start: 21, end: 30, text: "Teamwork is a helpful behavior trait." }
      ]
    },
    quiz: [
      {
        question: "How can hunting in a group help wolves?",
        hint: "Think bigger prey and shared work.",
        keywords: ["group", "cooperate", "prey", "together", "pack"]
      },
      {
        question: "What is a downside of a very small pack vs huge prey?",
        hint: "They may fail or get hurt.",
        keywords: ["fail", "danger", "too small", "risk", "prey"]
      },
      {
        question: "Name one way group living helps besides hunting.",
        hint: "Watching for predators, caring for young.",
        keywords: ["watch", "protect", "warn", "care", "defend"]
      }
    ],
    discoveryLogPrompt: "When did the pack succeed? How did pack size and prey size matter?",
    takeaway: "Cooperating in a group can help animals survive and catch food.",
    canvasType: "wolf_pack_hunt",
    obs1Prompt: "You grew the pack. What changed in the hunt?",
    step2Tutor: "<strong>Step 2: Add wolves!</strong><br><br>Raise <strong>Pack Size</strong>. Watch the hunt.",
    step3Tutor: "<strong>Teamwork?</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Results!</strong><br><br>Write when cooperation worked best.",
    doneTutor: "<strong>Pack leader!</strong><br><br>You saw how group behavior helps survival."
  },

  {
    id: 3017,
    code: "3.2.9",
    standard: "Utah SEEd 3.2.9 · Grade 3 · Module 3017",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Habitat Fit",
    conceptTitle: "Habitat Fit",
    briefScenario: "Arctic hares and desert jackrabbits have different ears and feet that fit their homes.",
    challengeObjective: "Change temperature and snow depth. See which rabbit body plan thrives.",
    targetVocab: ["habitat", "adapt", "survive", "temperature", "snow"],
    hypPrompt: "Would big thin ears help more in a hot desert or a freezing snowy place?",
    hypPlaceholder: "I think big ears help more in... because...",
    stepLabels: ["1. Get Ready", "2. Change Temperature", "3. What Happened?", "4. Change Snow", "5. Who Survives?", "6. What You Learned"],
    leftControl: { title: "Temperature", label: "Temp", unit: "°C", min: -30, max: 45, defaultVal: 35, step: 1 },
    rightControl: { title: "Snow Depth", label: "Snow", unit: "cm", min: 0, max: 120, defaultVal: 0, step: 5 },
    telemetry: { label1: "Arctic Hare OK", label2: "Desert Hare OK", label3: "Heat Stress", label4: "Cold Stress" },
    video: {
      title: "Bodies Match Habitats",
      subtitle: "Adaptations fit the home",
      captions: [
        { start: 0, end: 5, text: "A habitat is where an organism lives." },
        { start: 5, end: 10, text: "Adaptations help survival in that place." },
        { start: 10, end: 15, text: "Big ears can release heat in deserts." },
        { start: 15, end: 21, text: "Wide feet help walk on snow." },
        { start: 21, end: 30, text: "A great desert body can fail in the Arctic." }
      ]
    },
    quiz: [
      {
        question: "What is a habitat?",
        hint: "The place where a living thing lives.",
        keywords: ["habitat", "home", "live", "place"]
      },
      {
        question: "Why might desert rabbits have bigger ears?",
        hint: "Think about cooling off.",
        keywords: ["heat", "cool", "desert", "ears", "adapt"]
      },
      {
        question: "Can an animal adapted to snow struggle in a hot desert?",
        hint: "Yes — the wrong body for the place.",
        keywords: ["yes", "habitat", "adapt", "struggle", "survive"]
      }
    ],
    discoveryLogPrompt: "Which rabbit did better in heat vs snow? Why?",
    takeaway: "Body traits that fit a habitat help survival — and can fail in the wrong place.",
    canvasType: "rabbit_habitat_swap",
    obs1Prompt: "You changed temperature. Which rabbit looked healthier?",
    step2Tutor: "<strong>Step 2: Change the weather!</strong><br><br>Move <strong>Temperature</strong>. Watch both rabbits.",
    step3Tutor: "<strong>Habitat stress!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Who fits?</strong><br><br>Write which body plan matched each habitat.",
    doneTutor: "<strong>Habitat hero!</strong><br><br>You matched adaptations to homes."
  },

  {
    id: 3018,
    code: "3.2.10",
    standard: "Utah SEEd 3.2.10 · Grade 3 · Module 3018",
    strand: "Strand 2: Effects of Traits on Survival",
    title: "Ecosystem Change",
    conceptTitle: "Ecosystem Change",
    briefScenario: "Draining a wetland hurts animals that need wet homes. Planting willows can help heal it.",
    challengeObjective: "Change drainage and replanting. Restore a healthier wetland.",
    targetVocab: ["ecosystem", "disturbance", "restore", "wetland", "habitat"],
    hypPrompt: "If you drain more water from a wetland, what happens to wetland animals?",
    hypPlaceholder: "I think they will... because...",
    stepLabels: ["1. Get Ready", "2. Drain Water", "3. What Happened?", "4. Replant Willows", "5. Recovery Check", "6. What You Learned"],
    leftControl: { title: "Drainage", label: "Drain %", unit: "%", min: 0, max: 100, defaultVal: 50, step: 1 },
    rightControl: { title: "Replanting", label: "Willows", unit: "N", min: 0, max: 1000, defaultVal: 200, step: 20 },
    telemetry: { label1: "Water Level", label2: "Animal Count", label3: "Plant Cover", label4: "Health" },
    video: {
      title: "When Ecosystems Change",
      subtitle: "Damage and repair",
      captions: [
        { start: 0, end: 5, text: "An ecosystem is living and nonliving parts together." },
        { start: 5, end: 10, text: "A disturbance can suddenly change a habitat." },
        { start: 10, end: 15, text: "Draining wetlands removes homes for animals." },
        { start: 15, end: 21, text: "Restoration means helping nature heal." },
        { start: 21, end: 30, text: "Planting and water care can bring animals back." }
      ]
    },
    quiz: [
      {
        question: "What is an ecosystem disturbance?",
        hint: "A change that shakes up the habitat.",
        keywords: ["change", "disturbance", "habitat", "damage"]
      },
      {
        question: "How can people help restore a wetland?",
        hint: "Think water and plants.",
        keywords: ["restore", "plant", "water", "willow", "help"]
      },
      {
        question: "Why do wetland animals struggle if water disappears?",
        hint: "Their habitat needs water.",
        keywords: ["habitat", "water", "home", "survive", "wetland"]
      }
    ],
    discoveryLogPrompt: "How did drainage and replanting change wetland health?",
    takeaway: "Disturbances can hurt ecosystems, but careful restoration can help them recover.",
    canvasType: "wetland_restoration",
    obs1Prompt: "You increased drainage. What happened to the wetland?",
    step2Tutor: "<strong>Step 2: Drain the wetland!</strong><br><br>Raise <strong>Drainage</strong>. Watch the animals.",
    step3Tutor: "<strong>Habitat hurt!</strong><br><br>Write what you saw. Keep watching.",
    step5Tutor: "<strong>Recovery check!</strong><br><br>Write whether replanting helped and why.",
    doneTutor: "<strong>Restoration ranger!</strong><br><br>You saw damage — and how healing can start."
  },

  {
    id: 3019,
    code: "3.3.3",
    standard: "Utah SEEd 3.3.3 · Grade 3 · Module 3019",
    strand: "Strand 3: Force Affects Motion",
    title: "Gravity Pulls Down",
    conceptTitle: "Gravity",
    briefScenario: "Drop a ball in Utah or Antarctica — it still falls 'down.' Down means toward Earth's center.",
    challengeObjective: "Change latitude and mass. Prove everything falls toward Earth's center.",
    targetVocab: ["gravity", "down", "Earth", "center", "fall"],
    hypPrompt: "Why don't people in Australia fall off Earth into space?",
    hypPlaceholder: "I think gravity pulls them... because...",
    stepLabels: ["1. Get Ready", "2. Pick a Spot", "3. What Happened?", "4. Change Mass", "5. Where Is Down?", "6. What You Learned"],
    leftControl: { title: "Latitude", label: "Latitude", unit: "°", min: -90, max: 90, defaultVal: 45, step: 1 },
    rightControl: { title: "Test Mass", label: "Mass", unit: "kg", min: 1, max: 100, defaultVal: 10, step: 1 },
    telemetry: { label1: "g Pull", label2: "Fall Speed", label3: "Toward Center?", label4: "Fall Time" },
    video: {
      title: "Gravity and Down",
      subtitle: "Toward the center of Earth",
      captions: [
        { start: 0, end: 5, text: "Gravity is a pull between masses." },
        { start: 5, end: 10, text: "Earth pulls things toward its center." },
        { start: 10, end: 15, text: "'Down' means toward Earth's center." },
        { start: 15, end: 21, text: "People everywhere feel gravity toward the center." },
        { start: 21, end: 30, text: "Jumping up needs a force bigger than gravity for a moment." }
      ]
    },
    quiz: [
      {
        question: "What does gravity do to objects near Earth?",
        hint: "It pulls them.",
        keywords: ["pull", "gravity", "down", "center", "Earth"]
      },
      {
        question: "Why is 'down' different directions in Utah vs Australia, but both make sense?",
        hint: "Both point toward Earth's center.",
        keywords: ["center", "Earth", "down", "gravity", "sphere"]
      },
      {
        question: "When you jump, how do you briefly overcome gravity?",
        hint: "Your legs push up hard.",
        keywords: ["push", "up", "force", "jump", "legs"]
      }
    ],
    discoveryLogPrompt: "At different latitudes, which way did the mass fall? Toward what?",
    takeaway: "Gravity pulls toward Earth's center — that is what 'down' means everywhere.",
    canvasType: "spherical_gravity",
    obs1Prompt: "You picked a new spot on Earth. Which way did the mass fall?",
    step2Tutor: "<strong>Step 2: Pick a place on Earth!</strong><br><br>Move <strong>Latitude</strong>. Drop the mass.",
    step3Tutor: "<strong>Falling!</strong><br><br>Write which way is down. Keep watching.",
    step5Tutor: "<strong>Where is down?</strong><br><br>Write what 'down' means on a round Earth.",
    doneTutor: "<strong>Gravity genius!</strong><br><br>You proved down points to Earth's center."
  },

  {
    id: 3020,
    code: "3.3.4",
    standard: "Utah SEEd 3.3.4 & 3.3.5 · Grade 3 · Module 3020",
    strand: "Strand 3: Force Affects Motion",
    title: "Magnets Push & Pull",
    conceptTitle: "Noncontact Forces",
    briefScenario: "Magnets can push or pull without touching. Closer magnets feel stronger forces.",
    challengeObjective: "Change distance and magnet strength. Watch attraction or repulsion without contact.",
    targetVocab: ["magnet", "attract", "repel", "force", "distance"],
    hypPrompt: "What happens to the push/pull when two magnets get closer?",
    hypPlaceholder: "I think the force gets... because...",
    stepLabels: ["1. Get Ready", "2. Change Distance", "3. What Happened?", "4. Change Strength", "5. Force Check", "6. What You Learned"],
    leftControl: { title: "Distance", label: "Gap", unit: "mm", min: 2, max: 80, defaultVal: 20, step: 1 },
    rightControl: { title: "Magnet Strength", label: "Strength", unit: "T", min: 0.1, max: 2.0, defaultVal: 1.0, step: 0.1 },
    telemetry: { label1: "Force", label2: "Attract/Repel", label3: "Lift Height", label4: "Field Feel" },
    video: {
      title: "Forces Without Touching",
      subtitle: "Magnets and static",
      captions: [
        { start: 0, end: 5, text: "Some forces work without touching." },
        { start: 5, end: 10, text: "Magnets can attract or repel." },
        { start: 10, end: 15, text: "Like poles push; opposite poles pull." },
        { start: 15, end: 21, text: "Closer magnets mean stronger force." },
        { start: 21, end: 30, text: "Maglev trains use magnetic push to float." }
      ]
    },
    quiz: [
      {
        question: "What is a noncontact force?",
        hint: "A force that works without touching.",
        keywords: ["without touching", "magnet", "gravity", "distance", "force"]
      },
      {
        question: "What do two North poles do to each other?",
        hint: "Like poles...",
        keywords: ["repel", "push", "north", "like"]
      },
      {
        question: "What happens to magnetic force when magnets move closer?",
        hint: "It usually gets stronger.",
        keywords: ["stronger", "closer", "force", "distance", "increase"]
      }
    ],
    discoveryLogPrompt: "How did distance and strength change the magnetic force?",
    takeaway: "Magnets push and pull without touching. Closer and stronger magnets make bigger forces.",
    canvasType: "magnetic_poles",
    obs1Prompt: "You changed the distance. Did the force get stronger or weaker?",
    step2Tutor: "<strong>Step 2: Move the magnets!</strong><br><br>Slide <strong>Distance</strong> closer. Watch the force.",
    step3Tutor: "<strong>Feel that pull?</strong><br><br>Write what happened. Keep watching — no blur!",
    step5Tutor: "<strong>Force check!</strong><br><br>Write how distance and strength changed the push or pull.",
    doneTutor: "<strong>Magnet master!</strong><br><br>You explored forces that work without touching."
  }
];
