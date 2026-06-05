import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { UnoAvrRunner } from './avr/unoAvrRunner.js';
import { compileArduinoSketch} from './avr/avr8Compiler.js';
import { ArduinoUnoSimulator, } from './avr/avr8Simulator.js';

const BREADBOARD_PITCH = 2.54;
const SNAP_DISTANCE = 4.4;
const CABLE_EXIT_OFFSET = 14.85;
const CABLE_RADIUS = 0.9;
const DEG_TO_RAD = Math.PI / 180;
const PLUG_INSERTION_DEPTH = 3.2;
const DEFAULT_PART_SURFACE_LIFT = 0.14;
const WORKSPACE_WIRE_BASE_HEIGHT = 1.9;
const PART_LEAD_HANDLE_RADIUS = 0.76;
const PART_START_LEAD_COLOR = 0x40d6b1;
const PART_END_LEAD_COLOR = 0x7ed2ff;
const POSITION_LIMIT = 220;
const SURFACE_SIZE_LIMIT = 220;
const BREADBOARD_TERMINAL_COLUMNS = 30;
const CABLE_STRAIN_RELIEF_LENGTH = 6.5;
const CABLE_END_BEND_LIFT = 2.0;
const DEFAULT_WIRE_COLOR = 0xff6d2e;
const RANDOM_WIRE_COLOR_PALETTE = [
  0xef4444,
  0xf97316,
  0xfacc15,
  0x22c55e,
  0x14b8a6,
  0x38bdf8,
  0x6366f1,
  0xa855f7,
  0xec4899,
];
const LOOSE_WIRE_SPAWN_LIFT = 8.5;
const LOOSE_WIRE_SPAWN_HALF_SPAN = 11.5;
const LOOSE_WIRE_SPAWN_SKEW = 4.5;
const LOOSE_WIRE_SPAWN_COLUMNS = 3;
const LOOSE_WIRE_SPAWN_ROWS = 3;
const ENABLE_PART_LEAD_REDRAG = false;
const PART_ROTATION_STEP_DEGREES = 45;
const PART_REDRAG_SNAP_END = 'start';
const PART_BODY_HITBOX_PADDING = 3.5;
const PART_BODY_HITBOX_MIN_SIZE = 8;
const PART_INSERTION_LIFT = 4.0;
const PART_INSERTION_DURATION = 0.16;
const PART_INSERTION_DEPTH = 2.2;
// The imported breadboard surface is mirrored across the cross-board axis
// relative to the usual A-J lettering order, so the label assignment has to
// run right-to-left for the UI/status readout to match the visible holes.
const BREADBOARD_LEFT_ROW_LABELS = ['J', 'I', 'H', 'G', 'F'];
const BREADBOARD_RIGHT_ROW_LABELS = ['E', 'D', 'C', 'B', 'A'];
const BREADBOARD_ROW_GAP_HALF = BREADBOARD_PITCH * 1.5;
const BREADBOARD_COLUMN_START = -BREADBOARD_PITCH * ((BREADBOARD_TERMINAL_COLUMNS - 1) / 2);
const BREADBOARD_LEFT_ROW_START =
  -BREADBOARD_ROW_GAP_HALF - BREADBOARD_PITCH * (BREADBOARD_LEFT_ROW_LABELS.length - 1);
const BREADBOARD_RIGHT_ROW_START = BREADBOARD_ROW_GAP_HALF;
const BREADBOARD_LEFT_TERMINAL_OUTER_X = BREADBOARD_LEFT_ROW_START;
const BREADBOARD_RIGHT_TERMINAL_OUTER_X =
  BREADBOARD_RIGHT_ROW_START + BREADBOARD_PITCH * (BREADBOARD_RIGHT_ROW_LABELS.length - 1);
const BREADBOARD_POWER_RAIL_GAP = BREADBOARD_PITCH * 2;
const BREADBOARD_POWER_RAIL_SPACING = BREADBOARD_PITCH;
const BREADBOARD_LEFT_POWER_RAIL_INNER_X =
  BREADBOARD_LEFT_TERMINAL_OUTER_X - BREADBOARD_POWER_RAIL_GAP;
const BREADBOARD_LEFT_POWER_RAIL_OUTER_X =
  BREADBOARD_LEFT_POWER_RAIL_INNER_X - BREADBOARD_POWER_RAIL_SPACING;
const BREADBOARD_RIGHT_POWER_RAIL_INNER_X =
  BREADBOARD_RIGHT_TERMINAL_OUTER_X + BREADBOARD_POWER_RAIL_GAP;
const BREADBOARD_RIGHT_POWER_RAIL_OUTER_X =
  BREADBOARD_RIGHT_POWER_RAIL_INNER_X + BREADBOARD_POWER_RAIL_SPACING;
const BREADBOARD_POWER_RAIL_GROUP_COUNT_PER_SIDE = 5;
const BREADBOARD_POWER_RAIL_HOLES_PER_GROUP = 5;
const BREADBOARD_POWER_RAIL_GROUP_CENTER_START_Z = BREADBOARD_COLUMN_START + BREADBOARD_PITCH * 2;
const BREADBOARD_POWER_RAIL_GROUP_CENTER_STEP_Z = BREADBOARD_PITCH * 6;
const BREADBOARD_POWER_RAIL_GROUP_ROW_OFFSETS = Array.from(
  { length: BREADBOARD_POWER_RAIL_HOLES_PER_GROUP },
  (_, holeIndex) =>
    (holeIndex - (BREADBOARD_POWER_RAIL_HOLES_PER_GROUP - 1) / 2) * BREADBOARD_PITCH
);
const BREADBOARD_POWER_RAIL_GROUP_COLUMN_OFFSETS = [
  -BREADBOARD_PITCH * 0.5,
  BREADBOARD_PITCH * 0.5,
];
const BREADBOARD_LEFT_POWER_RAIL_GROUP_CENTER_X =
  (BREADBOARD_LEFT_POWER_RAIL_INNER_X + BREADBOARD_LEFT_POWER_RAIL_OUTER_X) * 0.5;
const BREADBOARD_RIGHT_POWER_RAIL_GROUP_CENTER_X =
  (BREADBOARD_RIGHT_POWER_RAIL_INNER_X + BREADBOARD_RIGHT_POWER_RAIL_OUTER_X) * 0.5;
const BREADBOARD_POWER_RAILS_ARE_CONTINUOUS = true;
const POWER_RAIL_GROUP_DEFINITIONS = [
  ...Array.from({ length: BREADBOARD_POWER_RAIL_GROUP_COUNT_PER_SIDE }, (_, groupIndex) => ({
    key: `powerRailLeft${groupIndex + 1}`,
    label: `Left Rail Group ${groupIndex + 1}`,
    code: `L${groupIndex + 1}`,
    accent: '#ef4444',
    markerColor: 0xfb7185,
    basePosition: {
      x: BREADBOARD_RIGHT_POWER_RAIL_GROUP_CENTER_X,
      y: 0,
      z: BREADBOARD_POWER_RAIL_GROUP_CENTER_START_Z +
        groupIndex * BREADBOARD_POWER_RAIL_GROUP_CENTER_STEP_Z,
    },
  })),
  ...Array.from({ length: BREADBOARD_POWER_RAIL_GROUP_COUNT_PER_SIDE }, (_, groupIndex) => ({
    key: `powerRailRight${groupIndex + 1}`,
    label: `Right Rail Group ${groupIndex + 1}`,
    code: `R${groupIndex + 1}`,
    accent: '#0ea5e9',
    markerColor: 0x38bdf8,
    basePosition: {
      x: BREADBOARD_LEFT_POWER_RAIL_GROUP_CENTER_X,
      y: 0,
      z: BREADBOARD_POWER_RAIL_GROUP_CENTER_START_Z +
        groupIndex * BREADBOARD_POWER_RAIL_GROUP_CENTER_STEP_Z,
    },
  })),
];
const POWER_RAIL_GROUP_DEFINITION_BY_KEY = new Map(
  POWER_RAIL_GROUP_DEFINITIONS.map((definition) => [definition.key, definition])
);
const DEFAULT_POWER_RAIL_GROUP_POSITIONS = {
  powerRailLeft1: { x: 2.0, y: 0, z: 1.0 },
  powerRailLeft2: { x: 2.0, y: 0, z: 1.0 },
  powerRailLeft3: { x: 2.0, y: 0, z: 1.0 },
  powerRailLeft4: { x: 2.0, y: 0, z: 1.0 },
  powerRailLeft5: { x: 2.0, y: 0, z: 1.0 },
  powerRailRight1: { x: -1.4, y: 0, z: 1.0 },
  powerRailRight2: { x: -1.4, y: 0, z: 1.0 },
  powerRailRight3: { x: -1.4, y: 0, z: 1.0 },
  powerRailRight4: { x: -1.4, y: 0, z: 1.0 },
  powerRailRight5: { x: -1.4, y: 0, z: 1.0 },
};
const DEFAULT_POWER_RAIL_GROUP_ROTATIONS = Object.fromEntries(
  POWER_RAIL_GROUP_DEFINITIONS.map((definition) => [definition.key, { x: 0, y: 0, z: 0 }])
);
const ARDUINO_HEADER_GROUP_DEFINITIONS = [
  {
    key: 'arduinoHeaderLeftGroup1',
    label: 'Arduino Left Header Group 1',
    code: 'LH1',
    accent: '#16a34a',
    markerColor: 0x4ade80,
    surfaceKey: 'arduinoHeaderLeft',
    holeCount: 8,
    pinLabels: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'],
    // Mirror the green-side run so it starts from the opposite edge:
    // 8 pins first, then one empty pitch, then the 10-pin block.
    basePosition: { x: 0, y: 0, z: 13.97 },
  },
  {
    key: 'arduinoHeaderLeftGroup2',
    label: 'Arduino Left Header Group 2',
    code: 'LH2',
    accent: '#16a34a',
    markerColor: 0x22c55e,
    surfaceKey: 'arduinoHeaderLeft',
    holeCount: 10,
    pinLabels: ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'],
    basePosition: { x: 0, y: 0, z: -11.43 },
  },
  {
    key: 'arduinoHeaderRightGroup1',
    label: 'Arduino Right Header Group 1',
    code: 'RH1',
    accent: '#f59e0b',
    markerColor: 0xfbbf24,
    surfaceKey: 'arduinoHeaderRight',
    holeCount: 6,
    pinLabels: ['A5', 'A4', 'A3', 'A2', 'A1', 'A0'],
    // Start from the header edge that lines up with breadboard A1-J1,
    // then place the first 6-pin block one pitch inside that edge.
    basePosition: { x: 0, y: 0, z: -10.36 },
  },
  {
    key: 'arduinoHeaderRightGroup2',
    label: 'Arduino Right Header Group 2',
    code: 'RH2',
    accent: '#f59e0b',
    markerColor: 0xf59e0b,
    surfaceKey: 'arduinoHeaderRight',
    holeCount: 7,
    pinLabels: ['VIN', 'GND', 'GND', '5V', '3.3V', 'RESET', 'IOREF'],
    // Leave one empty pitch after the first block, then place the 7-pin block.
    basePosition: { x: 0, y: 0, z: 8.69 },
  },
];
const ARDUINO_HEADER_GROUP_DEFINITION_BY_KEY = new Map(
  ARDUINO_HEADER_GROUP_DEFINITIONS.map((definition) => [definition.key, definition])
);
const DEFAULT_ARDUINO_HEADER_GROUP_POSITIONS = Object.fromEntries(
  ARDUINO_HEADER_GROUP_DEFINITIONS.map((definition) => {
    const defaultsByKey = {
      arduinoHeaderLeftGroup1: { x: -0.1, y: 0, z: -0.3 },
      arduinoHeaderLeftGroup2: { x: -0.1, y: 0, z: 0.7 },
      arduinoHeaderRightGroup1: { x: 0.2, y: 0, z: -1.0 },
      arduinoHeaderRightGroup2: { x: 0.2, y: 0, z: -1.0 },
    };

    return [definition.key, { ...defaultsByKey[definition.key] }];
  })
);
const DEFAULT_ARDUINO_HEADER_GROUP_ROTATIONS = Object.fromEntries(
  ARDUINO_HEADER_GROUP_DEFINITIONS.map((definition) => [definition.key, { x: 0, y: 0, z: 0 }])
);
const BREADBOARD_SURFACE_BASE_WIDTH =
  BREADBOARD_RIGHT_POWER_RAIL_OUTER_X -
  BREADBOARD_LEFT_POWER_RAIL_OUTER_X +
  BREADBOARD_PITCH * 2.1;
const BREADBOARD_SURFACE_BASE_DEPTH =
  (BREADBOARD_COLUMN_START + BREADBOARD_PITCH * (BREADBOARD_TERMINAL_COLUMNS - 1)) -
  BREADBOARD_COLUMN_START +
  BREADBOARD_PITCH * 1.8;
const ARDUINO_HEADER_SURFACE_BASE_WIDTH = 6.4;
const ARDUINO_LEFT_HEADER_SURFACE_BASE_DEPTH = 46;
const ARDUINO_RIGHT_HEADER_SURFACE_BASE_DEPTH = 46;
const BASE_POSITIONS = {
  arduino: { x: -74, y: 0, z: 0 },
  breadboard: { x: 86, y: 0, z: 0 },
  arduinoHeaderLeft: { x: 0, y: 0, z: 0 },
  arduinoHeaderRight: { x: 0, y: 0, z: 0 },
  breadboardSurface: { x: 0, y: 0, z: 0 },
  wire: { x: 0, y: 0, z: 0 },
};
const BASE_ROTATIONS = {
  arduino: { x: 0, y: 90, z: 0 },
  breadboard: { x: 0, y: -90, z: 0 },
  arduinoHeaderLeft: { x: 0, y: 0, z: 0 },
  arduinoHeaderRight: { x: 0, y: 0, z: 0 },
  breadboardSurface: { x: 0, y: 0, z: 0 },
  wireStart: { x: 0, y: 0, z: 0 },
  wireEnd: { x: 0, y: 0, z: 0 },
};
const DEFAULT_POSITIONS = {
  arduino: { x: 41, y: 1, z: 0 },
  breadboard: { x: -47, y: -104, z: -27.2 },
  arduinoHeaderLeft: { x: -22.6, y: 25.8, z: 2.7 },
  arduinoHeaderRight: { x: -27.3, y: -22.8, z: -21.9 },
  breadboardSurface: { x: 0.6, y: 28.0, z: -121.0 },
  wire: { x: 0, y: 0, z: 0 },
};
const DEFAULT_ROTATIONS = {
  arduino: { x: 90, y: 0, z: 0 },
  breadboard: { x: 90, y: 0, z: -90 },
  arduinoHeaderLeft: { x: 0, y: -90, z: 90 },
  arduinoHeaderRight: { x: 90, y: 90, z: 0 },
  breadboardSurface: { x: 90, y: 0, z: 0 },
  wireStart: { x: 0, y: 0, z: 90 },
  wireEnd: { x: 0, y: 0, z: -90 },
};
const DEFAULT_SURFACE_SIZES = {
  arduinoHeaderLeft: {
    width: 2.5,
    depth: 47.5,
  },
  arduinoHeaderRight: {
    width: 2.5,
    depth: 38.5,
  },
  breadboardSurface: {
    width: 51.5,
    depth: 82.5,
  },
};
const BASE_SURFACE_SIZES = {
  arduinoHeaderLeft: {
    width: ARDUINO_HEADER_SURFACE_BASE_WIDTH,
    depth: ARDUINO_LEFT_HEADER_SURFACE_BASE_DEPTH,
  },
  arduinoHeaderRight: {
    width: ARDUINO_HEADER_SURFACE_BASE_WIDTH,
    depth: ARDUINO_RIGHT_HEADER_SURFACE_BASE_DEPTH,
  },
  breadboardSurface: {
    width: BREADBOARD_SURFACE_BASE_WIDTH,
    depth: BREADBOARD_SURFACE_BASE_DEPTH,
  },
};
const CONNECTABLE_SURFACE_KEYS = ['arduinoHeaderLeft', 'arduinoHeaderRight', 'breadboardSurface'];
const DRAG_SURFACE_KEYS = {
  start: CONNECTABLE_SURFACE_KEYS,
  end: CONNECTABLE_SURFACE_KEYS,
};
const TRANSFORM_SECTIONS = [
  { key: 'arduino', label: 'Arduino Uno', accent: '#16a34a', enablePosition: true, enableRotation: true },
  { key: 'breadboard', label: 'Breadboard', accent: '#2563eb', enablePosition: true, enableRotation: true },
  { key: 'arduinoHeaderLeft', label: 'UNO Left Header', accent: '#14b8a6', enablePosition: true, enableRotation: true, enableSize: true },
  { key: 'arduinoHeaderRight', label: 'UNO Right Header', accent: '#f59e0b', enablePosition: true, enableRotation: true, enableSize: true },
  { key: 'breadboardSurface', label: 'Breadboard Surface', accent: '#ec4899', enablePosition: true, enableRotation: true, enableSize: true },
  { key: 'wire', label: 'Wire Body', accent: '#ea580c', enablePosition: true, enableRotation: false },
  { key: 'wireStart', label: 'Wire Start Plug', accent: '#f97316', enablePosition: false, enableRotation: true },
  { key: 'wireEnd', label: 'Wire End Plug', accent: '#0ea5e9', enablePosition: false, enableRotation: true },
];
const PART_DEFINITIONS = [
  {
    key: 'ledRed',
    label: 'Red LED',
    statusLabel: 'red LED',
    accent: '#ef4444',
    description: '5mm through-hole LED',
    modelUrl: '/models/uno_simulator/5mm_LED_Red.glb',
    baseRotation: { x: -90, y: 0, z: 0 },
    surfaceLiftY: -15.0,
    leadPoints: [
      { x: -1.49, y: 0, z: 0 },
      { x: 1.06, y: 0, z: 0 },
    ],
    // Until the physical long/short legs are more visible in the model,
    // treat the blue end marker as the anode and the teal start marker as the cathode.
    leadLabels: ['Cathode', 'Anode'],
    bodyHitbox: {
      size: { x: 8.0, y: 9.0, z: 8.0 },
      offset: { x: -0.5, y: 1.0, z: -11.5 },
    },
  },
  {
    key: 'resistor10k',
    label: '10K Resistor',
    statusLabel: '10K resistor',
    accent: '#f59e0b',
    description: '0.25W through-hole resistor',
    modelUrl: '/models/uno_simulator/Resistor_0.25W.glb',
    baseRotation: { x: -90, y: 0, z: 0 },
    surfaceLiftY: 15.0,
    leadPoints: [
      { x: -5.55, y: 0, z: 0 },
      { x: 5.55, y: 0, z: 0 },
    ],
    leadLabels: ['Left Lead', 'Right Lead'],
  },
];
const PART_DEFINITION_BY_KEY = new Map(
  PART_DEFINITIONS.map((definition) => [definition.key, definition])
);
const PART_LEAD_ENDPOINTS = [
  { endKey: 'start', pointIndex: 0 },
  { endKey: 'end', pointIndex: 1 },
];
const PART_LEAD_MARKER_OFFSET_LIMIT = 50;
const PART_LEAD_MARKER_OFFSET_PRECISION = 2;
const DEFAULT_PART_BODY_HITBOX_FALLBACKS = {
  resistor10k: {
    size: { x: 12.0, y: 8.0, z: 8.0 },
    offset: { x: 0.24, y: -17.11, z: -2.65 },
  },
};
const DEFAULT_PART_LEAD_MARKER_OFFSETS = {
  ledRed: [
    { x: 0.0, y: 0.0, z: -29.0 },
    { x: 0.0, y: 0.0, z: -29.0 },
  ],
  resistor10k: [
    { x: 0.3, y: 0.0, z: -6.0 },
    { x: -0.3, y: 0.0, z: -6.0 },
  ],
};
const DEFAULT_ARDUINO_SKETCH = `void setup() {
  pinMode(4, OUTPUT);
}

void loop() {
  digitalWrite(4, HIGH);
  delay(500);
  digitalWrite(4, LOW);
  delay(500);
}
`;

console.table(
  PART_DEFINITIONS.map((definition) => ({
    part: definition.label,
    key: definition.key,
    surfaceLiftY: definition.surfaceLiftY ?? DEFAULT_PART_SURFACE_LIFT,
  }))
);

function resolvePublicAssetUrl(path) {
  if (/^(?:[a-z]+:)?\/\//i.test(path)) {
    return path;
  }

  return `${import.meta.env.BASE_URL}${String(path).replace(/^\/+/, '')}`;
}

const appShell = document.createElement('div');
appShell.className = 'app-shell';
document.body.appendChild(appShell);

const hud = document.createElement('aside');
hud.className = 'hud';
hud.innerHTML = `
  <p class="eyebrow">Uno Simulator</p>
  <h1>Drag The Dupont Wire</h1>
  <p class="instruction">Grab either glowing wire plug and drop it onto an Arduino or breadboard hole. Use the parts bin to drag LEDs and a resistor onto the breadboard.</p>
  <p class="status" data-status>Loading simulator assets...</p>
`;
document.body.appendChild(hud);

const statusLine = hud.querySelector('[data-status]');
const connectionPanel = document.createElement('section');
connectionPanel.className = 'connection-panel';
connectionPanel.innerHTML = `
  <div class="connection-panel__header">
    <h2>Interconnection Matrix</h2>
    <p class="connection-panel__copy" data-connections-summary>Loading breadboard matrix...</p>
  </div>
  <div class="connection-panel__list" data-connections-list></div>
`;
hud.appendChild(connectionPanel);

const connectionSummaryLine = connectionPanel.querySelector('[data-connections-summary]');
const connectionList = connectionPanel.querySelector('[data-connections-list]');

const debugPanel = document.createElement('aside');
debugPanel.className = 'debug-panel';
debugPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Debug Panel</p>
    <h2>Transform Controls</h2>
    <p class="debug-panel__copy">Position offsets are scene units. Rotation offsets are degrees from each object's base orientation. The wire body moves separately from the start and end plug rotations.</p>
  </div>
  <div class="debug-panel__sections" data-debug-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset">Reset</button>
  </div>
`;
document.body.appendChild(debugPanel);
debugPanel.hidden = true;

const debugSectionsRoot = debugPanel.querySelector('[data-debug-sections]');
const copyRotationsButton = debugPanel.querySelector('[data-action="copy"]');
const resetRotationsButton = debugPanel.querySelector('[data-action="reset"]');

const powerRailPanel = document.createElement('aside');
powerRailPanel.className = 'debug-panel debug-panel--calibration';
powerRailPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Power Rail Calibration</p>
    <h2>Marker Group Controls</h2>
    <p class="debug-panel__copy">Each card adjusts one power rail group: five holes long and two columns wide. Offsets are local to the breadboard surface and rotations are in degrees.</p>
  </div>
  <div class="debug-panel__sections" data-power-rail-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy-power-rail">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset-power-rail">Reset</button>
  </div>
`;
document.body.appendChild(powerRailPanel);
powerRailPanel.hidden = true;

const powerRailSectionsRoot = powerRailPanel.querySelector('[data-power-rail-sections]');
const copyPowerRailButton = powerRailPanel.querySelector('[data-action="copy-power-rail"]');
const resetPowerRailButton = powerRailPanel.querySelector('[data-action="reset-power-rail"]');

const arduinoHeaderPanel = document.createElement('aside');
arduinoHeaderPanel.className = 'debug-panel debug-panel--calibration';
arduinoHeaderPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Arduino Header Calibration</p>
    <h2>Header Marker Controls</h2>
    <p class="debug-panel__copy">Each card adjusts one contiguous Arduino header group. The green cards belong to the current left header surface, and the orange cards belong to the current right header surface.</p>
  </div>
  <div class="debug-panel__sections" data-arduino-header-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy-arduino-header">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset-arduino-header">Reset</button>
  </div>
`;
document.body.appendChild(arduinoHeaderPanel);
arduinoHeaderPanel.hidden = true;

const arduinoHeaderSectionsRoot = arduinoHeaderPanel.querySelector('[data-arduino-header-sections]');
const copyArduinoHeaderButton = arduinoHeaderPanel.querySelector('[data-action="copy-arduino-header"]');
const resetArduinoHeaderButton = arduinoHeaderPanel.querySelector('[data-action="reset-arduino-header"]');

const partsPanel = document.createElement('aside');
partsPanel.className = 'debug-panel debug-panel--parts';
partsPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Parts Bin</p>
    <h2>Drag Components</h2>
    <p class="debug-panel__copy">Press and drag a component card onto the breadboard, then release to place it.</p>
  </div>
  <div class="debug-panel__sections" data-parts-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="add-wire">Add Dupont Wire</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="clear-parts">Clear Placed</button>
  </div>
`;
document.body.appendChild(partsPanel);

const partsSectionsRoot = partsPanel.querySelector('[data-parts-sections]');
const addWireButton = partsPanel.querySelector('[data-action="add-wire"]');
const clearPartsButton = partsPanel.querySelector('[data-action="clear-parts"]');

const arduinoCodePanel = document.createElement('aside');
arduinoCodePanel.className = 'debug-panel debug-panel--code';
arduinoCodePanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Arduino Runner</p>
    <h2>Code Input</h2>
    <p class="debug-panel__copy">Paste an Arduino sketch here, then run it through the existing compiler and Uno simulator. The default example blinks pin D4.</p>
  </div>
  <div class="code-panel__editor-wrap">
    <textarea class="code-panel__editor" data-arduino-source spellcheck="false"></textarea>
  </div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="run-arduino">Run</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="stop-arduino">Stop</button>
  </div>
`;
document.body.appendChild(arduinoCodePanel);

const arduinoSourceInput = arduinoCodePanel.querySelector('[data-arduino-source]');
const runArduinoButton = arduinoCodePanel.querySelector('[data-action="run-arduino"]');
const stopArduinoButton = arduinoCodePanel.querySelector('[data-action="stop-arduino"]');

const partLeadPanel = document.createElement('aside');
partLeadPanel.className = 'debug-panel debug-panel--calibration debug-panel--lead-points';
partLeadPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Lead Calibration</p>
    <h2>Part Lead Marker Offsets</h2>
    <p class="debug-panel__copy">Adjust the visible lead marker circles only. These are x, y, and z offsets from each part's built-in lead anchor, with no rotation controls in this panel.</p>
  </div>
  <div class="debug-panel__sections" data-part-lead-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy-part-leads">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset-part-leads">Reset</button>
  </div>
`;
//document.body.appendChild(partLeadPanel);

const partLeadSectionsRoot = partLeadPanel.querySelector('[data-part-lead-sections]');
const copyPartLeadButton = partLeadPanel.querySelector('[data-action="copy-part-leads"]');
const resetPartLeadButton = partLeadPanel.querySelector('[data-action="reset-part-leads"]');

applyPanelCollapseControl(hud, {
  title: 'Simulator',
  collapsedLabel: 'Show Simulator',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(debugPanel, {
  title: 'Transform Controls',
  collapsedLabel: 'Show Transform Controls',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(powerRailPanel, {
  title: 'Power Rail Calibration',
  collapsedLabel: 'Show Power Rail Calibration',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(arduinoHeaderPanel, {
  title: 'Arduino Header Calibration',
  collapsedLabel: 'Show Header Calibration',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(partsPanel, {
  title: 'Parts Bin',
  collapsedLabel: 'Show Parts Bin',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(arduinoCodePanel, {
  title: 'Arduino Runner',
  collapsedLabel: 'Show Arduino Runner',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(partLeadPanel, {
  title: 'Lead Calibration',
  collapsedLabel: 'Show Lead Calibration',
  initiallyCollapsed: true,
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7edf4);
scene.fog = new THREE.Fog(0xe7edf4, 260, 520);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(100, 85, 150);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.touchAction = 'none';
appShell.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 60;
controls.maxDistance = 420;
controls.target.set(0, 22, 0);
controls.update();

const DEFAULT_CAMERA_POSE = {
  position: { x: 98.35, y: 157.77, z: -87.1 },
  target: { x: 5.22, y: -49.94, z: 0.8 },
  zoom: 1,
};

function getRoundedCameraVector(vector, digits = 2) {
  return {
    x: Number(vector.x.toFixed(digits)),
    y: Number(vector.y.toFixed(digits)),
    z: Number(vector.z.toFixed(digits)),
  };
}

function logCameraPose(label = 'Camera pose snapshot') {
  const position = getRoundedCameraVector(camera.position);
  const target = getRoundedCameraVector(controls.target);
  const snapshot = {
    position,
    target,
    zoom: Number(camera.zoom.toFixed(3)),
    polarAngle: Number(controls.getPolarAngle().toFixed(4)),
    azimuthAngle: Number(controls.getAzimuthalAngle().toFixed(4)),
    code: `camera.position.set(${position.x}, ${position.y}, ${position.z}); controls.target.set(${target.x}, ${target.y}, ${target.z}); controls.update();`,
  };

  console.log(label, snapshot);
  return snapshot;
}

window.printCameraPose = () => logCameraPose('Manual camera pose snapshot');

controls.addEventListener('end', () => {
  logCameraPose('Camera pose updated');
});

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x8aa1b8, 1.7);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
keyLight.position.set(120, 180, 90);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 20;
keyLight.shadow.camera.far = 500;
keyLight.shadow.camera.left = -220;
keyLight.shadow.camera.right = 220;
keyLight.shadow.camera.top = 220;
keyLight.shadow.camera.bottom = -220;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xbdd8ff, 0.7);
fillLight.position.set(-140, 90, -120);
scene.add(fillLight);

const desk = new THREE.Mesh(
  new THREE.BoxGeometry(430, 12, 250),
  new THREE.MeshStandardMaterial({
    color: 0xc6d4df,
    roughness: 0.92,
    metalness: 0.02,
  })
);
desk.position.y = -6;
desk.receiveShadow = true;
scene.add(desk);

const grid = new THREE.GridHelper(380, 16, 0x8ca0b4, 0xcdd8e2);
grid.position.y = 0.12;
for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
  material.transparent = true;
  material.opacity = 0.18;
}
scene.add(grid);

const assembly = new THREE.Group();
scene.add(assembly);

const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const arduinoDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const breadboardDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const clock = new THREE.Clock();
const positionState = {
  arduino: { ...DEFAULT_POSITIONS.arduino },
  breadboard: { ...DEFAULT_POSITIONS.breadboard },
  arduinoHeaderLeft: { ...DEFAULT_POSITIONS.arduinoHeaderLeft },
  arduinoHeaderRight: { ...DEFAULT_POSITIONS.arduinoHeaderRight },
  breadboardSurface: { ...DEFAULT_POSITIONS.breadboardSurface },
  wire: { ...DEFAULT_POSITIONS.wire },
};
const surfaceSizeState = {
  arduinoHeaderLeft: { ...DEFAULT_SURFACE_SIZES.arduinoHeaderLeft },
  arduinoHeaderRight: { ...DEFAULT_SURFACE_SIZES.arduinoHeaderRight },
  breadboardSurface: { ...DEFAULT_SURFACE_SIZES.breadboardSurface },
};
const rotationState = {
  arduino: { ...DEFAULT_ROTATIONS.arduino },
  breadboard: { ...DEFAULT_ROTATIONS.breadboard },
  arduinoHeaderLeft: { ...DEFAULT_ROTATIONS.arduinoHeaderLeft },
  arduinoHeaderRight: { ...DEFAULT_ROTATIONS.arduinoHeaderRight },
  breadboardSurface: { ...DEFAULT_ROTATIONS.breadboardSurface },
  wireStart: { ...DEFAULT_ROTATIONS.wireStart },
  wireEnd: { ...DEFAULT_ROTATIONS.wireEnd },
};
const transformUi = new Map();
const powerRailGroupPositionState = Object.fromEntries(
  POWER_RAIL_GROUP_DEFINITIONS.map((definition) => [
    definition.key,
    { ...DEFAULT_POWER_RAIL_GROUP_POSITIONS[definition.key] },
  ])
);
const powerRailGroupRotationState = Object.fromEntries(
  POWER_RAIL_GROUP_DEFINITIONS.map((definition) => [
    definition.key,
    { ...DEFAULT_POWER_RAIL_GROUP_ROTATIONS[definition.key] },
  ])
);
const powerRailGroupUi = new Map();
const powerRailGroupRoots = new Map();
const arduinoHeaderGroupPositionState = Object.fromEntries(
  ARDUINO_HEADER_GROUP_DEFINITIONS.map((definition) => [
    definition.key,
    { ...DEFAULT_ARDUINO_HEADER_GROUP_POSITIONS[definition.key] },
  ])
);
const arduinoHeaderGroupRotationState = Object.fromEntries(
  ARDUINO_HEADER_GROUP_DEFINITIONS.map((definition) => [
    definition.key,
    { ...DEFAULT_ARDUINO_HEADER_GROUP_ROTATIONS[definition.key] },
  ])
);
const arduinoHeaderGroupUi = new Map();
const arduinoHeaderGroupRoots = new Map();
const partLeadMarkerOffsetState = Object.fromEntries(
  PART_DEFINITIONS.map((definition) => [
    definition.key,
    clonePartLeadPoints(DEFAULT_PART_LEAD_MARKER_OFFSETS[definition.key]),
  ])
);
const partLeadCalibrationUi = new Map();
const wireStartRotationOffset = new THREE.Quaternion();
const wireEndRotationOffset = new THREE.Quaternion();

const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();
const tempSize = new THREE.Vector3();
const tempPoint = new THREE.Vector3();
const tempPointB = new THREE.Vector3();
const tempBreadboardNormal = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const tempCableStart = new THREE.Vector3();
const tempCableEnd = new THREE.Vector3();
const tempControlA = new THREE.Vector3();
const tempControlB = new THREE.Vector3();
const tempStartCableDir = new THREE.Vector3();
const tempEndCableDir = new THREE.Vector3();
const tempStartReliefPoint = new THREE.Vector3();
const tempEndReliefPoint = new THREE.Vector3();
const tempStartTip = new THREE.Vector3();
const tempEndTip = new THREE.Vector3();
const tempWireOffset = new THREE.Vector3();
const tempNormal = new THREE.Vector3();
const tempNormalB = new THREE.Vector3();
const tempAverageNormal = new THREE.Vector3();
const tempSurfaceOrigin = new THREE.Vector3();
const tempSurfaceCandidate = new THREE.Vector3();
const tempSurfaceCandidateB = new THREE.Vector3();
const tempSurfaceLocalPoint = new THREE.Vector3();
const tempSurfacePlane = new THREE.Plane();
const upAxis = new THREE.Vector3(0, 1, 0);
const startPlugSurfaceAxis = new THREE.Vector3(-1, 0, 0);
const endPlugSurfaceAxis = new THREE.Vector3(1, 0, 0);
const tempPartWorldPosition = new THREE.Vector3();
const tempPartParentQuaternion = new THREE.Quaternion();
const tempPartWorldQuaternion = new THREE.Quaternion();
const tempPartRotationOffset = new THREE.Quaternion();
const tempPartEuler = new THREE.Euler();
const tempPartLeadPointA = new THREE.Vector3();
const tempPartLeadPointB = new THREE.Vector3();
const tempPartLeadDirection = new THREE.Vector3();
const tempPartLeadDirectionB = new THREE.Vector3();
const tempPartBasisY = new THREE.Vector3();
const tempPartBasisZ = new THREE.Vector3();
const tempPartScaledLeadPoint = new THREE.Vector3();
const tempPartScaledLeadPointB = new THREE.Vector3();
const tempPartLocalPoint = new THREE.Vector3();
const tempPartMatrix = new THREE.Matrix4();
const tempPartMatrixB = new THREE.Matrix4();
const tempPartMatrixC = new THREE.Matrix4();

let arduino = null;
let breadboard = null;
let arduinoRigRoot = null;
let breadboardRigRoot = null;
let arduinoHeaderLeft = null;
let arduinoHeaderRight = null;
let arduinoHeaderLeftContent = null;
let arduinoHeaderRightContent = null;
let breadboardSurface = null;
const surfaceGuides = new Map();
let startAnchor = null;
let arduinoTargets = [];
let breadboardTargets = [];
let breadboardPartsRoot = null;
let hoveredPlacedPart = null;

let avrRunner = null;

const interactiveWires = [];

const wireState = {
  dragging: false,
  activeWire: null,
  draggedEnd: null,
  hoveredWire: null,
  hoveredEnd: null,
  hoveredTarget: null,
};
const partModelCache = new Map();
const placedParts = [];
const partDragState = {
  active: false,
  pointerId: null,
  definitionKey: null,
  previewPart: null,
  placementValid: false,
  clientX: 0,
  clientY: 0,
    // new
  mode: 'new', // 'new' or 'redrag'
  originalPart: null,
};
const partLeadState = {
  dragging: false,
  activePart: null,
  draggedEnd: null,
  hoveredPart: null,
  hoveredEnd: null,
  hoveredTarget: null,
};
let arduinoCompileInFlight = false;

buildTransformDebugPanel();
buildPowerRailCalibrationPanel();
buildArduinoHeaderCalibrationPanel();
buildPartLeadCalibrationPanel();
buildPartsPanel();
buildArduinoCodePanel();

init().catch((error) => {
  console.error(error);
  setStatus('Failed to load the Uno simulator assets. Check the console for details.');
});

function setStatus(message) {
  statusLine.textContent = message;
}

function applyPanelCollapseControl(panel, options = {}) {
  if (!panel || panel.dataset.collapseReady === 'true') {
    return;
  }

  const {
    title = 'Panel',
    collapsedLabel = `Show ${title}`,
    expandedLabel = 'Hide',
    initiallyCollapsed = false,
  } = options;

  const content = document.createElement('div');
  content.className = 'panel-frame__content';

  while (panel.firstChild) {
    content.appendChild(panel.firstChild);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'panel-toggle';
  button.textContent = expandedLabel;
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-label', `${expandedLabel} ${title}`);

  function setCollapsedState(collapsed) {
    panel.classList.toggle('panel--collapsed', collapsed);
    content.hidden = collapsed;
    button.textContent = collapsed ? collapsedLabel : expandedLabel;
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    button.setAttribute('aria-label', `${collapsed ? collapsedLabel : expandedLabel} ${title}`);
  }

  button.addEventListener('click', () => {
    setCollapsedState(!panel.classList.contains('panel--collapsed'));
  });

  panel.append(button, content);
  setCollapsedState(initiallyCollapsed);
  panel.dataset.collapseReady = 'true';
}

function applyDefaultCameraPose() {
  camera.position.set(
    DEFAULT_CAMERA_POSE.position.x,
    DEFAULT_CAMERA_POSE.position.y,
    DEFAULT_CAMERA_POSE.position.z
  );
  controls.target.set(
    DEFAULT_CAMERA_POSE.target.x,
    DEFAULT_CAMERA_POSE.target.y,
    DEFAULT_CAMERA_POSE.target.z
  );
  camera.zoom = DEFAULT_CAMERA_POSE.zoom;
  camera.updateProjectionMatrix();
  controls.update();
}

function clearElementChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function buildTargetLocationLabel(target) {
  if (!target) {
    return 'Unplaced';
  }

  return target.userData.surfaceKey === 'breadboardSurface'
    ? `Breadboard ${target.userData.label}`
    : `Arduino ${target.userData.label}`;
}

function getBreadboardTerminalSide(rowLabel) {
  if (BREADBOARD_LEFT_ROW_LABELS.includes(rowLabel)) {
    return 'left';
  }

  if (BREADBOARD_RIGHT_ROW_LABELS.includes(rowLabel)) {
    return 'right';
  }

  return null;
}

function getElectricalNodeMetaForTarget(target) {
  if (!target) {
    return null;
  }

  if (target.userData.surfaceKey === 'breadboardSurface') {
    if (target.userData.isPowerRail) {
      const definition = POWER_RAIL_GROUP_DEFINITION_BY_KEY.get(target.userData.groupKey);
      const label = definition?.label ?? `Power Rail ${target.userData.groupKey ?? target.userData.label}`;

      return {
        id: `breadboard:power-rail:${target.userData.groupKey ?? target.userData.label}`,
        label: `Breadboard ${label}`,
      };
    }

    const match = /^([A-J])(\d+)$/.exec(target.userData.label ?? '');

    if (!match) {
      return {
        id: `breadboard:hole:${target.userData.label ?? 'unknown'}`,
        label: `Breadboard ${target.userData.label ?? 'Unknown Hole'}`,
      };
    }

    const [, rowLabel, stripNumberText] = match;
    const stripNumber = Number.parseInt(stripNumberText, 10);
    const side = getBreadboardTerminalSide(rowLabel);
    const sideLabel =
      side === 'left'
        ? 'left terminal strip'
        : side === 'right'
          ? 'right terminal strip'
          : 'terminal strip';

    return {
      id: `breadboard:terminal:${side ?? 'unknown'}:${stripNumber}`,
      label: `Breadboard ${sideLabel} ${stripNumber}`,
    };
  }

  const pinLabel = target.userData.pinLabel ?? target.userData.label ?? 'Unknown Pin';

  return {
    id: `arduino:${target.userData.surfaceKey}:${target.userData.groupKey ?? 'group'}:${target.userData.pinIndex ?? pinLabel}`,
    label: `Arduino ${pinLabel}`,
  };
}

function ensureConnectivityNode(nodes, adjacency, nodeMeta) {
  if (!nodeMeta) {
    return;
  }

  if (!nodes.has(nodeMeta.id)) {
    nodes.set(nodeMeta.id, nodeMeta);
  }

  if (!adjacency.has(nodeMeta.id)) {
    adjacency.set(nodeMeta.id, new Set());
  }
}

function connectElectricalNodes(adjacency, nodeIdA, nodeIdB) {
  if (!nodeIdA || !nodeIdB || nodeIdA === nodeIdB) {
    return;
  }

  adjacency.get(nodeIdA)?.add(nodeIdB);
  adjacency.get(nodeIdB)?.add(nodeIdA);
}

function addConnectivityAttachment(nodes, adjacency, attachmentsByNode, target, attachment) {
  const nodeMeta = getElectricalNodeMetaForTarget(target);

  if (!nodeMeta) {
    return null;
  }

  ensureConnectivityNode(nodes, adjacency, nodeMeta);

  const attachments = attachmentsByNode.get(nodeMeta.id) ?? [];
  attachments.push({
    ...attachment,
    locationLabel: buildTargetLocationLabel(target),
  });
  attachmentsByNode.set(nodeMeta.id, attachments);

  return nodeMeta.id;
}

function getWireDisplayName(wire) {
  const wireIndex = interactiveWires.indexOf(wire);
  return `Wire ${wireIndex >= 0 ? wireIndex + 1 : interactiveWires.length + 1}`;
}

function getPartDisplayName(part) {
  const definition = PART_DEFINITION_BY_KEY.get(part?.userData?.definitionKey);
  const baseLabel = definition?.label ?? 'Part';
  let instanceNumber = 0;

  for (const candidate of placedParts) {
    if (candidate.userData.definitionKey !== part?.userData?.definitionKey) {
      continue;
    }

    instanceNumber += 1;

    if (candidate === part) {
      return `${baseLabel} ${instanceNumber}`;
    }
  }

  return baseLabel;
}

function getPartLeadConnectivityTarget(part, endKey) {
  return getPartLeadLandingTarget(part, endKey) ?? getPartLeadSnappedTarget(part, endKey);
}

function buildCircuitConnectivityGroups() {
  const nodes = new Map();
  const adjacency = new Map();
  const attachmentsByNode = new Map();

  for (const wire of interactiveWires) {
    const wireName = getWireDisplayName(wire);
    const startNodeId = addConnectivityAttachment(
      nodes,
      adjacency,
      attachmentsByNode,
      wire.startSnappedTarget,
      {
        label: `${wireName} Start Plug`,
      }
    );
    const endNodeId = addConnectivityAttachment(
      nodes,
      adjacency,
      attachmentsByNode,
      wire.endSnappedTarget,
      {
        label: `${wireName} End Plug`,
      }
    );

    connectElectricalNodes(adjacency, startNodeId, endNodeId);
  }

  for (const part of placedParts) {
    const partName = getPartDisplayName(part);
    const startNodeId = addConnectivityAttachment(
      nodes,
      adjacency,
      attachmentsByNode,
      getPartLeadConnectivityTarget(part, 'start'),
      {
        label: `${partName} ${getPartLeadLabel(part, 'start')}`,
      }
    );
    const endNodeId = addConnectivityAttachment(
      nodes,
      adjacency,
      attachmentsByNode,
      getPartLeadConnectivityTarget(part, 'end'),
      {
        label: `${partName} ${getPartLeadLabel(part, 'end')}`,
      }
    );

    connectElectricalNodes(adjacency, startNodeId, endNodeId);
  }

  const groups = [];
  const visited = new Set();

  for (const [nodeId, nodeMeta] of nodes) {
    if (visited.has(nodeId)) {
      continue;
    }

    const stack = [nodeId];
    const nodeIds = [];
    visited.add(nodeId);

    while (stack.length > 0) {
      const currentNodeId = stack.pop();
      nodeIds.push(currentNodeId);

      for (const neighborId of adjacency.get(currentNodeId) ?? []) {
        if (visited.has(neighborId)) {
          continue;
        }

        visited.add(neighborId);
        stack.push(neighborId);
      }
    }

    const members = nodeIds.flatMap((currentNodeId) => attachmentsByNode.get(currentNodeId) ?? []);

    if (members.length < 2) {
      continue;
    }

    members.sort(
      (memberA, memberB) =>
        memberA.label.localeCompare(memberB.label) ||
        memberA.locationLabel.localeCompare(memberB.locationLabel)
    );

    groups.push({
      nodes: nodeIds
        .map((currentNodeId) => nodes.get(currentNodeId)?.label ?? nodeMeta.label)
        .sort((labelA, labelB) => labelA.localeCompare(labelB)),
      members,
    });
  }

  groups.sort(
    (groupA, groupB) =>
      groupB.members.length - groupA.members.length ||
      groupA.nodes[0].localeCompare(groupB.nodes[0])
  );

  return groups;
}

function addBreadboardInternalConnections(nodes, adjacency) {
  const ensureInternalNode = (nodeMeta) => {
    if (!nodes.has(nodeMeta.id)) {
      nodes.set(nodeMeta.id, nodeMeta);
    }

    if (!adjacency.has(nodeMeta.id)) {
      adjacency.set(nodeMeta.id, new Set());
    }

    return nodeMeta.id;
  };

  const connectInternalNodes = (nodeIdA, nodeIdB) => {
    if (!nodeIdA || !nodeIdB || nodeIdA === nodeIdB) {
      return;
    }

    adjacency.get(nodeIdA)?.add(nodeIdB);
    adjacency.get(nodeIdB)?.add(nodeIdA);
  };

  const connectRailGroups = (groupKeys) => {
    let previousNodeId = null;

    for (const groupKey of groupKeys) {
      const definition = POWER_RAIL_GROUP_DEFINITION_BY_KEY.get(groupKey);

      const nodeId = ensureInternalNode({
        id: `breadboard:power-rail:${groupKey}`,
        label: `Breadboard ${definition?.label ?? groupKey}`,
      });

      if (previousNodeId) {
        connectInternalNodes(previousNodeId, nodeId);
      }

      previousNodeId = nodeId;
    }
  };

  connectRailGroups([
    'powerRailLeft1',
    'powerRailLeft2',
    'powerRailLeft3',
    'powerRailLeft4',
    'powerRailLeft5',
  ]);

  connectRailGroups([
    'powerRailRight1',
    'powerRailRight2',
    'powerRailRight3',
    'powerRailRight4',
    'powerRailRight5',
  ]);
}

function buildAvrNetlist() {
  const nodes = new Map();
  const adjacency = new Map();

  const ensureNode = (target) => {
    const meta = getElectricalNodeMetaForTarget(target);
    if (!meta) return null;

    if (!nodes.has(meta.id)) {
      nodes.set(meta.id, meta);
    }

    if (!adjacency.has(meta.id)) {
      adjacency.set(meta.id, new Set());
    }

    return meta.id;
  };

  const connectNodes = (a, b) => {
    if (!a || !b || a === b) return;
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  };

  addBreadboardInternalConnections(nodes, adjacency);

  // 1. Wires DO merge nets.
  for (const wire of interactiveWires) {
    const startNodeId = ensureNode(wire.startSnappedTarget);
    const endNodeId = ensureNode(wire.endSnappedTarget);

    connectNodes(startNodeId, endNodeId);
  }

  // 2. Parts DO NOT merge nets.
  // They become components connected between nets.
  const components = [];

  for (const part of placedParts) {
    const definition = PART_DEFINITION_BY_KEY.get(part.userData.definitionKey);

    const startTarget = getPartLeadConnectivityTarget(part, 'start');
    const endTarget = getPartLeadConnectivityTarget(part, 'end');

    const startNodeId = ensureNode(startTarget);
    const endNodeId = ensureNode(endTarget);

    components.push({
      id: part.uuid,
      type: part.userData.definitionKey,
      label: definition?.label ?? 'Part',
      terminals: {
        start: startNodeId,
        end: endNodeId,
      },
    });
  }

  return {
    nodes,
    adjacency,
    components,
  };
}

function resolveAvrNets(netlist) {
  const { nodes, adjacency } = netlist;
  const visited = new Set();
  const resolved = new Map();

  let netIndex = 1;

  for (const nodeId of nodes.keys()) {
    if (visited.has(nodeId)) continue;

    const stack = [nodeId];
    const group = [];

    visited.add(nodeId);

    while (stack.length > 0) {
      const current = stack.pop();
      group.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }

    const netName = `NET_${netIndex++}`;

    for (const id of group) {
      resolved.set(id, netName);
    }
  }

  return resolved;
}

function buildAvrSimulationSnapshot() {
  const netlist = buildAvrNetlist();
  const resolvedNets = resolveAvrNets(netlist);

  const arduinoPins = {};
  const breadboardNodes = {};
  const components = [];

  const getResolvedNet = (nodeId) => {
    if (!nodeId) {
      return null;
    }

    return resolvedNets.get(nodeId) ?? null;
  };

  const normalizeArduinoPinLabel = (label) => {
    if (!label) {
      return null;
    }

    const upperLabel = String(label).trim().toUpperCase();

    // Digital pins from header labels like D13, D10, D2, etc.
    if (/^D\d+$/.test(upperLabel)) {
      return upperLabel;
    }

    // Analog pins from labels like A0..A5.
    if (/^A\d+$/.test(upperLabel)) {
      return upperLabel;
    }

    // Power pins.
    if (
      upperLabel === 'GND' ||
      upperLabel === '5V' ||
      upperLabel === '3.3V' ||
      upperLabel === 'VIN' ||
      upperLabel === 'AREF' ||
      upperLabel === 'RESET' ||
      upperLabel === 'IOREF' ||
      upperLabel === 'SDA' ||
      upperLabel === 'SCL'
    ) {
      return upperLabel;
    }

    return upperLabel;
  };

  // 1. Export Arduino header pins -> resolved net names.
  for (const [nodeId, nodeMeta] of netlist.nodes) {
    if (!nodeId.startsWith('arduino:')) {
      continue;
    }

    const pinLabel = nodeMeta.pinLabel ?? nodeMeta.label?.replace(/^Arduino\s+/i, '');
    const normalizedPin = normalizeArduinoPinLabel(pinLabel);

    if (!normalizedPin) {
      continue;
    }

    const netName = getResolvedNet(nodeId);

    if (!netName) {
      continue;
    }

    // Some Arduino headers have duplicate GND pins.
    // Store duplicate labels as arrays so nothing is lost.
    if (arduinoPins[normalizedPin]) {
      if (Array.isArray(arduinoPins[normalizedPin])) {
        if (!arduinoPins[normalizedPin].includes(netName)) {
          arduinoPins[normalizedPin].push(netName);
        }
      } else if (arduinoPins[normalizedPin] !== netName) {
        arduinoPins[normalizedPin] = [arduinoPins[normalizedPin], netName];
      }
    } else {
      arduinoPins[normalizedPin] = netName;
    }
  }

  // 2. Export breadboard nodes -> resolved net names.
  for (const [nodeId, nodeMeta] of netlist.nodes) {
    if (!nodeId.startsWith('breadboard:')) {
      continue;
    }

    const netName = getResolvedNet(nodeId);

    if (!netName) {
      continue;
    }

    breadboardNodes[nodeId] = {
      label: nodeMeta.label,
      net: netName,
    };
  }

  // 3. Export placed parts as components between nets.
  for (const component of netlist.components) {
    const definition = PART_DEFINITION_BY_KEY.get(component.type);

    const startNet = getResolvedNet(component.terminals.start);
    const endNet = getResolvedNet(component.terminals.end);

    if (!startNet || !endNet) {
      components.push({
        ...component,
        label: component.label ?? definition?.label ?? component.type,
        connected: false,
        terminals: {
          start: {
            node: component.terminals.start,
            net: startNet,
          },
          end: {
            node: component.terminals.end,
            net: endNet,
          },
        },
      });

      continue;
    }

    const terminalNames = getAvrComponentTerminalNames(component.type);

    components.push({
      id: component.id,
      type: component.type,
      label: component.label ?? definition?.label ?? component.type,
      connected: true,
      terminals: {
        [terminalNames.start]: {
          node: component.terminals.start,
          net: startNet,
        },
        [terminalNames.end]: {
          node: component.terminals.end,
          net: endNet,
        },
      },
    });
  }

  return {
    arduinoPins,
    breadboardNodes,
    components,
    raw: {
      netlist,
      resolvedNets,
    },
  };
}

function getAvrComponentTerminalNames(componentType) {
  if (componentType === 'ledRed') {
    return {
      start: 'cathode',
      end: 'anode',
    };
  }

  if (componentType === 'resistor10k') {
    return {
      start: 'leadA',
      end: 'leadB',
    };
  }

  return {
    start: 'start',
    end: 'end',
  };
}

function findLedOutputPaths(snapshot) {
  const paths = [];

  const pinEntries = Object.entries(snapshot.arduinoPins);

  const getSingleNet = (pinNet) => {
    if (Array.isArray(pinNet)) {
      return pinNet[0] ?? null;
    }

    return pinNet ?? null;
  };

  const getGroundNets = () => {
    const gnd = snapshot.arduinoPins.GND;

    if (!gnd) {
      return new Set();
    }

    return new Set(Array.isArray(gnd) ? gnd : [gnd]);
  };

  const groundNets = getGroundNets();

  const resistors = snapshot.components.filter(
    (component) => component.connected && component.type === 'resistor10k'
  );

  const leds = snapshot.components.filter(
    (component) => component.connected && component.type === 'ledRed'
  );

  for (const led of leds) {
    const anodeNet = led.terminals.anode?.net;
    const cathodeNet = led.terminals.cathode?.net;

    if (!anodeNet || !cathodeNet) {
      continue;
    }

    for (const [pinLabel, pinNetValue] of pinEntries) {
      if (!/^D\d+$/.test(pinLabel)) {
        continue;
      }

      const pinNet = getSingleNet(pinNetValue);

      if (!pinNet) {
        continue;
      }

      // Case 1:
      // Digital pin -> LED anode -> LED cathode -> resistor -> GND
      if (pinNet === anodeNet) {
        const resistorToGround = resistors.find((resistor) => {
          const leadANet = resistor.terminals.leadA?.net;
          const leadBNet = resistor.terminals.leadB?.net;

          return (
            (leadANet === cathodeNet && groundNets.has(leadBNet)) ||
            (leadBNet === cathodeNet && groundNets.has(leadANet))
          );
        });

        if (resistorToGround) {
          paths.push({
            ledId: led.id,
            ledLabel: led.label,
            pin: pinLabel,
            pinNet,
            mode: 'source-current',
            activeWhen: 'HIGH',
            seriesResistorId: resistorToGround.id,
            path: {
              pin: pinNet,
              ledAnode: anodeNet,
              ledCathode: cathodeNet,
              ground: [...groundNets],
            },
          });
        }
      }

      // Case 2:
      // Digital pin -> resistor -> LED cathode, LED anode -> 5V
      // This is current-sinking mode, useful later.
    }
  }

  return paths;
}

function disposeAvrRunner() {
  if (avrRunner) {
    avrRunner.dispose?.();
    avrRunner.stop?.();
    avrRunner = null;
  }
}

function normalizeSimulationPinStates(snapshot) {
  const sourcePinStates =
    snapshot?.pinStates ||
    snapshot?.digitalPinStates ||
    snapshot?.pins ||
    snapshot?.pinStatesByName ||
    snapshot ||
    {};

  const pinStates = {};

  for (const [pinName, state] of Object.entries(sourcePinStates)) {
    if (!/^D\d+$/.test(pinName) && !/^A\d+$/.test(pinName)) {
      continue;
    }

    if (typeof state === 'boolean') {
      pinStates[pinName] = {
        mode: 'output',
        value: state,
      };
      continue;
    }

    const mode = String(state?.mode || '').toLowerCase();

    if (mode === 'high') {
      pinStates[pinName] = {
        mode: 'output',
        value: true,
      };
      continue;
    }

    if (mode === 'low') {
      pinStates[pinName] = {
        mode: 'output',
        value: false,
      };
      continue;
    }

    pinStates[pinName] = {
      mode: mode || 'input',
      value: Boolean(
        state?.value ??
        state?.high ??
        state?.level ??
        false
      ),
    };
  }

  return pinStates;
}

function startAvrHexWithExistingSimulator(hexText) {
  disposeAvrRunner();

  avrRunner = new ArduinoUnoSimulator({
    hex: hexText,

    onUpdate: (snapshot) => {
      const pinStates = normalizeSimulationPinStates(snapshot);
      console.table(pinStates);
      updateLedVisualsFromArduinoPinStates(pinStates);
    },

    onError: (error) => {
      console.error('AVR simulator error:', error);
      setStatus?.(error?.message || 'AVR simulator stopped because of an error.');
      disposeAvrRunner();
    },
  });

  avrRunner.start();
}

window.debugAvrSnapshot = () => {
  const snapshot = buildAvrSimulationSnapshot();
  const ledPaths = findLedOutputPaths(snapshot);

  console.log('AVR simulation snapshot:', snapshot);
  console.table(snapshot.arduinoPins);
  console.table(snapshot.components);
  console.table(ledPaths);

  return {
    snapshot,
    ledPaths,
  };
};

const LED_OFF_COLOR = 0xef4444;
const LED_ON_COLOR = 0xff2222;
const LED_ON_EMISSIVE = 0xff3333;
const LED_OFF_EMISSIVE = 0x000000;

function isLedBodyMesh(object) {
  const meshName = String(object.name ?? '').toLowerCase();

  const materialNames = Array.isArray(object.material)
    ? object.material.map((material) => String(material?.name ?? '').toLowerCase()).join(' ')
    : String(object.material?.name ?? '').toLowerCase();

  const combinedName = `${meshName} ${materialNames}`;

  // Skip obvious metal/lead meshes.
  if (
    combinedName.includes('lead') ||
    combinedName.includes('leg') ||
    combinedName.includes('pin') ||
    combinedName.includes('wire') ||
    combinedName.includes('metal') ||
    combinedName.includes('cathode') ||
    combinedName.includes('anode')
  ) {
    return false;
  }

  // Prefer obvious LED body/dome/lens names.
  if (
    combinedName.includes('led') ||
    combinedName.includes('body') ||
    combinedName.includes('bulb') ||
    combinedName.includes('lens') ||
    combinedName.includes('plastic') ||
    combinedName.includes('red')
  ) {
    return true;
  }

  // Fallback: if mesh/material names are useless, light only red-ish material.
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  return materials.some((material) => {
    if (!material?.color) return false;

    const color = material.color;
    return color.r > 0.45 && color.g < 0.35 && color.b < 0.35;
  });
}

function cloneMeshMaterialsForLedLighting(object) {
  if (!object.isMesh || !object.material) {
    return [];
  }

  if (Array.isArray(object.material)) {
    object.material = object.material.map((material) => material.clone());
    return object.material;
  }

  object.material = object.material.clone();
  return [object.material];
}

function cacheOriginalLedMaterials(part) {
  if (!part || part.userData.ledMaterialCache) {
    return;
  }

  const cache = [];

  part.userData.content?.traverse((object) => {
    if (!object.isMesh || !object.material) {
      return;
    }

    // Node1 = LED dome/body
    // Node2 = metal leads
    if (object.name !== 'Node1') {
      return;
    }

    const materials = cloneMeshMaterialsForLedLighting(object);

    for (const material of materials) {
      cache.push({
        object,
        material,
        color: material.color?.clone?.() ?? null,
        emissive: material.emissive?.clone?.() ?? null,
        emissiveIntensity: material.emissiveIntensity ?? 0,
        opacity: material.opacity ?? 1,
        transparent: material.transparent ?? false,
      });
    }
  });

  part.userData.ledMaterialCache = cache;
}

function setLedVisualState(partOrId, isOn) {
  const part =
    typeof partOrId === 'string'
      ? findPlacedPartById(partOrId)
      : partOrId;

  if (!part || part.userData.definitionKey !== 'ledRed') {
    return;
  }

  cacheOriginalLedMaterials(part);

  for (const entry of part.userData.ledMaterialCache ?? []) {
    const material = entry.material;

    if (!material) {
      continue;
    }

    if (isOn) {
      material.color?.setHex?.(LED_ON_COLOR);

      if (material.emissive) {
        material.emissive.setHex(LED_ON_EMISSIVE);
        material.emissiveIntensity = 2.5;
      }

      material.transparent = true;
      material.opacity = 0.95;
    } else {
      if (entry.color && material.color) {
        material.color.copy(entry.color);
      } else {
        material.color?.setHex?.(LED_OFF_COLOR);
      }

      if (entry.emissive && material.emissive) {
        material.emissive.copy(entry.emissive);
      } else if (material.emissive) {
        material.emissive.setHex(LED_OFF_EMISSIVE);
      }

      material.emissiveIntensity = entry.emissiveIntensity;
      material.opacity = entry.opacity;
      material.transparent = entry.transparent;
    }

    material.needsUpdate = true;
  }

  part.userData.isLedOn = isOn;
}

function updateLedVisualsFromArduinoPinStates(pinStates) {
  const snapshot = buildAvrSimulationSnapshot();
  const ledPaths = findLedOutputPaths(snapshot);

  const poweredLedIds = new Set();

  for (const path of ledPaths) {
    const pinState = pinStates[path.pin];

    if (!pinState) {
      continue;
    }

    const isPowered =
      path.activeWhen === 'HIGH'
        ? pinState.mode === 'output' && pinState.value === true
        : pinState.mode === 'output' && pinState.value === false;

    if (isPowered) {
      poweredLedIds.add(path.ledId);
    }
  }

  for (const part of placedParts) {
    if (part.userData.definitionKey !== 'ledRed') {
      continue;
    }

    setLedVisualState(part, poweredLedIds.has(part.uuid));
  }
}

function ensureAvrRunner() {
  if (avrRunner) {
    return avrRunner;
  }

  avrRunner = new UnoAvrRunner({
    onPinStatesChanged: (pinStates) => {
      updateLedVisualsFromArduinoPinStates(pinStates);
    },
  });

  return avrRunner;
}

async function compileAndRunArduinoSketch(sourceCode) {
  const source = String(sourceCode || '').trim();

  if (!source) {
    console.warn('No Arduino sketch source provided.');
    return;
  }

  let compileResult;

  try {
    compileResult = await compileArduinoSketch(source);
  } catch (error) {
    console.error('Arduino compile failed:', error);
    setStatus?.(`Compile failed: ${error.message}`);
    return;
  }

  const hexText = String(compileResult?.hex || '').trim();

  if (!hexText) {
    console.error('Compiler stdout:', compileResult?.stdout);
    console.error('Compiler stderr:', compileResult?.stderr);
    setStatus?.(
      compileResult?.stderr ||
      compileResult?.stdout ||
      'Compiler did not return a HEX program.'
    );
    return;
  }

  startAvrHexWithExistingSimulator(hexText);

  console.log('Arduino sketch compiled and AVR simulation started.');
  console.log('Compiler stdout:', compileResult.stdout);
  console.log('Compiler stderr:', compileResult.stderr);

  setStatus?.('Arduino sketch compiled and simulation started.');
}

window.testD4High = () => {
  updateLedVisualsFromArduinoPinStates({
    D4: {
      mode: 'output',
      value: true,
    },
  });
};

window.testD4Low = () => {
  updateLedVisualsFromArduinoPinStates({
    D4: {
      mode: 'output',
      value: false,
    },
  });
};

window.testLedOn = () => {
  for (const part of placedParts) {
    if (part.userData.definitionKey === 'ledRed') {
      setLedVisualState(part, true);
    }
  }
};

window.testLedOff = () => {
  for (const part of placedParts) {
    if (part.userData.definitionKey === 'ledRed') {
      setLedVisualState(part, false);
    }
  }
};

window.debugLedMeshes = () => {
  for (const part of placedParts) {
    if (part.userData.definitionKey !== 'ledRed') continue;

    console.log('LED part:', part.uuid);

    part.userData.content?.traverse((object) => {
      if (!object.isMesh) return;

      console.log({
        meshName: object.name,
        materialName: Array.isArray(object.material)
          ? object.material.map((m) => m?.name)
          : object.material?.name,
        materialColor: Array.isArray(object.material)
          ? object.material.map((m) => m?.color?.getHexString?.())
          : object.material?.color?.getHexString?.(),
      });
    });
  }
};


window.loadAvrHex = (hexText) => {
  const runner = ensureAvrRunner();
  runner.loadHex(hexText);
  console.log('AVR HEX loaded.');
};

window.startAvr = () => {
  ensureAvrRunner().start();
  console.log('AVR simulation started.');
};

window.stopAvr = () => {
  stopArduinoSimulation();
};

window.debugAvrPinStates = () => {
  const states = ensureAvrRunner().readDigitalPinStates();
  console.table(states);
  return states;
};

window.runBlinkD4 = async () => {
  await compileAndRunArduinoSketch(`
void setup() {
  pinMode(4, OUTPUT);
}

void loop() {
  digitalWrite(4, HIGH);
  delay(500);
  digitalWrite(4, LOW);
  delay(500);
}
`);
};

function refreshConnectivityPanel() {
  if (!connectionSummaryLine || !connectionList) {
    return;
  }

  const groups = buildCircuitConnectivityGroups();
  clearElementChildren(connectionList);

  if (groups.length === 0) {
    connectionSummaryLine.textContent =
      'No interconnected wire ends or component leads yet.';

    const emptyState = document.createElement('p');
    emptyState.className = 'connection-panel__empty';
    emptyState.textContent =
      'Drop wire plugs or component legs into the breadboard to see shared nets here.';
    connectionList.appendChild(emptyState);
    return;
  }

  const totalEndpoints = groups.reduce(
    (endpointCount, group) => endpointCount + group.members.length,
    0
  );
  connectionSummaryLine.textContent =
    `${groups.length} interconnection ${groups.length === 1 ? 'group' : 'groups'} across ${totalEndpoints} attached endpoints.`;

  groups.forEach((group, groupIndex) => {
    const card = document.createElement('article');
    card.className = 'connection-card';

    const netLabel = document.createElement('p');
    netLabel.className = 'connection-card__eyebrow';
    netLabel.textContent = `Net ${groupIndex + 1}`;
    card.appendChild(netLabel);

    const title = document.createElement('h3');
    title.className = 'connection-card__title';
    title.textContent = group.nodes.join(' + ');
    card.appendChild(title);

    const members = document.createElement('div');
    members.className = 'connection-card__members';

    group.members.forEach((member) => {
      const memberRow = document.createElement('div');
      memberRow.className = 'connection-card__member';

      const memberLabel = document.createElement('span');
      memberLabel.className = 'connection-card__member-label';
      memberLabel.textContent = member.label;

      const memberLocation = document.createElement('span');
      memberLocation.className = 'connection-card__member-location';
      memberLocation.textContent = member.locationLabel;

      memberRow.append(memberLabel, memberLocation);
      members.appendChild(memberRow);
    });

    card.appendChild(members);
    connectionList.appendChild(card);
  });
}

function setCanvasCursor(cursor) {
  renderer.domElement.style.cursor = cursor;
}

function clampPositionUnits(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return THREE.MathUtils.clamp(value, -POSITION_LIMIT, POSITION_LIMIT);
}

function clampRotationDegrees(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return THREE.MathUtils.clamp(value, -180, 180);
}

function clampSurfaceSizeUnits(value) {
  if (!Number.isFinite(value)) {
    return BREADBOARD_PITCH;
  }

  return THREE.MathUtils.clamp(value, BREADBOARD_PITCH, SURFACE_SIZE_LIMIT);
}

function formatPositionUnits(value) {
  return value.toFixed(1);
}

function formatPartLeadMarkerOffsetUnits(value) {
  return value.toFixed(PART_LEAD_MARKER_OFFSET_PRECISION);
}

function formatRotationDegrees(value) {
  return `${value.toFixed(1)}deg`;
}

function formatSurfaceSizeUnits(value) {
  return value.toFixed(1);
}

function buildPositionSummary(key) {
  const state = positionState[key];
  return `x ${formatPositionUnits(state.x)}  y ${formatPositionUnits(state.y)}  z ${formatPositionUnits(state.z)}`;
}

function buildRotationSummary(key) {
  const state = rotationState[key];
  return `x ${formatRotationDegrees(state.x)}  y ${formatRotationDegrees(state.y)}  z ${formatRotationDegrees(state.z)}`;
}

function buildSurfaceSizeSummary(key) {
  const state = surfaceSizeState[key];
  return `width ${formatSurfaceSizeUnits(state.width)}  depth ${formatSurfaceSizeUnits(state.depth)}`;
}

function buildTransformCopyLine(config) {
  const parts = [];

  if (config.enablePosition) {
    const basePosition = BASE_POSITIONS[config.key];
    const hasBasePosition =
      basePosition && (basePosition.x !== 0 || basePosition.y !== 0 || basePosition.z !== 0);

    parts.push(
      hasBasePosition
        ? `position offset ${buildPositionSummary(config.key)} | base x ${formatPositionUnits(basePosition.x)}  y ${formatPositionUnits(basePosition.y)}  z ${formatPositionUnits(basePosition.z)}`
        : `position offset ${buildPositionSummary(config.key)}`
    );
  }

  if (config.enableRotation) {
    const baseRotation = BASE_ROTATIONS[config.key];
    const hasBaseRotation =
      baseRotation && (baseRotation.x !== 0 || baseRotation.y !== 0 || baseRotation.z !== 0);

    parts.push(
      hasBaseRotation
        ? `rotation offset ${buildRotationSummary(config.key)} | base x ${formatRotationDegrees(baseRotation.x)}  y ${formatRotationDegrees(baseRotation.y)}  z ${formatRotationDegrees(baseRotation.z)}`
        : `rotation offset ${buildRotationSummary(config.key)}`
    );
  }

  if (config.enableSize) {
    const baseSize = BASE_SURFACE_SIZES[config.key];
    parts.push(
      baseSize
        ? `surface size ${buildSurfaceSizeSummary(config.key)} | base width ${formatSurfaceSizeUnits(baseSize.width)}  depth ${formatSurfaceSizeUnits(baseSize.depth)}`
        : `surface size ${buildSurfaceSizeSummary(config.key)}`
    );
  }

  return `${config.label}: ${parts.join(' | ')}`;
}

function setObjectPositionFromBase(object, baseState, offsetState) {
  object.position.set(
    baseState.x + offsetState.x,
    baseState.y + offsetState.y,
    baseState.z + offsetState.z
  );
}

function copyStateToVector(state, target) {
  return target.set(state.x, state.y, state.z);
}

function setObjectEulerDegrees(object, state) {
  object.rotation.set(
    state.x * DEG_TO_RAD,
    state.y * DEG_TO_RAD,
    state.z * DEG_TO_RAD,
    'XYZ'
  );
}

function applySurfaceGuideSize(key) {
  const guide = surfaceGuides.get(key);

  if (!guide) {
    return;
  }

  const baseSize = BASE_SURFACE_SIZES[key];
  const nextSize = surfaceSizeState[key];
  guide.scale.set(
    nextSize.width / baseSize.width,
    1,
    nextSize.depth / baseSize.depth
  );
}

function applyAllSurfaceGuideSizes() {
  for (const key of Object.keys(surfaceSizeState)) {
    applySurfaceGuideSize(key);
  }
}

function updateWireRotationOffsets() {
  const startState = rotationState.wireStart;
  wireStartRotationOffset.setFromEuler(
    new THREE.Euler(
      startState.x * DEG_TO_RAD,
      startState.y * DEG_TO_RAD,
      startState.z * DEG_TO_RAD,
      'XYZ'
    )
  );

  const endState = rotationState.wireEnd;
  wireEndRotationOffset.setFromEuler(
    new THREE.Euler(
      endState.x * DEG_TO_RAD,
      endState.y * DEG_TO_RAD,
      endState.z * DEG_TO_RAD,
      'XYZ'
    )
  );
}

function getSurfaceKeyForEnd(wire, endKey) {
  return endKey === 'start' ? wire.startSurfaceKey : wire.endSurfaceKey;
}

function setSurfaceKeyForEnd(wire, endKey, surfaceKey) {
  if (endKey === 'start') {
    wire.startSurfaceKey = surfaceKey;
    return;
  }

  wire.endSurfaceKey = surfaceKey;
}

function getAllSnapTargets() {
  return [...arduinoTargets, ...breadboardTargets];
}

function getAllWireHitAreas() {
  const hitAreas = [];

  for (const wire of interactiveWires) {
    if (wire.startHitArea) {
      hitAreas.push(wire.startHitArea);
    }

    if (wire.endHitArea) {
      hitAreas.push(wire.endHitArea);
    }
  }

  return hitAreas;
}

function getDefaultTargetForSurface(surfaceKey) {
  if (surfaceKey === 'breadboardSurface') {
    return (
      breadboardTargets.find((target) => !target.userData.isPowerRail) ??
      breadboardTargets[0] ??
      null
    );
  }

  if (surfaceKey === 'arduinoHeaderLeft' || surfaceKey === 'arduinoHeaderRight') {
    return (
      arduinoTargets.find((target) => target.userData.surfaceKey === surfaceKey) ??
      arduinoTargets[0] ??
      breadboardTargets.find((target) => !target.userData.isPowerRail) ??
      breadboardTargets[0] ??
      null
    );
  }

  return (
    arduinoTargets[0] ??
    breadboardTargets.find((target) => !target.userData.isPowerRail) ??
    breadboardTargets[0] ??
    null
  );
}

function getFallbackTargetForEnd(wire, endKey) {
  const snappedTarget = endKey === 'start' ? wire.startSnappedTarget : wire.endSnappedTarget;
  return snappedTarget ?? getDefaultTargetForSurface(getSurfaceKeyForEnd(wire, endKey));
}

function isTargetSnappedByAnyWire(target) {
  return interactiveWires.some(
    (wire) => wire.startSnappedTarget === target || wire.endSnappedTarget === target
  );
}

function getLatestConnectedWire(requireBothEnds = false) {
  for (let index = interactiveWires.length - 1; index >= 0; index -= 1) {
    const wire = interactiveWires[index];
    const isConnected = requireBothEnds
      ? Boolean(wire.startSnappedTarget && wire.endSnappedTarget)
      : Boolean(wire.startSnappedTarget || wire.endSnappedTarget);

    if (isConnected) {
      return wire;
    }
  }

  return null;
}

function buildTargetConnectionLabel(target) {
  if (!target) {
    return 'target hole';
  }

  return target.userData.surfaceKey === 'breadboardSurface'
    ? `breadboard ${target.userData.label}`
    : `Arduino ${target.userData.label}`;
}

function getSurfaceGuide(key) {
  return surfaceGuides.get(key) ?? null;
}

function getSurfaceNormal(key, output) {
  const guide = getSurfaceGuide(key);

  if (!guide) {
    return output.copy(upAxis);
  }

  output.set(0, 1, 0).transformDirection(guide.matrixWorld).normalize();

  if (output.dot(upAxis) < 0) {
    output.multiplyScalar(-1);
  }

  return output;
}

function getSurfaceOrigin(key, output) {
  const guide = getSurfaceGuide(key);

  if (!guide) {
    return output.set(0, 0, 0);
  }

  return guide.getWorldPosition(output);
}

function clampWorldPointToSurface(worldPoint, surfaceKey, output) {
  const guide = getSurfaceGuide(surfaceKey);
  const baseSize = BASE_SURFACE_SIZES[surfaceKey];

  if (!guide || !baseSize) {
    return null;
  }

  tempSurfaceLocalPoint.copy(worldPoint);
  guide.worldToLocal(tempSurfaceLocalPoint);
  tempSurfaceLocalPoint.x = THREE.MathUtils.clamp(
    tempSurfaceLocalPoint.x,
    -baseSize.width / 2,
    baseSize.width / 2
  );
  tempSurfaceLocalPoint.y = 0;
  tempSurfaceLocalPoint.z = THREE.MathUtils.clamp(
    tempSurfaceLocalPoint.z,
    -baseSize.depth / 2,
    baseSize.depth / 2
  );
  guide.localToWorld(tempSurfaceLocalPoint);

  return output.copy(tempSurfaceLocalPoint);
}

function getClampedPointOnSurfaceFromRay(ray, surfaceKey, output) {
  const guide = getSurfaceGuide(surfaceKey);

  if (!guide) {
    return false;
  }

  getSurfaceNormal(surfaceKey, tempNormal);
  getSurfaceOrigin(surfaceKey, tempSurfaceOrigin);
  tempSurfacePlane.setFromNormalAndCoplanarPoint(tempNormal, tempSurfaceOrigin);

  if (!ray.intersectPlane(tempSurfacePlane, output)) {
    return false;
  }

  clampWorldPointToSurface(output, surfaceKey, output);
  return true;
}

function getClampedDragPointForEnd(wire, endKey, ray, output) {
  const surfaceKeys = DRAG_SURFACE_KEYS[endKey];

  if (!surfaceKeys || surfaceKeys.length === 0) {
    return null;
  }

  let bestSurfaceKey = null;
  let bestDistance = Infinity;

  for (const surfaceKey of surfaceKeys) {
    if (!getClampedPointOnSurfaceFromRay(ray, surfaceKey, tempSurfaceCandidate)) {
      continue;
    }

    const distance = ray.distanceSqToPoint(tempSurfaceCandidate);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestSurfaceKey = surfaceKey;
      tempSurfaceCandidateB.copy(tempSurfaceCandidate);
    }
  }

  if (!bestSurfaceKey) {
    const fallbackSurfaceKey = getSurfaceKeyForEnd(wire, endKey);

    if (
      fallbackSurfaceKey &&
      getClampedPointOnSurfaceFromRay(ray, fallbackSurfaceKey, tempSurfaceCandidateB)
    ) {
      output.copy(tempSurfaceCandidateB);
      return fallbackSurfaceKey;
    }

    return null;
  }

  output.copy(tempSurfaceCandidateB);
  return bestSurfaceKey;
}

function getTargetWorldNormal(target, output) {
  output.set(0, 1, 0).transformDirection(target.matrixWorld).normalize();

  if (output.dot(upAxis) < 0) {
    output.multiplyScalar(-1);
  }

  return output;
}

function alignArduinoStartAnchorToHeader() {
  if (!startAnchor || startAnchor.parent !== arduino) {
    return;
  }

  // Legacy single-target Arduino anchors lived directly under the board root,
  // so keep that behavior if one is ever reintroduced.
  if (arduinoHeaderLeft) {
    startAnchor.quaternion.copy(arduinoHeaderLeft.quaternion);
  }
}

function updateArduinoDragPlane() {
  const activeWire = wireState.activeWire ?? interactiveWires[0] ?? null;

  if (getAllSnapTargets().length === 0 || !activeWire) {
    return;
  }

  if (!(wireState.dragging && wireState.draggedEnd === 'start' && wireState.hoveredTarget)) {
    const surfaceKey = getSurfaceKeyForEnd(activeWire, 'start');

    if (surfaceKey) {
      getSurfaceNormal(surfaceKey, tempBreadboardNormal);
      arduinoDragPlane.setFromNormalAndCoplanarPoint(
        tempBreadboardNormal,
        getSurfaceOrigin(surfaceKey, tempSurfaceOrigin)
      );
      return;
    }
  }

  const planeTarget =
    wireState.dragging && wireState.draggedEnd === 'start' && wireState.hoveredTarget
      ? wireState.hoveredTarget
      : getFallbackTargetForEnd(activeWire, 'start');

  if (!planeTarget) {
    return;
  }

  getTargetWorldNormal(planeTarget, tempBreadboardNormal);
  arduinoDragPlane.setFromNormalAndCoplanarPoint(
    tempBreadboardNormal,
    planeTarget.userData.worldPosition
  );
}

function updateBreadboardDragPlane() {
  const activeWire = wireState.activeWire ?? interactiveWires[0] ?? null;

  if (getAllSnapTargets().length === 0 || !activeWire) {
    return;
  }

  if (!(wireState.dragging && wireState.draggedEnd === 'end' && wireState.hoveredTarget)) {
    const surfaceKey = getSurfaceKeyForEnd(activeWire, 'end');

    if (surfaceKey) {
      getSurfaceNormal(surfaceKey, tempBreadboardNormal);
      breadboardDragPlane.setFromNormalAndCoplanarPoint(
        tempBreadboardNormal,
        getSurfaceOrigin(surfaceKey, tempSurfaceOrigin)
      );
      return;
    }
  }

  const planeTarget =
    wireState.dragging && wireState.draggedEnd === 'end' && wireState.hoveredTarget
      ? wireState.hoveredTarget
      : getFallbackTargetForEnd(activeWire, 'end');

  if (!planeTarget) {
    return;
  }

  getTargetWorldNormal(planeTarget, tempBreadboardNormal);
  breadboardDragPlane.setFromNormalAndCoplanarPoint(
    tempBreadboardNormal,
    planeTarget.userData.worldPosition
  );
}

function getPlugSurfaceNormal(wire, endKey, output) {
  const isDraggingThisEnd =
    wireState.dragging && wireState.activeWire === wire && wireState.draggedEnd === endKey;
  const hoveredTarget = isDraggingThisEnd ? wireState.hoveredTarget : null;
  const snappedTarget = endKey === 'start' ? wire.startSnappedTarget : wire.endSnappedTarget;
  const surfaceKey = getSurfaceKeyForEnd(wire, endKey);
  const fallbackTarget = getFallbackTargetForEnd(wire, endKey);

  if (hoveredTarget) {
    return getTargetWorldNormal(hoveredTarget, output);
  }

  if (snappedTarget) {
    return getTargetWorldNormal(snappedTarget, output);
  }

  if (surfaceKey) {
    return getSurfaceNormal(surfaceKey, output);
  }

  if (fallbackTarget) {
    return getTargetWorldNormal(fallbackTarget, output);
  }

  output.copy(endKey === 'start' ? arduinoDragPlane.normal : breadboardDragPlane.normal);

  if (output.lengthSq() === 0) {
    output.copy(upAxis);
  }

  if (output.dot(upAxis) < 0) {
    output.multiplyScalar(-1);
  }

  return output.normalize();
}

function syncInteractiveTransforms() {
  if (!arduino || !breadboard) {
    return;
  }

  alignArduinoStartAnchorToHeader();
  assembly.updateMatrixWorld(true);

  if (startAnchor) {
    startAnchor.userData.worldPosition ??= new THREE.Vector3();
    startAnchor.getWorldPosition(startAnchor.userData.worldPosition);
  }

  cacheSnapTargetWorldPositions();
  updateArduinoDragPlane();
  updateBreadboardDragPlane();

  for (const wire of interactiveWires) {
    if (wire.startSnappedTarget) {
      wire.startTip.copy(wire.startSnappedTarget.userData.worldPosition);
    }

    if (wire.endSnappedTarget) {
      wire.endTip.copy(wire.endSnappedTarget.userData.worldPosition);
    }

    if (wire.cableMesh && wire.endPlug) {
      updateWireGeometry(wire);
    }
  }

  for (const part of placedParts) {
    if (part.userData.startSnappedTarget) {
      writePartLeadLocalPositionFromTarget(
        part,
        'start',
        part.userData.startSnappedTarget,
        part.userData.startLeadPositionLocal
      );
    }

    if (part.userData.endSnappedTarget) {
      writePartLeadLocalPositionFromTarget(
        part,
        'end',
        part.userData.endSnappedTarget,
        part.userData.endLeadPositionLocal
      );
    }

    updateInteractivePartTransform(part);
    updatePartLeadLandingTargets(part);
    updatePartBodyHitArea(part);
  }

  refreshTargetVisuals();
  refreshConnectivityPanel();
  updateStatusForState();
}

function applyDebugTransforms() {
  if (arduinoRigRoot) {
    setObjectPositionFromBase(arduinoRigRoot, BASE_POSITIONS.arduino, positionState.arduino);
  }

  if (breadboardRigRoot) {
    setObjectPositionFromBase(
      breadboardRigRoot,
      BASE_POSITIONS.breadboard,
      positionState.breadboard
    );
  }

  if (arduino) {
    setObjectEulerDegrees(arduino, rotationState.arduino);
  }

  if (breadboard) {
    setObjectEulerDegrees(breadboard, rotationState.breadboard);
  }

  if (arduinoHeaderLeft) {
    setObjectPositionFromBase(
      arduinoHeaderLeft,
      BASE_POSITIONS.arduinoHeaderLeft,
      positionState.arduinoHeaderLeft
    );
    setObjectEulerDegrees(arduinoHeaderLeft, rotationState.arduinoHeaderLeft);
  }

  if (arduinoHeaderRight) {
    setObjectPositionFromBase(
      arduinoHeaderRight,
      BASE_POSITIONS.arduinoHeaderRight,
      positionState.arduinoHeaderRight
    );
    setObjectEulerDegrees(arduinoHeaderRight, rotationState.arduinoHeaderRight);
  }

  if (breadboardSurface) {
    setObjectPositionFromBase(
      breadboardSurface,
      BASE_POSITIONS.breadboardSurface,
      positionState.breadboardSurface
    );
    setObjectEulerDegrees(breadboardSurface, rotationState.breadboardSurface);
  }

  applyArduinoHeaderGroupTransforms();
  applyPowerRailGroupTransforms();
  applyAllSurfaceGuideSizes();
  updateWireRotationOffsets();
  syncInteractiveTransforms();
}

function refreshTransformSection(key) {
  const section = transformUi.get(key);

  if (!section) {
    return;
  }

  for (const axis of ['x', 'y', 'z']) {
    if (section.controls.position) {
      section.controls.position[axis].range.value = String(positionState[key][axis]);
      section.controls.position[axis].number.value = positionState[key][axis].toFixed(1);
    }

    if (section.controls.rotation) {
      section.controls.rotation[axis].range.value = String(rotationState[key][axis]);
      section.controls.rotation[axis].number.value = rotationState[key][axis].toFixed(1);
    }
  }

  if (section.controls.size) {
    for (const axis of ['width', 'depth']) {
      section.controls.size[axis].range.value = String(surfaceSizeState[key][axis]);
      section.controls.size[axis].number.value = surfaceSizeState[key][axis].toFixed(1);
    }
  }

  if (section.positionReadout) {
    section.positionReadout.textContent = `Position: ${buildPositionSummary(key)}`;
  }

  if (section.rotationReadout) {
    section.rotationReadout.textContent = `Rotation: ${buildRotationSummary(key)}`;
  }

  if (section.sizeReadout) {
    section.sizeReadout.textContent = `Surface Size: ${buildSurfaceSizeSummary(key)}`;
  }
}

function setPositionValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampPositionUnits(parsed);
  positionState[key][axis] = value;

  refreshTransformSection(key);
  applyDebugTransforms();
}

function setRotationValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampRotationDegrees(parsed);
  rotationState[key][axis] = value;

  refreshTransformSection(key);
  applyDebugTransforms();
}

function setSurfaceSizeValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampSurfaceSizeUnits(parsed);
  surfaceSizeState[key][axis] = value;

  refreshTransformSection(key);
  applyDebugTransforms();
}

function createAxisControlMarkup(
  axis,
  value,
  type,
  limits,
  label = axis.toUpperCase(),
  precision = 1
) {
  return `
    <label class="rotation-row">
      <span class="rotation-row__axis">${label}</span>
      <input
        class="rotation-row__slider"
        data-group="${type}"
        data-axis="${axis}"
        data-role="range"
        type="range"
        min="${limits.min}"
        max="${limits.max}"
        step="${limits.rangeStep}"
        value="${value}"
      />
      <input
        class="rotation-row__number"
        data-group="${type}"
        data-axis="${axis}"
        data-role="number"
        type="number"
        min="${limits.min}"
        max="${limits.max}"
        step="${limits.numberStep}"
        value="${value.toFixed(precision)}"
      />
    </label>
  `;
}

function createTransformSection(config) {
  const section = document.createElement('section');
  section.className = 'rotation-card';
  section.style.setProperty('--accent', config.accent);

  const positionMarkup = config.enablePosition
    ? `
      <div class="transform-group">
        <p class="transform-group__title">Position Offset</p>
        ${['x', 'y', 'z']
          .map((axis) =>
            createAxisControlMarkup(
              axis,
              positionState[config.key][axis],
              'position',
              {
                min: -POSITION_LIMIT,
                max: POSITION_LIMIT,
                rangeStep: 1,
                numberStep: 0.1,
              }
            )
          )
          .join('')}
      </div>
    `
    : '';

  const rotationMarkup = config.enableRotation
    ? `
      <div class="transform-group">
        <p class="transform-group__title">Rotation Offset</p>
        ${['x', 'y', 'z']
          .map((axis) =>
            createAxisControlMarkup(
              axis,
              rotationState[config.key][axis],
              'rotation',
              {
                min: -180,
                max: 180,
                rangeStep: 1,
                numberStep: 0.1,
              }
            )
          )
          .join('')}
      </div>
    `
    : '';

  const sizeMarkup = config.enableSize
    ? `
      <div class="transform-group">
        <p class="transform-group__title">Surface Size</p>
        ${[
          { axis: 'width', label: 'W' },
          { axis: 'depth', label: 'D' },
        ]
          .map(({ axis, label }) =>
            createAxisControlMarkup(
              axis,
              surfaceSizeState[config.key][axis],
              'size',
              {
                min: BREADBOARD_PITCH,
                max: SURFACE_SIZE_LIMIT,
                rangeStep: 0.5,
                numberStep: 0.1,
              },
              label
            )
          )
          .join('')}
      </div>
    `
    : '';

  section.innerHTML = `
    <div class="rotation-card__header">
      <h3>${config.label}</h3>
      ${config.enablePosition ? '<p data-position-readout></p>' : ''}
      ${config.enableRotation ? '<p data-rotation-readout></p>' : ''}
      ${config.enableSize ? '<p data-size-readout></p>' : ''}
    </div>
    ${positionMarkup}
    ${rotationMarkup}
    ${sizeMarkup}
  `;

  const controls = {
    position: config.enablePosition ? { x: {}, y: {}, z: {} } : null,
    rotation: config.enableRotation ? { x: {}, y: {}, z: {} } : null,
    size: config.enableSize ? { width: {}, depth: {} } : null,
  };

  for (const group of ['position', 'rotation']) {
    if (!controls[group]) {
      continue;
    }

    for (const axis of ['x', 'y', 'z']) {
      const range = section.querySelector(
        `[data-group="${group}"][data-axis="${axis}"][data-role="range"]`
      );
      const number = section.querySelector(
        `[data-group="${group}"][data-axis="${axis}"][data-role="number"]`
      );

      const handleInput = (event) => {
        if (group === 'position') {
          setPositionValue(config.key, axis, event.target.value);
          return;
        }

        setRotationValue(config.key, axis, event.target.value);
      };

      range.addEventListener('input', handleInput);
      number.addEventListener('input', handleInput);

      controls[group][axis] = { range, number };
    }
  }

  if (controls.size) {
    for (const axis of ['width', 'depth']) {
      const range = section.querySelector(
        `[data-group="size"][data-axis="${axis}"][data-role="range"]`
      );
      const number = section.querySelector(
        `[data-group="size"][data-axis="${axis}"][data-role="number"]`
      );

      const handleInput = (event) => {
        setSurfaceSizeValue(config.key, axis, event.target.value);
      };

      range.addEventListener('input', handleInput);
      number.addEventListener('input', handleInput);

      controls.size[axis] = { range, number };
    }
  }

  transformUi.set(config.key, {
    positionReadout: config.enablePosition ? section.querySelector('[data-position-readout]') : null,
    rotationReadout: config.enableRotation ? section.querySelector('[data-rotation-readout]') : null,
    sizeReadout: config.enableSize ? section.querySelector('[data-size-readout]') : null,
    controls,
  });

  refreshTransformSection(config.key);

  return section;
}

function buildTransformDebugPanel() {
  for (const config of TRANSFORM_SECTIONS) {
    debugSectionsRoot.appendChild(createTransformSection(config));
  }

  copyRotationsButton.addEventListener('click', async () => {
    const lines = TRANSFORM_SECTIONS.map((config) => buildTransformCopyLine(config));

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus('Copied current transform values to the clipboard.');
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      setStatus('Clipboard access is unavailable. Read the transform values directly from the debug panel.');
    }
  });

  resetRotationsButton.addEventListener('click', () => {
    for (const config of TRANSFORM_SECTIONS) {
      if (config.enablePosition) {
        positionState[config.key] = { ...DEFAULT_POSITIONS[config.key] };
      }

      if (config.enableRotation) {
        rotationState[config.key] = { ...DEFAULT_ROTATIONS[config.key] };
      }

      if (config.enableSize) {
        surfaceSizeState[config.key] = { ...DEFAULT_SURFACE_SIZES[config.key] };
      }

      refreshTransformSection(config.key);
    }

    applyDebugTransforms();
    setStatus('Reset all model transforms to the current defaults.');
  });
}

function buildPowerRailGroupOffsetSummary(key) {
  const state = powerRailGroupPositionState[key];
  return `x ${formatPositionUnits(state.x)}  y ${formatPositionUnits(state.y)}  z ${formatPositionUnits(state.z)}`;
}

function buildPowerRailGroupRotationSummary(key) {
  const state = powerRailGroupRotationState[key];
  return `x ${formatRotationDegrees(state.x)}  y ${formatRotationDegrees(state.y)}  z ${formatRotationDegrees(state.z)}`;
}

function buildPowerRailGroupCurrentPositionSummary(key) {
  const definition = POWER_RAIL_GROUP_DEFINITION_BY_KEY.get(key);
  const offset = powerRailGroupPositionState[key];

  return `x ${formatPositionUnits(definition.basePosition.x + offset.x)}  y ${formatPositionUnits(definition.basePosition.y + offset.y)}  z ${formatPositionUnits(definition.basePosition.z + offset.z)}`;
}

function refreshPowerRailGroupSection(key) {
  const section = powerRailGroupUi.get(key);

  if (!section) {
    return;
  }

  for (const axis of ['x', 'y', 'z']) {
    section.controls.position[axis].range.value = String(powerRailGroupPositionState[key][axis]);
    section.controls.position[axis].number.value =
      powerRailGroupPositionState[key][axis].toFixed(1);
    section.controls.rotation[axis].range.value = String(powerRailGroupRotationState[key][axis]);
    section.controls.rotation[axis].number.value =
      powerRailGroupRotationState[key][axis].toFixed(1);
  }

  section.originReadout.textContent = `Origin: ${buildPowerRailGroupCurrentPositionSummary(key)}`;
  section.positionReadout.textContent = `Offset: ${buildPowerRailGroupOffsetSummary(key)}`;
  section.rotationReadout.textContent = `Rotation: ${buildPowerRailGroupRotationSummary(key)}`;
}

function setPowerRailGroupPositionValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampPositionUnits(parsed);
  powerRailGroupPositionState[key][axis] = value;

  refreshPowerRailGroupSection(key);
  applyDebugTransforms();
}

function setPowerRailGroupRotationValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampRotationDegrees(parsed);
  powerRailGroupRotationState[key][axis] = value;

  refreshPowerRailGroupSection(key);
  applyDebugTransforms();
}

function createPowerRailGroupSection(definition) {
  const section = document.createElement('section');
  section.className = 'rotation-card';
  section.style.setProperty('--accent', definition.accent);

  section.innerHTML = `
    <div class="rotation-card__header">
      <h3>${definition.label}</h3>
      <p data-origin-readout></p>
      <p data-position-readout></p>
      <p data-rotation-readout></p>
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Position Offset</p>
      ${['x', 'y', 'z']
        .map((axis) =>
          createAxisControlMarkup(
            axis,
            powerRailGroupPositionState[definition.key][axis],
            'position',
            {
              min: -POSITION_LIMIT,
              max: POSITION_LIMIT,
              rangeStep: 1,
              numberStep: 0.1,
            }
          )
        )
        .join('')}
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Rotation Offset</p>
      ${['x', 'y', 'z']
        .map((axis) =>
          createAxisControlMarkup(
            axis,
            powerRailGroupRotationState[definition.key][axis],
            'rotation',
            {
              min: -180,
              max: 180,
              rangeStep: 1,
              numberStep: 0.1,
            }
          )
        )
        .join('')}
    </div>
  `;

  const controls = {
    position: { x: {}, y: {}, z: {} },
    rotation: { x: {}, y: {}, z: {} },
  };

  for (const group of ['position', 'rotation']) {
    for (const axis of ['x', 'y', 'z']) {
      const range = section.querySelector(
        `[data-group="${group}"][data-axis="${axis}"][data-role="range"]`
      );
      const number = section.querySelector(
        `[data-group="${group}"][data-axis="${axis}"][data-role="number"]`
      );

      const handleInput = (event) => {
        if (group === 'position') {
          setPowerRailGroupPositionValue(definition.key, axis, event.target.value);
          return;
        }

        setPowerRailGroupRotationValue(definition.key, axis, event.target.value);
      };

      range.addEventListener('input', handleInput);
      number.addEventListener('input', handleInput);

      controls[group][axis] = { range, number };
    }
  }

  powerRailGroupUi.set(definition.key, {
    originReadout: section.querySelector('[data-origin-readout]'),
    positionReadout: section.querySelector('[data-position-readout]'),
    rotationReadout: section.querySelector('[data-rotation-readout]'),
    controls,
  });

  refreshPowerRailGroupSection(definition.key);

  return section;
}

function buildPowerRailCopyLine(definition) {
  return [
    `${definition.label}:`,
    `origin ${buildPowerRailGroupCurrentPositionSummary(definition.key)}`,
    `offset ${buildPowerRailGroupOffsetSummary(definition.key)}`,
    `rotation ${buildPowerRailGroupRotationSummary(definition.key)}`,
  ].join(' | ');
}

function buildPowerRailCalibrationPanel() {
  for (const definition of POWER_RAIL_GROUP_DEFINITIONS) {
    powerRailSectionsRoot.appendChild(createPowerRailGroupSection(definition));
  }

  copyPowerRailButton.addEventListener('click', async () => {
    const lines = POWER_RAIL_GROUP_DEFINITIONS.map((definition) =>
      buildPowerRailCopyLine(definition)
    );

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus('Copied the current power rail group values to the clipboard.');
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      setStatus('Clipboard access is unavailable. Read the power rail values directly from the calibration panel.');
    }
  });

  resetPowerRailButton.addEventListener('click', () => {
    for (const definition of POWER_RAIL_GROUP_DEFINITIONS) {
      powerRailGroupPositionState[definition.key] = {
        ...DEFAULT_POWER_RAIL_GROUP_POSITIONS[definition.key],
      };
      powerRailGroupRotationState[definition.key] = {
        ...DEFAULT_POWER_RAIL_GROUP_ROTATIONS[definition.key],
      };
      refreshPowerRailGroupSection(definition.key);
    }

    applyDebugTransforms();
    setStatus('Reset all power rail marker group offsets and rotations.');
  });
}

function applyPowerRailGroupTransforms() {
  for (const definition of POWER_RAIL_GROUP_DEFINITIONS) {
    const groupRoot = powerRailGroupRoots.get(definition.key);

    if (!groupRoot) {
      continue;
    }

    setObjectPositionFromBase(
      groupRoot,
      definition.basePosition,
      powerRailGroupPositionState[definition.key]
    );
    setObjectEulerDegrees(groupRoot, powerRailGroupRotationState[definition.key]);
  }
}

function buildArduinoHeaderGroupOffsetSummary(key) {
  const state = arduinoHeaderGroupPositionState[key];
  return `x ${formatPositionUnits(state.x)}  y ${formatPositionUnits(state.y)}  z ${formatPositionUnits(state.z)}`;
}

function buildArduinoHeaderGroupRotationSummary(key) {
  const state = arduinoHeaderGroupRotationState[key];
  return `x ${formatRotationDegrees(state.x)}  y ${formatRotationDegrees(state.y)}  z ${formatRotationDegrees(state.z)}`;
}

function buildArduinoHeaderGroupCurrentPositionSummary(key) {
  const definition = ARDUINO_HEADER_GROUP_DEFINITION_BY_KEY.get(key);
  const offset = arduinoHeaderGroupPositionState[key];

  return `x ${formatPositionUnits(definition.basePosition.x + offset.x)}  y ${formatPositionUnits(definition.basePosition.y + offset.y)}  z ${formatPositionUnits(definition.basePosition.z + offset.z)}`;
}

function refreshArduinoHeaderGroupSection(key) {
  const section = arduinoHeaderGroupUi.get(key);

  if (!section) {
    return;
  }

  for (const axis of ['x', 'y', 'z']) {
    section.controls.position[axis].range.value = String(arduinoHeaderGroupPositionState[key][axis]);
    section.controls.position[axis].number.value =
      arduinoHeaderGroupPositionState[key][axis].toFixed(1);
    section.controls.rotation[axis].range.value = String(arduinoHeaderGroupRotationState[key][axis]);
    section.controls.rotation[axis].number.value =
      arduinoHeaderGroupRotationState[key][axis].toFixed(1);
  }

  section.originReadout.textContent = `Origin: ${buildArduinoHeaderGroupCurrentPositionSummary(key)}`;
  section.positionReadout.textContent = `Offset: ${buildArduinoHeaderGroupOffsetSummary(key)}`;
  section.rotationReadout.textContent = `Rotation: ${buildArduinoHeaderGroupRotationSummary(key)}`;
}

function setArduinoHeaderGroupPositionValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampPositionUnits(parsed);
  arduinoHeaderGroupPositionState[key][axis] = value;

  refreshArduinoHeaderGroupSection(key);
  applyDebugTransforms();
}

function setArduinoHeaderGroupRotationValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampRotationDegrees(parsed);
  arduinoHeaderGroupRotationState[key][axis] = value;

  refreshArduinoHeaderGroupSection(key);
  applyDebugTransforms();
}

function createArduinoHeaderGroupSection(definition) {
  const section = document.createElement('section');
  section.className = 'rotation-card';
  section.style.setProperty('--accent', definition.accent);

  section.innerHTML = `
    <div class="rotation-card__header">
      <h3>${definition.label}</h3>
      <p data-origin-readout></p>
      <p data-position-readout></p>
      <p data-rotation-readout></p>
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Position Offset</p>
      ${['x', 'y', 'z']
        .map((axis) =>
          createAxisControlMarkup(
            axis,
            arduinoHeaderGroupPositionState[definition.key][axis],
            'position',
            {
              min: -POSITION_LIMIT,
              max: POSITION_LIMIT,
              rangeStep: 1,
              numberStep: 0.1,
            }
          )
        )
        .join('')}
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Rotation Offset</p>
      ${['x', 'y', 'z']
        .map((axis) =>
          createAxisControlMarkup(
            axis,
            arduinoHeaderGroupRotationState[definition.key][axis],
            'rotation',
            {
              min: -180,
              max: 180,
              rangeStep: 1,
              numberStep: 0.1,
            }
          )
        )
        .join('')}
    </div>
  `;

  const controls = {
    position: { x: {}, y: {}, z: {} },
    rotation: { x: {}, y: {}, z: {} },
  };

  for (const group of ['position', 'rotation']) {
    for (const axis of ['x', 'y', 'z']) {
      const range = section.querySelector(
        `[data-group="${group}"][data-axis="${axis}"][data-role="range"]`
      );
      const number = section.querySelector(
        `[data-group="${group}"][data-axis="${axis}"][data-role="number"]`
      );

      const handleInput = (event) => {
        if (group === 'position') {
          setArduinoHeaderGroupPositionValue(definition.key, axis, event.target.value);
          return;
        }

        setArduinoHeaderGroupRotationValue(definition.key, axis, event.target.value);
      };

      range.addEventListener('input', handleInput);
      number.addEventListener('input', handleInput);

      controls[group][axis] = { range, number };
    }
  }

  arduinoHeaderGroupUi.set(definition.key, {
    originReadout: section.querySelector('[data-origin-readout]'),
    positionReadout: section.querySelector('[data-position-readout]'),
    rotationReadout: section.querySelector('[data-rotation-readout]'),
    controls,
  });

  refreshArduinoHeaderGroupSection(definition.key);

  return section;
}

function buildArduinoHeaderCopyLine(definition) {
  return [
    `${definition.label}:`,
    `origin ${buildArduinoHeaderGroupCurrentPositionSummary(definition.key)}`,
    `offset ${buildArduinoHeaderGroupOffsetSummary(definition.key)}`,
    `rotation ${buildArduinoHeaderGroupRotationSummary(definition.key)}`,
  ].join(' | ');
}

function buildArduinoHeaderCalibrationPanel() {
  for (const definition of ARDUINO_HEADER_GROUP_DEFINITIONS) {
    arduinoHeaderSectionsRoot.appendChild(createArduinoHeaderGroupSection(definition));
  }

  copyArduinoHeaderButton.addEventListener('click', async () => {
    const lines = ARDUINO_HEADER_GROUP_DEFINITIONS.map((definition) =>
      buildArduinoHeaderCopyLine(definition)
    );

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus('Copied the current Arduino header group values to the clipboard.');
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      setStatus('Clipboard access is unavailable. Read the Arduino header values directly from the calibration panel.');
    }
  });

  resetArduinoHeaderButton.addEventListener('click', () => {
    for (const definition of ARDUINO_HEADER_GROUP_DEFINITIONS) {
      arduinoHeaderGroupPositionState[definition.key] = {
        ...DEFAULT_ARDUINO_HEADER_GROUP_POSITIONS[definition.key],
      };
      arduinoHeaderGroupRotationState[definition.key] = {
        ...DEFAULT_ARDUINO_HEADER_GROUP_ROTATIONS[definition.key],
      };
      refreshArduinoHeaderGroupSection(definition.key);
    }

    applyDebugTransforms();
    setStatus('Reset all Arduino header marker group offsets and rotations.');
  });
}

function clonePartLeadPoint(point) {
  return {
    x: point?.x ?? 0,
    y: point?.y ?? 0,
    z: point?.z ?? 0,
  };
}

function clonePartLeadPoints(points = []) {
  return PART_LEAD_ENDPOINTS.map(({ pointIndex }) => clonePartLeadPoint(points[pointIndex]));
}

function rotatePartAroundLead(part, endKey = PART_REDRAG_SNAP_END, degrees = PART_ROTATION_STEP_DEGREES) {
  if (!part) {
    return false;
  }

  const pivotLeadPositionLocal =
    endKey === 'start'
      ? part.userData.startLeadPositionLocal
      : part.userData.endLeadPositionLocal;

  const rotatingLeadPositionLocal =
    endKey === 'start'
      ? part.userData.endLeadPositionLocal
      : part.userData.startLeadPositionLocal;

  if (!pivotLeadPositionLocal || !rotatingLeadPositionLocal) {
    return false;
  }

  const radians = degrees * DEG_TO_RAD;

  const dx = rotatingLeadPositionLocal.x - pivotLeadPositionLocal.x;
  const dz = rotatingLeadPositionLocal.z - pivotLeadPositionLocal.z;

  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  rotatingLeadPositionLocal.x = pivotLeadPositionLocal.x + dx * cos - dz * sin;
  rotatingLeadPositionLocal.z = pivotLeadPositionLocal.z + dx * sin + dz * cos;

  // Keep same height.
  rotatingLeadPositionLocal.y = pivotLeadPositionLocal.y;

  // Only the pivot lead remains snapped for now.
  if (endKey === 'start') {
    part.userData.endSnappedTarget = null;
  } else {
    part.userData.startSnappedTarget = null;
  }

  updateInteractivePartTransform(part);
  return true;
}

function clampPartLeadMarkerOffsetUnits(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return THREE.MathUtils.clamp(
    value,
    -PART_LEAD_MARKER_OFFSET_LIMIT,
    PART_LEAD_MARKER_OFFSET_LIMIT
  );
}

function getPartLeadPointIndex(endKey) {
  return endKey === 'start' ? 0 : 1;
}

function getPartLeadMarkerOffsetState(definitionKey, endKey) {
  return partLeadMarkerOffsetState[definitionKey]?.[getPartLeadPointIndex(endKey)] ?? null;
}

function getPartDefinitionLeadLabel(definition, endKey) {
  const leadLabels = definition?.leadLabels ?? ['Left Lead', 'Right Lead'];
  return endKey === 'start' ? leadLabels[0] : leadLabels[1];
}

function buildPartLeadMarkerOffsetSummary(definitionKey, endKey) {
  const point = getPartLeadMarkerOffsetState(definitionKey, endKey);

  if (!point) {
    return 'x 0.00  y 0.00  z 0.00';
  }

  return `x ${formatPartLeadMarkerOffsetUnits(point.x)}  y ${formatPartLeadMarkerOffsetUnits(point.y)}  z ${formatPartLeadMarkerOffsetUnits(point.z)}`;
}

function formatPartLeadPointObject(point) {
  return `{ x: ${formatPartLeadMarkerOffsetUnits(point.x)}, y: ${formatPartLeadMarkerOffsetUnits(point.y)}, z: ${formatPartLeadMarkerOffsetUnits(point.z)} }`;
}

function refreshPartLeadCalibrationSection(definitionKey) {
  const section = partLeadCalibrationUi.get(definitionKey);
  const definition = PART_DEFINITION_BY_KEY.get(definitionKey);

  if (!section || !definition) {
    return;
  }

  for (const { endKey } of PART_LEAD_ENDPOINTS) {
    const point = getPartLeadMarkerOffsetState(definitionKey, endKey);

    if (!point) {
      continue;
    }

    for (const axis of ['x', 'y', 'z']) {
      section.controls[endKey][axis].range.value = String(point[axis]);
      section.controls[endKey][axis].number.value = point[axis].toFixed(
        PART_LEAD_MARKER_OFFSET_PRECISION
      );
    }

    section.readouts[endKey].textContent =
      `${getPartDefinitionLeadLabel(definition, endKey)} Marker Offset: ${buildPartLeadMarkerOffsetSummary(definitionKey, endKey)}`;
  }
}

function updatePartLeadLocalPoints(part) {
  const definition = PART_DEFINITION_BY_KEY.get(part?.userData?.definitionKey);
  const startLeadLocalPoint = part?.userData?.startLeadLocalPoint;
  const endLeadLocalPoint = part?.userData?.endLeadLocalPoint;

  if (!definition || !startLeadLocalPoint || !endLeadLocalPoint) {
    return false;
  }

  const startBasePoint = definition.leadPoints?.[0] ?? { x: 0, y: 0, z: 0 };
  const endBasePoint = definition.leadPoints?.[1] ?? { x: 0, y: 0, z: 0 };

  tempPartEuler.set(
    (definition.baseRotation?.x ?? 0) * DEG_TO_RAD,
    (definition.baseRotation?.y ?? 0) * DEG_TO_RAD,
    (definition.baseRotation?.z ?? 0) * DEG_TO_RAD,
    'XYZ'
  );

  // IMPORTANT:
  // These are the real physical lead anchors.
  // Do not add marker calibration here.
  startLeadLocalPoint
    .set(startBasePoint.x ?? 0, startBasePoint.y ?? 0, startBasePoint.z ?? 0)
    .applyEuler(tempPartEuler);

  endLeadLocalPoint
    .set(endBasePoint.x ?? 0, endBasePoint.y ?? 0, endBasePoint.z ?? 0)
    .applyEuler(tempPartEuler);

  updatePartLeadHandlePositions(part);

  return true;
}

function applyPartLeadCalibration() {
  const previewPart = partDragState.previewPart;

  if (previewPart) {
    updatePartLeadLocalPoints(previewPart);

    if (breadboardPartsRoot) {
      updateInteractivePartTransform(previewPart);
    }
  }

  for (const part of placedParts) {
    updatePartLeadLocalPoints(part);
  }

  if (breadboardPartsRoot) {
    syncInteractiveTransforms();
  }
}

function setPartLeadMarkerOffsetValue(definitionKey, endKey, axis, nextValue) {
  const point = getPartLeadMarkerOffsetState(definitionKey, endKey);

  if (!point) {
    return;
  }

  point[axis] = clampPartLeadMarkerOffsetUnits(Number.parseFloat(nextValue));
  refreshPartLeadCalibrationSection(definitionKey);
  applyPartLeadCalibration();
}

function createPartLeadCalibrationSection(definition) {
  const section = document.createElement('section');
  section.className = 'rotation-card';
  section.style.setProperty('--accent', definition.accent);

  section.innerHTML = `
    <div class="rotation-card__header">
      <h3>${definition.label}</h3>
      <p data-start-readout></p>
      <p data-end-readout></p>
    </div>
    ${PART_LEAD_ENDPOINTS.map(({ endKey }) => {
      const point = getPartLeadMarkerOffsetState(definition.key, endKey);

      return `
        <div class="transform-group">
          <p class="transform-group__title">${getPartDefinitionLeadLabel(definition, endKey)} Marker Offset</p>
          ${['x', 'y', 'z']
            .map((axis) =>
              createAxisControlMarkup(
                axis,
                point?.[axis] ?? 0,
                endKey,
                {
                  min: -PART_LEAD_MARKER_OFFSET_LIMIT,
                  max: PART_LEAD_MARKER_OFFSET_LIMIT,
                  rangeStep: 0.01,
                  numberStep: 0.01,
                },
                axis.toUpperCase(),
                PART_LEAD_MARKER_OFFSET_PRECISION
              )
            )
            .join('')}
        </div>
      `;
    }).join('')}
  `;

  const controls = {
    start: { x: {}, y: {}, z: {} },
    end: { x: {}, y: {}, z: {} },
  };

  for (const { endKey } of PART_LEAD_ENDPOINTS) {
    for (const axis of ['x', 'y', 'z']) {
      const range = section.querySelector(
        `[data-group="${endKey}"][data-axis="${axis}"][data-role="range"]`
      );
      const number = section.querySelector(
        `[data-group="${endKey}"][data-axis="${axis}"][data-role="number"]`
      );

      const handleInput = (event) => {
        setPartLeadMarkerOffsetValue(definition.key, endKey, axis, event.target.value);
      };

      range.addEventListener('input', handleInput);
      number.addEventListener('input', handleInput);

      controls[endKey][axis] = { range, number };
    }
  }

  partLeadCalibrationUi.set(definition.key, {
    readouts: {
      start: section.querySelector('[data-start-readout]'),
      end: section.querySelector('[data-end-readout]'),
    },
    controls,
  });

  refreshPartLeadCalibrationSection(definition.key);

  return section;
}

function buildPartLeadCopyBlock(definition) {
  const startPoint = getPartLeadMarkerOffsetState(definition.key, 'start') ?? { x: 0, y: 0, z: 0 };
  const endPoint = getPartLeadMarkerOffsetState(definition.key, 'end') ?? { x: 0, y: 0, z: 0 };

  return [
    `${definition.key}: {`,
    '  leadMarkerOffsets: [',
    `    ${formatPartLeadPointObject(startPoint)},`,
    `    ${formatPartLeadPointObject(endPoint)},`,
    '  ],',
    '},',
  ].join('\n');
}

function buildPartLeadCalibrationPanel() {
  for (const definition of PART_DEFINITIONS) {
    partLeadSectionsRoot.appendChild(createPartLeadCalibrationSection(definition));
  }

  copyPartLeadButton.addEventListener('click', async () => {
    const blocks = PART_DEFINITIONS.map((definition) => buildPartLeadCopyBlock(definition));

    try {
      await navigator.clipboard.writeText(blocks.join('\n\n'));
      setStatus('Copied the current part lead marker offsets to the clipboard.');
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      setStatus('Clipboard access is unavailable. Read the part lead marker offsets directly from the calibration panel.');
    }
  });

  resetPartLeadButton.addEventListener('click', () => {
    for (const definition of PART_DEFINITIONS) {
      partLeadMarkerOffsetState[definition.key] = clonePartLeadPoints(
        DEFAULT_PART_LEAD_MARKER_OFFSETS[definition.key]
      );
      refreshPartLeadCalibrationSection(definition.key);
    }

    applyPartLeadCalibration();
    setStatus('Reset all part lead marker offsets to zero.');
  });
}

function getConfiguredPartBodyHitbox(definitionKey) {
  const definition = PART_DEFINITION_BY_KEY.get(definitionKey);
  const configuredHitbox =
    definition?.bodyHitbox ?? DEFAULT_PART_BODY_HITBOX_FALLBACKS[definitionKey] ?? null;

  if (!configuredHitbox) {
    return null;
  }

  return {
    size: configuredHitbox.size ?? configuredHitbox.maxSize ?? null,
    offset: configuredHitbox.offset ?? configuredHitbox.centerOffset ?? null,
  };
}

function createPartCard(definition) {
  const section = document.createElement('section');
  section.className = 'rotation-card parts-card';
  section.style.setProperty('--accent', definition.accent);
  section.innerHTML = `
    <button type="button" class="parts-card__button" data-part-key="${definition.key}">
      <span class="parts-card__icon">${definition.label.slice(0, 1)}</span>
      <span class="parts-card__content">
        <span class="parts-card__title">${definition.label}</span>
        <span class="parts-card__copy">${definition.description}</span>
      </span>
      <span class="parts-card__drag">Drag</span>
    </button>
  `;

  const button = section.querySelector('[data-part-key]');
  button.addEventListener('pointerdown', (event) => {
    beginPartDrag(event, definition.key);
  });

  return section;
}

function buildPartsPanel() {
  for (const definition of PART_DEFINITIONS) {
    partsSectionsRoot.appendChild(createPartCard(definition));
  }

  addWireButton.addEventListener('click', () => {
    addInteractiveWire();
  });

  clearPartsButton.addEventListener('click', () => {
    clearPlacedParts();
  });
}

function setArduinoCodePanelBusy(isBusy) {
  arduinoCompileInFlight = isBusy;

  if (runArduinoButton) {
    runArduinoButton.disabled = isBusy;
    runArduinoButton.textContent = isBusy ? 'Compiling...' : 'Run';
  }
}

function stopArduinoSimulation() {
  if (!avrRunner) {
    setStatus('Arduino simulation is not running.');
    return;
  }

  avrRunner.stop?.();
  console.log('AVR simulation stopped.');
  setStatus('Arduino simulation stopped.');
}

async function runArduinoCodeFromPanel() {
  if (arduinoCompileInFlight) {
    return;
  }

  const source = String(arduinoSourceInput?.value ?? '').trim();

  if (!source) {
    setStatus('Paste an Arduino sketch into the code panel before running it.');
    return;
  }

  setArduinoCodePanelBusy(true);
  setStatus('Compiling Arduino sketch...');

  try {
    await compileAndRunArduinoSketch(source);
  } finally {
    setArduinoCodePanelBusy(false);
  }
}

function buildArduinoCodePanel() {
  if (arduinoSourceInput) {
    arduinoSourceInput.value = DEFAULT_ARDUINO_SKETCH;
  }

  runArduinoButton?.addEventListener('click', () => {
    runArduinoCodeFromPanel();
  });

  stopArduinoButton?.addEventListener('click', () => {
    stopArduinoSimulation();
  });
}

function applyArduinoHeaderGroupTransforms() {
  for (const definition of ARDUINO_HEADER_GROUP_DEFINITIONS) {
    const groupRoot = arduinoHeaderGroupRoots.get(definition.key);

    if (!groupRoot) {
      continue;
    }

    setObjectPositionFromBase(
      groupRoot,
      definition.basePosition,
      arduinoHeaderGroupPositionState[definition.key]
    );
    setObjectEulerDegrees(groupRoot, arduinoHeaderGroupRotationState[definition.key]);
  }
}

function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(resolvePublicAssetUrl(url), resolve, undefined, reject);
  });
}

function normalizeModel(root) {
  const model = root.clone(true);

  model.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    object.castShadow = true;
    object.receiveShadow = true;
  });

  const box = tempBox.setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const pivot = new THREE.Group();
  pivot.add(model);

  model.position.set(-center.x, -box.min.y, -center.z);
  pivot.userData.size = size;

  return pivot;
}

function createRotationRig(model, baseRotation) {
  const root = new THREE.Group();
  const adjustment = new THREE.Group();

  setObjectEulerDegrees(root, baseRotation);
  adjustment.userData.size = model.userData.size;
  adjustment.add(model);
  root.add(adjustment);

  return { root, adjustment };
}

function createPinMarker(color, radius) {
  const marker = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.16, 18, 40),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.12,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  marker.add(ring);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.46, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.08,
    })
  );
  core.castShadow = true;
  marker.add(core);

  marker.userData.ring = ring;
  marker.userData.core = core;

  return marker;
}

function createSnapTarget(label) {
  const target = new THREE.Object3D();
  target.userData.label = label;

  const marker = createPinMarker(0x5aa7ff, 1.05);
  marker.position.y = 0.05;
  target.add(marker);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 32),
    new THREE.MeshBasicMaterial({
      color: 0x87c5ff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.08;
  target.add(halo);

  target.userData.marker = marker;
  target.userData.halo = halo;

  marker.visible = false;
  halo.visible = false;

  return target;
}

function addBreadboardSnapTarget(parent, targets, label, x, z, options = {}) {
  const target = createSnapTarget(label);
  target.position.set(x, 0, z);
  target.userData.surfaceKey = 'breadboardSurface';
  target.userData.isPowerRail = Boolean(options.isPowerRail);
  target.userData.alwaysVisible = Boolean(options.alwaysVisible);
  target.userData.idleColor = options.idleColor ?? 0xcfd8e3;
  target.userData.groupKey = options.groupKey ?? null;
  parent.add(target);
  targets.push(target);

  return target;
}

function createPowerRailGroup(parent, targets, definition) {
  const group = new THREE.Group();
  parent.add(group);
  powerRailGroupRoots.set(definition.key, group);

  for (
    let columnIndex = 0;
    columnIndex < BREADBOARD_POWER_RAIL_GROUP_COLUMN_OFFSETS.length;
    columnIndex += 1
  ) {
    for (
      let holeIndex = 0;
      holeIndex < BREADBOARD_POWER_RAIL_GROUP_ROW_OFFSETS.length;
      holeIndex += 1
    ) {
      addBreadboardSnapTarget(
        group,
        targets,
        `${definition.code} C${columnIndex + 1} H${holeIndex + 1}`,
        BREADBOARD_POWER_RAIL_GROUP_COLUMN_OFFSETS[columnIndex],
        BREADBOARD_POWER_RAIL_GROUP_ROW_OFFSETS[holeIndex],
        {
          isPowerRail: true,
          alwaysVisible: false,
          idleColor: definition.markerColor,
          groupKey: definition.key,
        }
      );
    }
  }
}

function createArduinoHeaderGroup(parent, targets, definition) {
  const group = new THREE.Group();
  parent.add(group);
  arduinoHeaderGroupRoots.set(definition.key, group);

  for (let holeIndex = 0; holeIndex < definition.holeCount; holeIndex += 1) {
    const pinLabel = definition.pinLabels?.[holeIndex] ?? `${definition.code}-${holeIndex + 1}`;
    const target = createSnapTarget(pinLabel);
    target.position.set(
      0,
      0,
      (holeIndex - (definition.holeCount - 1) / 2) * BREADBOARD_PITCH
    );
    target.userData.surfaceKey = definition.surfaceKey;
    target.userData.alwaysVisible = false;
    target.userData.idleColor = definition.markerColor;
    target.userData.groupKey = definition.key;
    target.userData.isArduinoHeader = true;
    target.userData.pinIndex = holeIndex;
    target.userData.pinLabel = pinLabel;
    group.add(target);
    targets.push(target);
  }

  return group;
}

function createSurfaceGuide(width, depth, fillColor, outlineColor) {
  const group = new THREE.Group();

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth, 12, 24),
    new THREE.MeshBasicMaterial({
      color: fillColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  surface.rotation.x = -Math.PI / 2;
  group.add(surface);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, depth)),
    new THREE.LineBasicMaterial({
      color: outlineColor,
      transparent: true,
      opacity: 0.8,
    })
  );
  outline.rotation.x = -Math.PI / 2;
  outline.position.y = 0.02;
  group.add(outline);

  return group;
}

function getPartLeadMarkerColor(endKey) {
  return endKey === 'start' ? PART_START_LEAD_COLOR : PART_END_LEAD_COLOR;
}

function setTargetVisualState(target, active, wireSnapped, partLeadEndKey = null) {
  const marker = target.userData.marker;
  const halo = target.userData.halo;
  const forcedVisible = Boolean(target.userData.alwaysVisible);
  const hasPartLeadMarker = Boolean(partLeadEndKey);
  const visible = forcedVisible || active || wireSnapped || hasPartLeadMarker;
  const color = wireSnapped
    ? 0xff8b2b
    : active
      ? 0x5aa7ff
      : hasPartLeadMarker
        ? getPartLeadMarkerColor(partLeadEndKey)
      : target.userData.idleColor ?? 0xcfd8e3;

  marker.visible = visible;
  halo.visible = visible;

  if (!visible) {
    return;
  }

  marker.userData.ring.material.color.setHex(color);
  marker.userData.ring.material.emissive.setHex(color);
  marker.userData.core.material.emissive.setHex(color);
  marker.scale.setScalar(
    wireSnapped ? 1.28 : active ? 1.14 : hasPartLeadMarker ? 1.08 : forcedVisible ? 0.82 : 0.94
  );

  halo.material.color.setHex(color);
  halo.material.opacity =
    wireSnapped ? 0.34 : active ? 0.24 : hasPartLeadMarker ? 0.22 : forcedVisible ? 0.14 : 0.1;
  halo.scale.setScalar(
    wireSnapped ? 1.18 : active ? 1.08 : hasPartLeadMarker ? 1.02 : forcedVisible ? 0.84 : 0.92
  );
}

function refreshTargetVisuals() {
  for (const target of getAllSnapTargets()) {
    const active = target === wireState.hoveredTarget || target === partLeadState.hoveredTarget;
    const wireSnapped = isTargetSnappedByAnyWire(target);
    const partLeadEndKey = getPartLeadEndKeyForTarget(target);
    setTargetVisualState(target, active, wireSnapped, partLeadEndKey);
  }
}

function createDupontPlug(includeHandle = false) {
  const group = new THREE.Group();

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 4.8, 18),
    new THREE.MeshStandardMaterial({
      color: 0xd9e2eb,
      metalness: 0.7,
      roughness: 0.28,
    })
  );
  pin.position.y = 2.4;

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.92, 1.8, 20),
    new THREE.MeshStandardMaterial({
      color: 0xb9c0c7,
      metalness: 0.35,
      roughness: 0.45,
    })
  );
  collar.position.y = 5.3;

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(3.65, 6.2, 3.65),
    new THREE.MeshStandardMaterial({
      color: 0x1f2730,
      roughness: 0.88,
      metalness: 0.05,
    })
  );
  housing.position.y = 9.5;

  const strainRelief = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.18, 2.6, 18),
    new THREE.MeshStandardMaterial({
      color: 0x2c3641,
      roughness: 0.9,
      metalness: 0.04,
    })
  );
  strainRelief.position.y = 13.55;

  group.add(pin, collar, housing, strainRelief);

  for (const child of group.children) {
    child.castShadow = true;
    child.receiveShadow = true;
  }

  if (includeHandle) {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 22, 22),
      new THREE.MeshStandardMaterial({
        color: 0x7ed2ff,
        emissive: 0x7ed2ff,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    halo.position.y = 9.5;
    group.add(halo);

    const hitArea = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 18, 18),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    hitArea.position.y = 9.5;
    group.add(hitArea);

    group.userData.halo = halo;
    group.userData.hitArea = hitArea;
  }

  return group;
}

function getRandomWireColorHex() {
  const randomIndex = Math.floor(Math.random() * RANDOM_WIRE_COLOR_PALETTE.length);
  return RANDOM_WIRE_COLOR_PALETTE[randomIndex] ?? DEFAULT_WIRE_COLOR;
}

function createCableMesh(color = DEFAULT_WIRE_COLOR) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.02,
  });

  const geometry = new THREE.TubeGeometry(
    new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 10, 0)),
    10,
    CABLE_RADIUS,
    14,
    false
  );

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createWireAssembly(includeHandles = true, color = DEFAULT_WIRE_COLOR) {
  const group = new THREE.Group();

  const startPlug = createDupontPlug(includeHandles);
  const freePlug = createDupontPlug(includeHandles);
  const cable = createCableMesh(color);

  group.add(cable, startPlug, freePlug);

  group.userData.startPlug = startPlug;
  group.userData.endPlug = freePlug;
  group.userData.cableMesh = cable;

  return group;
}

function createInteractiveWire(options = {}) {
  const wireColor =
    options.cableColor ?? (options.isPrimary ? DEFAULT_WIRE_COLOR : getRandomWireColorHex());
  const assembly = createWireAssembly(true, wireColor);
  const wire = {
    assembly,
    startPlug: assembly.userData.startPlug,
    endPlug: assembly.userData.endPlug,
    startHitArea: assembly.userData.startPlug.userData.hitArea,
    endHitArea: assembly.userData.endPlug.userData.hitArea,
    cableMesh: assembly.userData.cableMesh,
    cableColor: wireColor,
    isPrimary: Boolean(options.isPrimary),
    startSnappedTarget: null,
    endSnappedTarget: null,
    startSurfaceKey: 'arduinoHeaderLeft',
    endSurfaceKey: 'breadboardSurface',
    startInsertionDepth: 0,
    endInsertionDepth: 0,
    startTip: new THREE.Vector3(),
    endTip: new THREE.Vector3(),
  };

  wire.startHitArea.userData.wire = wire;
  wire.startHitArea.userData.endKey = 'start';
  wire.endHitArea.userData.wire = wire;
  wire.endHitArea.userData.endKey = 'end';
  assembly.userData.interactiveWire = wire;

  return wire;
}

function initializePrimaryWire(wire) {
  wire.startSnappedTarget = startAnchor;
  wire.startSurfaceKey = startAnchor?.userData.surfaceKey ?? 'arduinoHeaderLeft';
  wire.startInsertionDepth = startAnchor ? PLUG_INSERTION_DEPTH : 0;

  if (startAnchor?.userData.worldPosition) {
    wire.startTip.copy(startAnchor.userData.worldPosition);
  }

  let defaultTarget =
    breadboardTargets.find((target) => !target.userData.isPowerRail) ?? breadboardTargets[0] ?? null;
  let nearestDistance = Infinity;

  if (wire.startSnappedTarget?.userData.worldPosition) {
    for (const target of breadboardTargets) {
      if (target.userData.isPowerRail) {
        continue;
      }

      const distance = wire.startSnappedTarget.userData.worldPosition.distanceTo(
        target.userData.worldPosition
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        defaultTarget = target;
      }
    }
  }

  wire.endSurfaceKey = defaultTarget?.userData.surfaceKey ?? 'breadboardSurface';

  if (!defaultTarget) {
    wire.endTip.set(26, WORKSPACE_WIRE_BASE_HEIGHT, 48);
    return;
  }

  wire.endTip.copy(defaultTarget.userData.worldPosition);
  getTargetWorldNormal(defaultTarget, tempBreadboardNormal);
  wire.endTip.addScaledVector(tempBreadboardNormal, 10);
  wire.endTip.addScaledVector(
    tempDirection.set(0, 0, 1).transformDirection(defaultTarget.matrixWorld),
    3.5
  );
}

function initializeLooseWire(wire, index) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const baseX = column === 0 ? -38 : 18;
  const baseZ = 82 - row * 22;

  wire.startSnappedTarget = null;
  wire.endSnappedTarget = null;
  wire.startSurfaceKey = 'breadboardSurface';
  wire.endSurfaceKey = 'breadboardSurface';
  wire.startInsertionDepth = 0;
  wire.endInsertionDepth = 0;

  const surfaceGuide = getSurfaceGuide('breadboardSurface');

  if (!surfaceGuide) {
    wire.startTip.set(baseX - 14, WORKSPACE_WIRE_BASE_HEIGHT, baseZ - 5);
    wire.endTip.set(baseX + 14, WORKSPACE_WIRE_BASE_HEIGHT, baseZ + 5);
    return;
  }

  surfaceGuide.updateMatrixWorld(true);

  const surfaceWidth =
    surfaceSizeState.breadboardSurface?.width ?? DEFAULT_SURFACE_SIZES.breadboardSurface.width;
  const surfaceDepth =
    surfaceSizeState.breadboardSurface?.depth ?? DEFAULT_SURFACE_SIZES.breadboardSurface.depth;
  const spawnColumn = index % LOOSE_WIRE_SPAWN_COLUMNS;
  const spawnRow = Math.floor(index / LOOSE_WIRE_SPAWN_COLUMNS) % LOOSE_WIRE_SPAWN_ROWS;
  const localX =
    LOOSE_WIRE_SPAWN_COLUMNS === 1
      ? 0
      : THREE.MathUtils.lerp(
          -surfaceWidth * 0.22,
          surfaceWidth * 0.22,
          spawnColumn / (LOOSE_WIRE_SPAWN_COLUMNS - 1)
        );
  const localZ =
    LOOSE_WIRE_SPAWN_ROWS === 1
      ? 0
      : THREE.MathUtils.lerp(
          surfaceDepth * 0.2,
          -surfaceDepth * 0.2,
          spawnRow / (LOOSE_WIRE_SPAWN_ROWS - 1)
        );

  tempPoint.set(localX, 0, localZ);
  surfaceGuide.localToWorld(tempPoint);

  getSurfaceNormal('breadboardSurface', tempBreadboardNormal);
  tempPoint.addScaledVector(tempBreadboardNormal, LOOSE_WIRE_SPAWN_LIFT);

  tempDirection.set(1, 0, 0).transformDirection(surfaceGuide.matrixWorld).normalize();
  tempNormalB.set(0, 0, 1).transformDirection(surfaceGuide.matrixWorld).normalize();

  wire.startTip.copy(tempPoint);
  wire.startTip.addScaledVector(tempDirection, -LOOSE_WIRE_SPAWN_HALF_SPAN);
  wire.startTip.addScaledVector(tempNormalB, -LOOSE_WIRE_SPAWN_SKEW);

  wire.endTip.copy(tempPoint);
  wire.endTip.addScaledVector(tempDirection, LOOSE_WIRE_SPAWN_HALF_SPAN);
  wire.endTip.addScaledVector(tempNormalB, LOOSE_WIRE_SPAWN_SKEW);
}

function addInteractiveWire() {
  if (!breadboardSurface) {
    setStatus('The workspace is still loading. Try adding another wire in a moment.');
    return;
  }

  const wire = createInteractiveWire();
  const additionalWireCount = interactiveWires.filter((candidate) => !candidate.isPrimary).length;
  interactiveWires.push(wire);
  assembly.add(wire.assembly);
  wireState.activeWire = wire;
  initializeLooseWire(wire, additionalWireCount);
  updateWireGeometry(wire);
  refreshTargetVisuals();
  updateHandleVisuals();
  updateCanvasCursor();
  setStatus('Added another usable Dupont wire. Drag either glowing plug onto the Arduino or breadboard.');
}

function getAllPartLeadHitAreas() {
  const hitAreas = [];

  for (const part of placedParts) {
    if (part.userData.startHitArea) {
      hitAreas.push(part.userData.startHitArea);
    }

    if (part.userData.endHitArea) {
      hitAreas.push(part.userData.endHitArea);
    }
  }

  return hitAreas;
}

function isTargetSnappedByAnyPart(target) {
  return placedParts.some(
    (part) =>
      part.userData.startSnappedTarget === target || part.userData.endSnappedTarget === target
  );
}

function getPartLeadLabel(part, endKey) {
  const definition = PART_DEFINITION_BY_KEY.get(part.userData.definitionKey);
  return getPartDefinitionLeadLabel(definition, endKey);
}

function getPartLeadSnappedTarget(part, endKey) {
  if (!part) {
    return null;
  }

  return endKey === 'start' ? part.userData.startSnappedTarget : part.userData.endSnappedTarget;
}

function getPartLeadLandingTarget(part, endKey) {
  if (!part) {
    return null;
  }

  return endKey === 'start' ? part.userData.startLandedTarget : part.userData.endLandedTarget;
}

function getPartLeadEndKeyForTarget(target) {
  if (!target) {
    return null;
  }

  for (const part of placedParts) {
    if (getPartLeadLandingTarget(part, 'start') === target) {
      return 'start';
    }

    if (getPartLeadLandingTarget(part, 'end') === target) {
      return 'end';
    }
  }

  return null;
}

function detectPartLeadLandingTarget(part, endKey, otherTarget = null) {
  const snappedTarget = getPartLeadSnappedTarget(part, endKey);

  if (snappedTarget) {
    return snappedTarget;
  }

  if (!part || breadboardTargets.length === 0) {
    return null;
  }

  const leadHandle = endKey === 'start' ? part.userData.startHandle : part.userData.endHandle;

  if (!leadHandle) {
    return null;
  }

  leadHandle.getWorldPosition(tempPartWorldPosition);
  const candidate = findNearestTarget(tempPartWorldPosition, breadboardTargets);

  if (!candidate || candidate === otherTarget) {
    return null;
  }

  return candidate;
}

function updatePartLeadLandingTargets(part) {
  if (!part) {
    return;
  }

  part.updateMatrixWorld(true);

  const endSnappedTarget = getPartLeadSnappedTarget(part, 'end');
  const startLandedTarget = detectPartLeadLandingTarget(part, 'start', endSnappedTarget);
  const endLandedTarget = detectPartLeadLandingTarget(part, 'end', startLandedTarget);

  part.userData.startLandedTarget = startLandedTarget;
  part.userData.endLandedTarget =
    endLandedTarget === startLandedTarget && !endSnappedTarget ? null : endLandedTarget;
}

function buildPartLeadLandingSummary(part) {
  if (!part) {
    return null;
  }

  const startLabel = getPartLeadLandingTarget(part, 'start')?.userData?.label ?? null;
  const endLabel = getPartLeadLandingTarget(part, 'end')?.userData?.label ?? null;

  if (startLabel && endLabel) {
    return `${getPartLeadLabel(part, 'start')} ${startLabel} and ${getPartLeadLabel(part, 'end')} ${endLabel}`;
  }

  if (startLabel) {
    return `${getPartLeadLabel(part, 'start')} ${startLabel}`;
  }

  if (endLabel) {
    return `${getPartLeadLabel(part, 'end')} ${endLabel}`;
  }

  return null;
}

function createPartLeadHandle(color) {
  const group = new THREE.Group();
  const marker = createPinMarker(color, PART_LEAD_HANDLE_RADIUS);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(PART_LEAD_HANDLE_RADIUS * 1.8, 18, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    })
  );
  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(PART_LEAD_HANDLE_RADIUS * 2.8, 16, 16),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );

  group.add(marker, halo, hitArea);
  marker.scale.setScalar(0.82);

  group.userData.marker = marker;
  group.userData.halo = halo;
  group.userData.hitArea = hitArea;
  group.userData.idleColor = color;

  return group;
}

function setPartLeadVisualState(handle, active, snapped) {
  if (!handle) {
    return;
  }

  const marker = handle.userData.marker;
  const halo = handle.userData.halo;
  const color = snapped
    ? 0xff8b2b
    : active
      ? 0x5aa7ff
      : handle.userData.idleColor ?? 0xcfd8e3;

  marker.visible = true;
  halo.visible = true;

  marker.userData.ring.material.color.setHex(color);
  marker.userData.ring.material.emissive.setHex(color);
  marker.userData.core.material.emissive.setHex(color);
  marker.scale.setScalar(snapped ? 0.98 : active ? 0.9 : 0.78);

  halo.material.color.setHex(color);
  halo.material.emissive.setHex(color);
  halo.material.opacity = snapped ? 0.28 : active ? 0.2 : 0.11;
  halo.scale.setScalar(snapped ? 1.08 : active ? 1 : 0.9);
}

function updatePartLeadHandlePositions(part) {
  const definition = PART_DEFINITION_BY_KEY.get(part?.userData?.definitionKey);
  const startHandle = part.userData.startHandle;
  const endHandle = part.userData.endHandle;
  const startLeadLocalPoint = part.userData.startLeadLocalPoint;
  const endLeadLocalPoint = part.userData.endLeadLocalPoint;

  const showOnlySnappedLeadMarkers = true;

  if (showOnlySnappedLeadMarkers) {
    startHandle.visible = Boolean(part.userData.startSnappedTarget);
    endHandle.visible = Boolean(part.userData.endSnappedTarget);
  } else {
    startHandle.visible = true;
    endHandle.visible = true;
  }

  if (!definition || !startHandle || !endHandle || !startLeadLocalPoint || !endLeadLocalPoint) {
    return;
  }

  const startOffset = getPartLeadMarkerOffsetState(definition.key, 'start') ?? { x: 0, y: 0, z: 0 };
  const endOffset = getPartLeadMarkerOffsetState(definition.key, 'end') ?? { x: 0, y: 0, z: 0 };

  // These move only the visible marker circles / hit areas.
  // They no longer affect actual part placement or lead-to-hole snapping.
  startHandle.position.set(
    startLeadLocalPoint.x + startOffset.x,
    startLeadLocalPoint.y + startOffset.y,
    startLeadLocalPoint.z + startOffset.z
  );

  endHandle.position.set(
    endLeadLocalPoint.x + endOffset.x,
    endLeadLocalPoint.y + endOffset.y,
    endLeadLocalPoint.z + endOffset.z
  );
}

function createInteractivePart(definitionKey, preview = false) {
  const definition = PART_DEFINITION_BY_KEY.get(definitionKey);
  const prototype = partModelCache.get(definitionKey);

  if (!definition || !prototype) {
    return null;
  }

  const root = new THREE.Group();
  const contentRoot = new THREE.Group();
  const content = prototype.clone(true);
  root.add(contentRoot);
  contentRoot.add(content);

  content.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    const isMaterialArray = Array.isArray(object.material);
    const materials = isMaterialArray ? object.material : [object.material];
    const nextMaterials = materials.map((material) => {
      const nextMaterial = material.clone();

      if (preview) {
        nextMaterial.transparent = true;
        nextMaterial.opacity = 0.68;
        nextMaterial.depthWrite = false;
      }

      return nextMaterial;
    });
    object.material = isMaterialArray ? nextMaterials : nextMaterials[0];
  });

  tempPartEuler.set(
    (definition.baseRotation?.x ?? 0) * DEG_TO_RAD,
    (definition.baseRotation?.y ?? 0) * DEG_TO_RAD,
    (definition.baseRotation?.z ?? 0) * DEG_TO_RAD,
    'XYZ'
  );
  contentRoot.rotation.copy(tempPartEuler);
  contentRoot.position.y = definition.surfaceLiftY ?? DEFAULT_PART_SURFACE_LIFT;

  const startHandle = createPartLeadHandle(PART_START_LEAD_COLOR);
  const endHandle = createPartLeadHandle(PART_END_LEAD_COLOR);
  root.add(startHandle, endHandle);

  startHandle.visible = !preview;
  endHandle.visible = !preview;

  root.userData.definitionKey = definitionKey;
  root.userData.isPlacedPart = true;
  root.userData.isInteractivePart = true;
  root.userData.isPreview = preview;
  root.userData.contentRoot = contentRoot;
  root.userData.content = content;
  root.userData.startHandle = startHandle;
  root.userData.endHandle = endHandle;
  root.userData.startHitArea = startHandle.userData.hitArea;
  root.userData.endHitArea = endHandle.userData.hitArea;
  root.userData.startLeadLocalPoint = new THREE.Vector3();
  root.userData.endLeadLocalPoint = new THREE.Vector3();
  root.userData.startLeadPositionLocal = new THREE.Vector3();
  root.userData.endLeadPositionLocal = new THREE.Vector3();
  root.userData.startSnappedTarget = null;
  root.userData.endSnappedTarget = null;
  root.userData.startLandedTarget = null;
  root.userData.endLandedTarget = null;
  root.userData.startInsertionDepth = 0;
  root.userData.endInsertionDepth = 0;
  root.userData.insertionAnimationFrame = null;
  root.userData.leadScaleX = 1;

  root.userData.startHitArea.userData.part = root;
  root.userData.startHitArea.userData.endKey = 'start';
  root.userData.startHitArea.userData.interactionType = 'partLead';
  root.userData.endHitArea.userData.part = root;
  root.userData.endHitArea.userData.endKey = 'end';
  root.userData.endHitArea.userData.interactionType = 'partLead';

  updatePartLeadLocalPoints(root);
  root.userData.startLeadPositionLocal.copy(root.userData.startLeadLocalPoint);
  root.userData.endLeadPositionLocal.copy(root.userData.endLeadLocalPoint);
  updateInteractivePartTransform(root);

  return root;
}

const PART_LEAD_DISTANCE_TOLERANCE = 0.9;

function isMatchingFixedLeadTarget(part, draggedEnd, target) {
  if (!part || !target) {
    return false;
  }

  const otherTarget =
    draggedEnd === 'start'
      ? part.userData.endSnappedTarget
      : part.userData.startSnappedTarget;

  if (!otherTarget) {
    return true;
  }

  const fixedDistance = part.userData.startLeadLocalPoint.distanceTo(
    part.userData.endLeadLocalPoint
  );

  const targetDistance = target.userData.worldPosition.distanceTo(
    otherTarget.userData.worldPosition
  );

  return Math.abs(targetDistance - fixedDistance) <= PART_LEAD_DISTANCE_TOLERANCE;
}

function updateInteractivePartTransform(part) {
  if (!breadboardPartsRoot || !part) {
    return false;
  }

  const startLeadPositionLocal = part.userData.startLeadPositionLocal;
  const endLeadPositionLocal = part.userData.endLeadPositionLocal;
  const startLeadLocalPoint = part.userData.startLeadLocalPoint;
  const endLeadLocalPoint = part.userData.endLeadLocalPoint;
  const contentRoot = part.userData.contentRoot;

  if (
    !startLeadPositionLocal ||
    !endLeadPositionLocal ||
    !startLeadLocalPoint ||
    !endLeadLocalPoint ||
    !contentRoot
  ) {
    return false;
  }

  tempPartLeadDirection.copy(endLeadLocalPoint).sub(startLeadLocalPoint);
  const localLeadLength = tempPartLeadDirection.length();

  if (localLeadLength < 1e-6) {
    return false;
  }

  tempPartLeadDirectionB.copy(endLeadPositionLocal).sub(startLeadPositionLocal);
  let worldLeadLength = tempPartLeadDirectionB.length();

  if (worldLeadLength < 1e-6) {
    tempPartLeadDirectionB.copy(tempPartLeadDirection).normalize();
    worldLeadLength = localLeadLength;
  } else {
    tempPartLeadDirectionB.normalize();
  }

  tempPartLeadDirection.normalize();
  tempPartBasisY.copy(upAxis).projectOnPlane(tempPartLeadDirection);
  if (tempPartBasisY.lengthSq() < 1e-6) {
    tempPartBasisY.set(0, 0, 1).projectOnPlane(tempPartLeadDirection);
  }
  tempPartBasisY.normalize();
  tempPartBasisZ.crossVectors(tempPartLeadDirection, tempPartBasisY).normalize();
  tempPartBasisY.crossVectors(tempPartBasisZ, tempPartLeadDirection).normalize();

  tempPartMatrix.makeBasis(tempPartLeadDirection, tempPartBasisY, tempPartBasisZ);

  tempPartBasisY.copy(upAxis).projectOnPlane(tempPartLeadDirectionB);
  if (tempPartBasisY.lengthSq() < 1e-6) {
    tempPartBasisY.set(0, 0, 1).projectOnPlane(tempPartLeadDirectionB);
  }
  tempPartBasisY.normalize();
  tempPartBasisZ.crossVectors(tempPartLeadDirectionB, tempPartBasisY).normalize();
  tempPartBasisY.crossVectors(tempPartBasisZ, tempPartLeadDirectionB).normalize();

  tempPartMatrixB.makeBasis(tempPartLeadDirectionB, tempPartBasisY, tempPartBasisZ);
  tempPartMatrixC.copy(tempPartMatrix).invert();
  tempPartMatrix.multiplyMatrices(tempPartMatrixB, tempPartMatrixC);
  part.quaternion.setFromRotationMatrix(tempPartMatrix);

  part.userData.leadScaleX = 1;
  contentRoot.scale.set(1, 1, 1);

  tempPartScaledLeadPoint.copy(startLeadLocalPoint);
  tempPartScaledLeadPoint.applyQuaternion(part.quaternion);

  part.position.copy(startLeadPositionLocal).sub(tempPartScaledLeadPoint);
  const definition = PART_DEFINITION_BY_KEY.get(part.userData.definitionKey);
  contentRoot.position.y = definition?.surfaceLiftY ?? DEFAULT_PART_SURFACE_LIFT;
  updatePartLeadHandlePositions(part);

  return true;
}

function updatePartPlacementPreviewTransform(part, surfacePointWorld) {
  if (!part || !breadboardPartsRoot) {
    return;
  }

  part.visible = true;

  part.updateMatrixWorld(true);
  breadboardPartsRoot.updateMatrixWorld(true);

  const leadHandle = part.userData.startHandle;

  if (!leadHandle) {
    return;
  }

  // Current calibrated visible start lead position.
  leadHandle.getWorldPosition(tempPartWorldPosition);

  // Convert current visible lead position to breadboardPartsRoot local.
  tempPartScaledLeadPoint.copy(tempPartWorldPosition);
  breadboardPartsRoot.worldToLocal(tempPartScaledLeadPoint);

  // Convert target pointer/surface position to breadboardPartsRoot local.
  tempPartLocalPoint.copy(surfacePointWorld);
  breadboardPartsRoot.worldToLocal(tempPartLocalPoint);

  // Move the whole component by the delta.
  tempPartLeadDirection.copy(tempPartLocalPoint).sub(tempPartScaledLeadPoint);

  part.userData.startLeadPositionLocal.add(tempPartLeadDirection);
  part.userData.endLeadPositionLocal.add(tempPartLeadDirection);

  updateInteractivePartTransform(part);
}

function isPointerOverCanvas(event) {
  const rect = renderer.domElement.getBoundingClientRect();

  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function clearPartDragPreview() {
  if (partDragState.previewPart?.parent) {
    partDragState.previewPart.parent.remove(partDragState.previewPart);
  }

  partDragState.previewPart = null;
  partDragState.placementValid = false;
}

function clearPlacedParts() {
  for (const part of placedParts.splice(0, placedParts.length)) {
    if (part.parent) {
      part.parent.remove(part);
    }
  }

  for (let index = interactiveWires.length - 1; index >= 0; index -= 1) {
    const wire = interactiveWires[index];

    if (wire.isPrimary) {
      continue;
    }

    if (wire.cableMesh?.geometry) {
      wire.cableMesh.geometry.dispose();
    }

    if (wire.assembly.parent) {
      wire.assembly.parent.remove(wire.assembly);
    }

    interactiveWires.splice(index, 1);
  }

  if (!interactiveWires.includes(wireState.activeWire)) {
    wireState.activeWire = interactiveWires[0] ?? null;
    wireState.dragging = false;
    wireState.draggedEnd = null;
    wireState.hoveredTarget = null;
  }

  if (!interactiveWires.includes(wireState.hoveredWire)) {
    wireState.hoveredWire = null;
    wireState.hoveredEnd = null;
  }

  if (!placedParts.includes(partLeadState.activePart)) {
    partLeadState.dragging = false;
    partLeadState.activePart = null;
    partLeadState.draggedEnd = null;
    partLeadState.hoveredTarget = null;
  }

  if (!placedParts.includes(partLeadState.hoveredPart)) {
    partLeadState.hoveredPart = null;
    partLeadState.hoveredEnd = null;
  }

  controls.enabled = true;
  document.body.classList.remove('is-dragging');
  syncInteractiveTransforms();
  updateHandleVisuals();
  updateCanvasCursor();

  if (!partDragState.active) {
    setStatus('Cleared all placed parts and extra wires from the workspace.');
  }
}

function updatePartDragPreview(event) {
  if (!partDragState.active || !partDragState.previewPart) {
    return;
  }

  if (!isPointerOverCanvas(event)) {
    partDragState.previewPart.visible = false;
    partDragState.placementValid = false;
    updateStatusForState();
    updateCanvasCursor();
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  if (!getClampedPointOnSurfaceFromRay(raycaster.ray, 'breadboardSurface', tempPoint)) {
    partDragState.previewPart.visible = false;
    partDragState.placementValid = false;
    updateStatusForState();
    updateCanvasCursor();
    return;
  }

  partDragState.previewPart.visible = true;
  updatePartPlacementPreviewTransform(partDragState.previewPart, tempPoint);
  partDragState.placementValid = true;
  updateStatusForState();
  updateCanvasCursor();
}

function beginPlacedPartRedrag(part, event) {
  if (
    !part ||
    wireState.dragging ||
    partLeadState.dragging ||
    partDragState.active ||
    !breadboardPartsRoot
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  partDragState.active = true;
  partDragState.pointerId = event.pointerId;
  partDragState.definitionKey = part.userData.definitionKey;
  partDragState.previewPart = part;
  partDragState.placementValid = true;
  partDragState.clientX = event.clientX;
  partDragState.clientY = event.clientY;
  partDragState.mode = 'redrag';
  partDragState.originalPart = part;

  part.userData.startSnappedTarget = null;
  part.userData.endSnappedTarget = null;
  part.userData.startLandedTarget = null;
  part.userData.endLandedTarget = null;
  refreshTargetVisuals();
  refreshConnectivityPanel();
  setPartInsertedVisualState(part, false);

  wireState.hoveredWire = null;
  wireState.hoveredEnd = null;
  hoveredPlacedPart = null;

  controls.enabled = false;

  if (event.pointerId !== undefined) {
    renderer.domElement.setPointerCapture(event.pointerId);
  }

  document.body.classList.add('is-dragging');

  updatePartDragPreview(event);
  updateStatusForState();
  updateCanvasCursor();
}

function beginPartDrag(event, definitionKey) {
  const definition = PART_DEFINITION_BY_KEY.get(definitionKey);

  if (
    !definition ||
    wireState.dragging ||
    partLeadState.dragging ||
    partDragState.active ||
    !breadboardPartsRoot
  ) {
    return;
  }

  const previewPart = createInteractivePart(definitionKey, true);

  if (!previewPart) {
    setStatus(`Couldn't load the ${definition.statusLabel}. Check that the model file is available.`);
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  partDragState.active = true;
  partDragState.pointerId = event.pointerId;
  partDragState.definitionKey = definitionKey;
  partDragState.previewPart = previewPart;
  partDragState.placementValid = false;
  partDragState.clientX = event.clientX;
  partDragState.clientY = event.clientY;
  partDragState.mode = 'new';
  partDragState.originalPart = null;
  wireState.hoveredWire = null;
  wireState.hoveredEnd = null;
  breadboardPartsRoot.add(previewPart);
  controls.enabled = false;

  if (event.pointerId !== undefined) {
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  previewPart.visible = false;
  document.body.classList.add('is-dragging');

  updateStatusForState();
  updateCanvasCursor();
}

function snapPlacedPartLeadToNearestBreadboardTarget(part, endKey = 'start') {
  if (!part || !breadboardPartsRoot || breadboardTargets.length === 0) {
    return false;
  }

  cacheSnapTargetWorldPositions();
  part.updateMatrixWorld(true);
  breadboardPartsRoot.updateMatrixWorld(true);

  const leadHandle =
    endKey === 'start'
      ? part.userData.startHandle
      : part.userData.endHandle;

  const leadPositionLocal =
    endKey === 'start'
      ? part.userData.startLeadPositionLocal
      : part.userData.endLeadPositionLocal;

  const otherLeadPositionLocal =
    endKey === 'start'
      ? part.userData.endLeadPositionLocal
      : part.userData.startLeadPositionLocal;

  if (!leadHandle || !leadPositionLocal || !otherLeadPositionLocal) {
    return false;
  }

  // IMPORTANT:
  // Use the calibrated visible marker/lead end, not the raw physical anchor.
  leadHandle.getWorldPosition(tempPartWorldPosition);

  const nearestTarget = findNearestTargetWithoutDistanceLimit(
    tempPartWorldPosition,
    breadboardTargets
  );

  if (!nearestTarget) {
    return false;
  }

  // Current visible lead marker position in breadboardPartsRoot local space.
  tempPartScaledLeadPoint.copy(tempPartWorldPosition);
  breadboardPartsRoot.worldToLocal(tempPartScaledLeadPoint);

  // Target hole position in breadboardPartsRoot local space.
  tempPartLocalPoint.copy(nearestTarget.userData.worldPosition);
  breadboardPartsRoot.worldToLocal(tempPartLocalPoint);

  // Delta required to move the visible marker exactly onto the target hole.
  tempPartLeadDirection.copy(tempPartLocalPoint).sub(tempPartScaledLeadPoint);

  // Translate both lead placement points by the same delta.
  // This keeps the part orientation unchanged for now.
  leadPositionLocal.add(tempPartLeadDirection);
  otherLeadPositionLocal.add(tempPartLeadDirection);

  if (endKey === 'start') {
    part.userData.startSnappedTarget = nearestTarget;
    part.userData.endSnappedTarget = null;
    setPartLeadInsertionDepth(part, 'start', 0);
    setPartLeadInsertionDepth(part, 'end', 0);
  } else {
    part.userData.endSnappedTarget = nearestTarget;
    part.userData.startSnappedTarget = null;
    setPartLeadInsertionDepth(part, 'end', 0);
    setPartLeadInsertionDepth(part, 'start', 0);
  }

  updateInteractivePartTransform(part);
  updatePartLeadLandingTargets(part);

  return true;
}

function finishPartDrag(event) {
  if (!partDragState.active) {
    return;
  }

  if (event.pointerId !== undefined && partDragState.pointerId !== event.pointerId) {
    return;
  }

  const definition = PART_DEFINITION_BY_KEY.get(partDragState.definitionKey);
  const placedPart = partDragState.previewPart && partDragState.placementValid
    ? partDragState.previewPart
    : null;

  if (placedPart) {
    placedPart.userData.content?.traverse((object) => {
      if (!object.isMesh) {
        return;
      }

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.opacity = 1;
        material.transparent = false;
        material.depthWrite = true;
      }
    });
    placedPart.userData.isPreview = false;
    placedPart.userData.startHandle.visible = true;
    placedPart.userData.endHandle.visible = true;
  }

  if (!placedPart) {
    clearPartDragPreview();
  } else {
    partDragState.previewPart = null;
    partDragState.placementValid = false;
  }

  partDragState.active = false;
  partDragState.pointerId = null;
  partDragState.definitionKey = null;
  document.body.classList.remove('is-dragging');

  if (placedPart) {
    snapPlacedPartLeadToNearestBreadboardTarget(placedPart, PART_REDRAG_SNAP_END);
    refreshTargetVisuals();

    animatePartInsertion(placedPart);

    if (partDragState.mode === 'new' && !placedParts.includes(placedPart)) {
      placedParts.push(placedPart);
    }

    const landingSummary = buildPartLeadLandingSummary(placedPart);

    setStatus(
      landingSummary
        ? `${partDragState.mode === 'redrag' ? 'Moved' : 'Placed'} the ${definition?.statusLabel ?? 'part'} with ${landingSummary}.`
        : `${partDragState.mode === 'redrag' ? 'Moved' : 'Placed'} the ${definition?.statusLabel ?? 'part'} on the breadboard.`
    );
  } else {
    updateStatusForState();
  }

  partDragState.mode = 'new';
  partDragState.originalPart = null;

  controls.enabled = true;

  if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }

  refreshTargetVisuals();
  refreshConnectivityPanel();
  updateHandleVisuals();
  updateCanvasCursor();
}

function beginPartLeadDrag(part, event, draggedEnd) {
  event.preventDefault();
  partLeadState.dragging = true;
  partLeadState.activePart = part;
  partLeadState.draggedEnd = draggedEnd;
  partLeadState.hoveredPart = null;
  partLeadState.hoveredEnd = null;
  partLeadState.hoveredTarget = null;
  wireState.hoveredWire = null;
  wireState.hoveredEnd = null;
  wireState.hoveredTarget = null;

  if (draggedEnd === 'start') {
    part.userData.startSnappedTarget = null;
    part.userData.startLandedTarget = null;
    setPartLeadInsertionDepth(part, 'start', 0);
  } else {
    part.userData.endSnappedTarget = null;
    part.userData.endLandedTarget = null;
    setPartLeadInsertionDepth(part, 'end', 0);
  }

  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
  document.body.classList.add('is-dragging');

  updateInteractivePartTransform(part);
  updatePartLeadLandingTargets(part);
  updateStatusForState();
  updateCanvasCursor();
  refreshTargetVisuals();
  refreshConnectivityPanel();
}

function finishPartLeadDrag(event) {
  const part = partLeadState.activePart;

  if (!partLeadState.dragging || !part) {
    return;
  }

  const draggedEnd = partLeadState.draggedEnd;
  partLeadState.dragging = false;

  if (partLeadState.hoveredTarget) {
    if (draggedEnd === 'start') {
      part.userData.startSnappedTarget = partLeadState.hoveredTarget;
      setPartLeadInsertionDepth(part, 'start', 0);
      writePartLeadLocalPositionFromTarget(
        part,
        'start',
        partLeadState.hoveredTarget,
        part.userData.startLeadPositionLocal
      );
    } else {
      part.userData.endSnappedTarget = partLeadState.hoveredTarget;
      setPartLeadInsertionDepth(part, 'end', 0);
      writePartLeadLocalPositionFromTarget(
        part,
        'end',
        partLeadState.hoveredTarget,
        part.userData.endLeadPositionLocal
      );
    }
  }

  partLeadState.draggedEnd = null;
  partLeadState.hoveredTarget = null;
  controls.enabled = true;
  document.body.classList.remove('is-dragging');

  if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }

  updateInteractivePartTransform(part);
  updatePartLeadLandingTargets(part);
  animatePartInsertion(part);
  refreshTargetVisuals();
  refreshConnectivityPanel();
  const landingSummary = buildPartLeadLandingSummary(part);
  const definition = PART_DEFINITION_BY_KEY.get(part.userData.definitionKey);
  setStatus(
    landingSummary
      ? `Connected the ${definition?.statusLabel ?? 'part'} with ${landingSummary}.`
      : `Moved the ${definition?.statusLabel ?? 'part'} lead.`
  );
  updateCanvasCursor();
}

function createPartBodyHitArea(part) {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const hitArea = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    material
  );

  hitArea.name = 'part-body-hit-area';
  hitArea.userData.interactionType = 'placedPart';
  hitArea.userData.part = part;

  // Keep it raycastable but invisible.
  hitArea.visible = true;
  hitArea.renderOrder = -1;

  part.add(hitArea);
  part.userData.bodyHitArea = hitArea;

  return hitArea;
}

function updatePartBodyHitArea(part) {
  const content = part?.userData?.content;
  const configuredHitbox = getConfiguredPartBodyHitbox(part?.userData?.definitionKey);

  if (!part || !content) {
    return null;
  }

  const hitArea = part.userData.bodyHitArea ?? createPartBodyHitArea(part);

  // Avoid including the hitbox itself in the computed box.
  const previousVisible = hitArea.visible;
  hitArea.visible = false;

  part.updateMatrixWorld(true);
  content.updateMatrixWorld(true);

  tempBox.setFromObject(content);

  hitArea.visible = previousVisible;

  if (tempBox.isEmpty()) {
    return hitArea;
  }

  // Convert the world-space bounding box into the part's local space.
  tempPartMatrix.copy(part.matrixWorld).invert();

  const localBox = new THREE.Box3();
  const min = tempBox.min;
  const max = tempBox.max;

  const corners = [
    [min.x, min.y, min.z],
    [min.x, min.y, max.z],
    [min.x, max.y, min.z],
    [min.x, max.y, max.z],
    [max.x, min.y, min.z],
    [max.x, min.y, max.z],
    [max.x, max.y, min.z],
    [max.x, max.y, max.z],
  ];

  for (const [x, y, z] of corners) {
    tempPoint.set(x, y, z).applyMatrix4(tempPartMatrix);
    localBox.expandByPoint(tempPoint);
  }

  localBox.getCenter(tempCenter);
  localBox.getSize(tempSize);

  if (configuredHitbox?.size) {
    tempSize.set(
      configuredHitbox.size.x ?? tempSize.x,
      configuredHitbox.size.y ?? tempSize.y,
      configuredHitbox.size.z ?? tempSize.z
    );
    tempCenter.x += configuredHitbox.offset?.x ?? 0;
    tempCenter.y += configuredHitbox.offset?.y ?? 0;
    tempCenter.z += configuredHitbox.offset?.z ?? 0;
  } else {
    tempSize.x = Math.max(tempSize.x + PART_BODY_HITBOX_PADDING, PART_BODY_HITBOX_MIN_SIZE);
    tempSize.y = Math.max(tempSize.y + PART_BODY_HITBOX_PADDING, PART_BODY_HITBOX_MIN_SIZE);
    tempSize.z = Math.max(tempSize.z + PART_BODY_HITBOX_PADDING, PART_BODY_HITBOX_MIN_SIZE);
  }

  hitArea.geometry.dispose();
  hitArea.geometry = new THREE.BoxGeometry(tempSize.x, tempSize.y, tempSize.z);
  hitArea.position.copy(tempCenter);

  return hitArea;
}

function getPlacedPartUnderPointer() {
  const hitAreas = getAllPlacedPartHitAreas();

  if (hitAreas.length === 0) {
    return null;
  }

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(hitAreas, false);
  return intersections[0]?.object?.userData?.part ?? null;
}

function pickPreferredPointerInteraction(intersections) {
  if (!Array.isArray(intersections) || intersections.length === 0) {
    return null;
  }

  const preferredInteraction = intersections.find(({ object }) => {
    const interactionType = object?.userData?.interactionType;
    return interactionType === 'partLead' || Boolean(object?.userData?.wire);
  });

  return preferredInteraction ?? intersections[0];
}

function getAllPlacedPartHitAreas() {
  const hitAreas = [];

  for (const part of placedParts) {
    const hitArea = updatePartBodyHitArea(part);

    if (!hitArea) {
      continue;
    }

    hitArea.userData.interactionType = 'placedPart';
    hitArea.userData.part = part;

    hitAreas.push(hitArea);
  }

  return hitAreas;
}

function getPartLeadInsertionDepth(part, endKey) {
  return endKey === 'start'
    ? part?.userData?.startInsertionDepth ?? 0
    : part?.userData?.endInsertionDepth ?? 0;
}

function setPartLeadInsertionDepth(part, endKey, depth) {
  if (!part) {
    return;
  }

  const key = endKey === 'start' ? 'startInsertionDepth' : 'endInsertionDepth';
  part.userData[key] = depth;
}

function writePartLeadLocalPositionFromTarget(part, endKey, target, output) {
  if (!breadboardPartsRoot || !part || !target || !output) {
    return false;
  }

  tempPartLocalPoint.copy(target.userData.worldPosition);
  getTargetWorldNormal(target, tempNormal);
  tempPartLocalPoint.addScaledVector(tempNormal, -getPartLeadInsertionDepth(part, endKey));
  breadboardPartsRoot.worldToLocal(tempPartLocalPoint);
  output.copy(tempPartLocalPoint);

  return true;
}

function setPartInsertedVisualState(part, inserted) {
  if (!part) {
    return;
  }

  if (part.userData.insertionAnimationFrame) {
    cancelAnimationFrame(part.userData.insertionAnimationFrame);
    part.userData.insertionAnimationFrame = null;
  }

  for (const endKey of ['start', 'end']) {
    const snappedTarget =
      endKey === 'start' ? part.userData.startSnappedTarget : part.userData.endSnappedTarget;
    setPartLeadInsertionDepth(
      part,
      endKey,
      inserted && snappedTarget ? PART_INSERTION_DEPTH : 0
    );
  }

  updateInteractivePartTransform(part);
}

function animatePartInsertion(part) {
  if (!part) {
    return;
  }

  if (part.userData.insertionAnimationFrame) {
    cancelAnimationFrame(part.userData.insertionAnimationFrame);
    part.userData.insertionAnimationFrame = null;
  }

  const startStartDepth = getPartLeadInsertionDepth(part, 'start');
  const startEndDepth = getPartLeadInsertionDepth(part, 'end');
  const targetStartDepth = part.userData.startSnappedTarget ? PART_INSERTION_DEPTH : 0;
  const targetEndDepth = part.userData.endSnappedTarget ? PART_INSERTION_DEPTH : 0;

  if (
    Math.abs(startStartDepth - targetStartDepth) < 1e-6 &&
    Math.abs(startEndDepth - targetEndDepth) < 1e-6
  ) {
    updateInteractivePartTransform(part);
    updatePartBodyHitArea(part);
    return;
  }

  const startedAt = performance.now();

  function step(now) {
    const elapsed = (now - startedAt) / 1000;
    const t = THREE.MathUtils.clamp(elapsed / PART_INSERTION_DURATION, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    setPartLeadInsertionDepth(
      part,
      'start',
      THREE.MathUtils.lerp(startStartDepth, targetStartDepth, eased)
    );
    setPartLeadInsertionDepth(
      part,
      'end',
      THREE.MathUtils.lerp(startEndDepth, targetEndDepth, eased)
    );
    updateInteractivePartTransform(part);

    if (t < 1) {
      part.userData.insertionAnimationFrame = requestAnimationFrame(step);
      return;
    }

    setPartLeadInsertionDepth(part, 'start', targetStartDepth);
    setPartLeadInsertionDepth(part, 'end', targetEndDepth);
    part.userData.insertionAnimationFrame = null;
    updateInteractivePartTransform(part);
    updatePartBodyHitArea(part);
  }

  part.userData.insertionAnimationFrame = requestAnimationFrame(step);
}

function cacheSnapTargetWorldPositions() {
  for (const target of getAllSnapTargets()) {
    target.userData.worldPosition = target.getWorldPosition(new THREE.Vector3());
  }
}

function updateHandleVisuals() {
  const pulse = 1 + Math.sin(clock.getElapsedTime() * 4.25) * 0.06;

  for (const wire of interactiveWires) {
    const startHalo = wire.startPlug?.userData.halo;
    const endHalo = wire.endPlug?.userData.halo;

    if (!startHalo || !endHalo) {
      continue;
    }

    const startHighlighted =
      (wireState.dragging && wireState.activeWire === wire && wireState.draggedEnd === 'start') ||
      (wireState.hoveredWire === wire && wireState.hoveredEnd === 'start');
    const endHighlighted =
      (wireState.dragging && wireState.activeWire === wire && wireState.draggedEnd === 'end') ||
      (wireState.hoveredWire === wire && wireState.hoveredEnd === 'end');

    const startConnected = Boolean(wire.startSnappedTarget);
    const endConnected = Boolean(wire.endSnappedTarget);

    startHalo.material.color.setHex(startConnected ? 0xffb36a : 0x40d6b1);
    startHalo.material.emissive.setHex(startConnected ? 0xff8b2b : 0x40d6b1);
    startHalo.material.opacity =
      wireState.dragging && wireState.activeWire === wire && wireState.draggedEnd === 'start'
        ? 0.34
        : startHighlighted
          ? 0.25
          : 0.14;
    startHalo.scale.setScalar((startConnected ? 1.1 : 1) * pulse);

    endHalo.material.color.setHex(endConnected ? 0xffb36a : 0x7ed2ff);
    endHalo.material.emissive.setHex(endConnected ? 0xff8b2b : 0x7ed2ff);
    endHalo.material.opacity =
      wireState.dragging && wireState.activeWire === wire && wireState.draggedEnd === 'end'
        ? 0.34
        : endHighlighted
          ? 0.25
          : 0.14;
    endHalo.scale.setScalar((endConnected ? 1.1 : 1) * pulse);
  }

  for (const part of placedParts) {
    const startHandle = part.userData.startHandle;
    const endHandle = part.userData.endHandle;

    if (!startHandle || !endHandle) {
      continue;
    }

    const startActive =
      (partLeadState.dragging &&
        partLeadState.activePart === part &&
        partLeadState.draggedEnd === 'start') ||
      (partLeadState.hoveredPart === part && partLeadState.hoveredEnd === 'start');
    const endActive =
      (partLeadState.dragging &&
        partLeadState.activePart === part &&
        partLeadState.draggedEnd === 'end') ||
      (partLeadState.hoveredPart === part && partLeadState.hoveredEnd === 'end');
    const startSnapped = Boolean(part.userData.startSnappedTarget);
    const endSnapped = Boolean(part.userData.endSnappedTarget);

    setPartLeadVisualState(startHandle, startActive, startSnapped);
    setPartLeadVisualState(endHandle, endActive, endSnapped);

    startHandle.userData.halo.scale.setScalar(
      (startSnapped ? 1.08 : 1) * (1 + Math.sin(clock.getElapsedTime() * 4.25) * 0.04)
    );
    endHandle.userData.halo.scale.setScalar(
      (endSnapped ? 1.08 : 1) * (1 + Math.sin(clock.getElapsedTime() * 4.25) * 0.04)
    );
  }
}

function updateStatusForState() {
  if (partDragState.active) {
    const definition = PART_DEFINITION_BY_KEY.get(partDragState.definitionKey);

    if (partDragState.placementValid) {
      setStatus(`Release to place the ${definition?.statusLabel ?? 'part'} on the breadboard.`);
      return;
    }

    setStatus(`Drag the ${definition?.statusLabel ?? 'part'} onto the breadboard, then release to place it.`);
    return;
  }

  if (partLeadState.dragging && partLeadState.hoveredTarget) {
    const definition = PART_DEFINITION_BY_KEY.get(partLeadState.activePart?.userData.definitionKey);
    const leadLabel = partLeadState.activePart
      ? getPartLeadLabel(partLeadState.activePart, partLeadState.draggedEnd).toLowerCase()
      : 'lead';
    setStatus(
      `Release to connect the ${definition?.statusLabel ?? 'part'} ${leadLabel} to breadboard ${partLeadState.hoveredTarget.userData.label}.`
    );
    return;
  }

  if (partLeadState.dragging) {
    const definition = PART_DEFINITION_BY_KEY.get(partLeadState.activePart?.userData.definitionKey);
    const leadLabel = partLeadState.activePart
      ? getPartLeadLabel(partLeadState.activePart, partLeadState.draggedEnd).toLowerCase()
      : 'lead';
    setStatus(
      `Release over a glowing breadboard hole to snap the ${definition?.statusLabel ?? 'part'} ${leadLabel}.`
    );
    return;
  }

  if (wireState.dragging && wireState.hoveredTarget) {
    setStatus(
      `Release to connect the ${wireState.draggedEnd} plug to ${buildTargetConnectionLabel(wireState.hoveredTarget)}.`
    );
    return;
  }

  if (wireState.dragging) {
    setStatus('Release over a glowing Arduino or breadboard hole to snap the wire into place.');
    return;
  }

  const latestFullyConnectedWire = getLatestConnectedWire(true);

  if (latestFullyConnectedWire) {
    const connectedWireCount = interactiveWires.filter(
      (wire) => wire.startSnappedTarget && wire.endSnappedTarget
    ).length;
    const prefix = connectedWireCount > 1 ? `${connectedWireCount} wires connected. Last: ` : 'Connected: ';

    setStatus(
      `${prefix}${buildTargetConnectionLabel(latestFullyConnectedWire.startSnappedTarget)} -> ${buildTargetConnectionLabel(latestFullyConnectedWire.endSnappedTarget)}.`
    );
    return;
  }

  if (getLatestConnectedWire()) {
    setStatus(
      placedParts.length > 0
        ? 'Ready: drag any wire plug or component lead to reposition the circuit.'
        : 'Ready: drag any wire plug to reposition the connection or add another wire.'
    );
    return;
  }

  setStatus(
    placedParts.length > 0
      ? 'Ready: drag any wire plug or component lead to the hole you want.'
      : 'Ready: drag any wire plug to the Arduino or breadboard hole you want.'
  );
}

function updateWireGeometry(wire) {
  if (!wire?.cableMesh || !wire.startPlug || !wire.endPlug) {
    return;
  }

  copyStateToVector(positionState.wire, tempWireOffset);

  const startTip = tempStartTip.copy(wire.startTip).add(tempWireOffset);
  const endTip = tempEndTip.copy(wire.endTip).add(tempWireOffset);
  startTip.y -= wire.startInsertionDepth;
  endTip.y -= wire.endInsertionDepth;
  const startNormal = getPlugSurfaceNormal(wire, 'start', tempNormal);
  const endNormal = getPlugSurfaceNormal(wire, 'end', tempNormalB);

  wire.startPlug.position.copy(startTip);
  // Each plug should stand off from the board surface; the cable then bends
  // between the strain-relief exits instead of deciding the plug direction.
  wire.startPlug.quaternion.setFromUnitVectors(startPlugSurfaceAxis, startNormal);
  wire.startPlug.quaternion.multiply(wireStartRotationOffset);

  wire.endPlug.position.copy(endTip);
  wire.endPlug.quaternion.setFromUnitVectors(endPlugSurfaceAxis, endNormal);
  wire.endPlug.quaternion.multiply(wireEndRotationOffset);

  tempCableStart.set(0, CABLE_EXIT_OFFSET, 0);
  wire.startPlug.localToWorld(tempCableStart);
  tempCableEnd.set(0, CABLE_EXIT_OFFSET, 0);
  wire.endPlug.localToWorld(tempCableEnd);

  const cableDistance = tempCableStart.distanceTo(tempCableEnd);
  const lift = THREE.MathUtils.clamp(cableDistance * 0.18, 8, 24);
  tempAverageNormal.copy(startNormal).add(endNormal);

  if (tempAverageNormal.lengthSq() < 1e-6) {
    tempAverageNormal.copy(upAxis);
  } else {
    tempAverageNormal.normalize();
  }

    // Cable exit direction from each plug (local +Y axis in plug space)
  tempStartCableDir.set(0, 1, 0).applyQuaternion(wire.startPlug.quaternion).normalize();
  tempEndCableDir.set(0, 1, 0).applyQuaternion(wire.endPlug.quaternion).normalize();

  // Extra near-plug relief points so the wire bends close to the connector
  tempStartReliefPoint
    .copy(tempCableStart)
    .addScaledVector(tempStartCableDir, CABLE_STRAIN_RELIEF_LENGTH)
    .addScaledVector(tempAverageNormal, CABLE_END_BEND_LIFT);

  tempEndReliefPoint
    .copy(tempCableEnd)
    .addScaledVector(tempEndCableDir, CABLE_STRAIN_RELIEF_LENGTH)
    .addScaledVector(tempAverageNormal, CABLE_END_BEND_LIFT);

   // Main arch controls
  tempControlA
    .lerpVectors(tempStartReliefPoint, tempEndReliefPoint, 0.33)
    .addScaledVector(tempAverageNormal, lift);

  tempControlB
    .lerpVectors(tempStartReliefPoint, tempEndReliefPoint, 0.66)
    .addScaledVector(tempAverageNormal, lift * 0.88);

  const curve = new THREE.CatmullRomCurve3([
    tempCableStart.clone(),
    tempStartReliefPoint.clone(),
    tempControlA.clone(),
    tempControlB.clone(),
    tempEndReliefPoint.clone(),
    tempCableEnd.clone(),
  ]);

  curve.curveType = 'centripetal';

  const nextGeometry = new THREE.TubeGeometry(curve, 42, CABLE_RADIUS, 14, false);
  wire.cableMesh.geometry.dispose();
  wire.cableMesh.geometry = nextGeometry;
}

function findNearestTarget(point, targets) {
  let nearestTarget = null;
  let nearestDistance = Infinity;

  for (const target of targets) {
    const distance = point.distanceTo(target.userData.worldPosition);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target;
    }
  }

  if (nearestDistance <= SNAP_DISTANCE) {
    return nearestTarget;
  }

  return null;
}

function findNearestTargetWithoutDistanceLimit(point, targets) {
  let nearestTarget = null;
  let nearestDistance = Infinity;

  for (const target of targets) {
    const distance = point.distanceTo(target.userData.worldPosition);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target;
    }
  }

  return nearestTarget;
}

function updatePointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function frameScene(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (maxDimension / (2 * Math.tan(fov / 2))) * 0.7;

  camera.position.set(
    center.x + distance * 0.94,
    center.y + distance * 0.7,
    center.z + distance * 0.94
  );
  camera.near = Math.max(0.1, distance / 120);
  camera.far = distance * 14;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.maxDistance = distance * 4;
  controls.update();
}

function updateCanvasCursor() {
  if (partDragState.active) {
    setCanvasCursor(partDragState.placementValid ? 'copy' : 'grabbing');
    return;
  }

  if (partLeadState.dragging) {
    setCanvasCursor('grabbing');
    return;
  }

  if (wireState.dragging) {
    setCanvasCursor('grabbing');
    return;
  }

  if (wireState.hoveredWire || partLeadState.hoveredPart) {
    setCanvasCursor('grab');
    return;
  }

  if (hoveredPlacedPart) {
    setCanvasCursor('grab');
    return;
  }

  setCanvasCursor('default');
}

function beginDrag(wire, event, draggedEnd) {
  event.preventDefault();
  wireState.dragging = true;
  wireState.activeWire = wire;
  wireState.draggedEnd = draggedEnd;
  wireState.hoveredWire = null;
  wireState.hoveredEnd = null;
  wireState.hoveredTarget = null;

  if (draggedEnd === 'start') {
    wire.startSnappedTarget = null;
    wire.startInsertionDepth = 0;
  } else {
    wire.endSnappedTarget = null;
    wire.endInsertionDepth = 0;
  }

  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
  document.body.classList.add('is-dragging');

  updateStatusForState();
  updateCanvasCursor();
  refreshTargetVisuals();
  refreshConnectivityPanel();
}

function finishDrag(event) {
  const wire = wireState.activeWire;

  if (!wireState.dragging || !wire) {
    return;
  }

  const draggedEnd = wireState.draggedEnd;
  wireState.dragging = false;

  if (wireState.hoveredTarget) {
    if (draggedEnd === 'start') {
      wire.startSnappedTarget = wireState.hoveredTarget;
      wire.startTip.copy(wireState.hoveredTarget.userData.worldPosition);
      wire.startInsertionDepth = PLUG_INSERTION_DEPTH;
    } else {
      wire.endSnappedTarget = wireState.hoveredTarget;
      wire.endTip.copy(wireState.hoveredTarget.userData.worldPosition);
      wire.endInsertionDepth = PLUG_INSERTION_DEPTH;
    }

    if (wireState.hoveredTarget.userData.surfaceKey) {
      setSurfaceKeyForEnd(wire, draggedEnd, wireState.hoveredTarget.userData.surfaceKey);
    }
  }

  wireState.draggedEnd = null;
  wireState.hoveredTarget = null;
  controls.enabled = true;
  document.body.classList.remove('is-dragging');

  if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }

  refreshTargetVisuals();
  refreshConnectivityPanel();
  updateStatusForState();
  updateCanvasCursor();
  updateWireGeometry(wire);
}

function onPointerDown(event) {
  if (partDragState.active) {
    return;
  }

  const hitAreas = [
    ...getAllPlacedPartHitAreas(),
    ...getAllWireHitAreas(),
    ...(ENABLE_PART_LEAD_REDRAG ? getAllPartLeadHitAreas() : []),
  ];

  if (hitAreas.length === 0) {
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(hitAreas, false);
  const preferredIntersection = pickPreferredPointerInteraction(intersections);

  if (preferredIntersection) {
    const { wire, part, endKey, interactionType } = preferredIntersection.object.userData;

    if (interactionType === 'placedPart' && part) {
      beginPlacedPartRedrag(part, event);
      return;
    }

    if (
      ENABLE_PART_LEAD_REDRAG &&
      interactionType === 'partLead' &&
      part &&
      endKey
    ) {
      beginPartLeadDrag(part, event, endKey);
      return;
    }

    if (wire && endKey) {
      beginDrag(wire, event, endKey);
    }
  }
}

function onPointerMove(event) {
  if (partDragState.active) {
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  if (!partDragState.active && !wireState.dragging && !partLeadState.dragging) {
    hoveredPlacedPart = getPlacedPartUnderPointer();
  } else {
    hoveredPlacedPart = null;
  }

  if (partLeadState.dragging) {
    const part = partLeadState.activePart;

    if (!part || !getClampedPointOnSurfaceFromRay(raycaster.ray, 'breadboardSurface', tempPoint)) {
      partLeadState.hoveredTarget = null;
      refreshTargetVisuals();
      updateStatusForState();
      updateCanvasCursor();
      return;
    }

    const nearestTarget = findNearestTarget(tempPoint, breadboardTargets);

    partLeadState.hoveredTarget =
      nearestTarget &&
      isMatchingFixedLeadTarget(partLeadState.activePart, partLeadState.draggedEnd, nearestTarget)
        ? nearestTarget
        : null;

    if (nearestTarget) {
      tempPartLocalPoint.copy(nearestTarget.userData.worldPosition);
    } else {
      tempPartLocalPoint.copy(tempPoint);
    }

    breadboardPartsRoot.worldToLocal(tempPartLocalPoint);

    if (partLeadState.draggedEnd === 'start') {
      part.userData.startLeadPositionLocal.copy(tempPartLocalPoint);
    } else {
      part.userData.endLeadPositionLocal.copy(tempPartLocalPoint);
    }

    updateInteractivePartTransform(part);
    refreshTargetVisuals();
    updateStatusForState();
    updateCanvasCursor();
    return;
  }

  if (wireState.dragging) {
    const wire = wireState.activeWire;

    if (!wire) {
      return;
    }

    const clampedSurfaceKey = getClampedDragPointForEnd(
      wire,
      wireState.draggedEnd,
      raycaster.ray,
      tempPoint
    );

    if (clampedSurfaceKey) {
      setSurfaceKeyForEnd(wire, wireState.draggedEnd, clampedSurfaceKey);

      const dragPoint = tempPointB.copy(tempPoint).sub(
        copyStateToVector(positionState.wire, tempWireOffset)
      );
      const availableTargets = getAllSnapTargets();
      const nearestTarget = findNearestTarget(dragPoint, availableTargets);
      wireState.hoveredTarget = nearestTarget;

      if (nearestTarget) {
        if (wireState.draggedEnd === 'start') {
          wire.startTip.copy(nearestTarget.userData.worldPosition);
        } else {
          wire.endTip.copy(nearestTarget.userData.worldPosition);
        }
      } else {
        if (wireState.draggedEnd === 'start') {
          wire.startTip.copy(dragPoint);
        } else {
          wire.endTip.copy(dragPoint);
        }
      }

      if (wireState.draggedEnd === 'start') {
        updateArduinoDragPlane();
      } else {
        updateBreadboardDragPlane();
      }

      updateWireGeometry(wire);
      refreshTargetVisuals();
      updateStatusForState();
    }

    updateCanvasCursor();
    return;
  }

  const intersections = raycaster.intersectObjects(
    [
      ...getAllWireHitAreas(),
      ...(ENABLE_PART_LEAD_REDRAG ? getAllPartLeadHitAreas() : []),
    ],
    false
  );
  const hoveredObject = intersections[0]?.object?.userData ?? null;

  if (hoveredObject?.interactionType === 'partLead') {
    wireState.hoveredWire = null;
    wireState.hoveredEnd = null;
    partLeadState.hoveredPart = hoveredObject.part ?? null;
    partLeadState.hoveredEnd = hoveredObject.endKey ?? null;
  } else {
    partLeadState.hoveredPart = null;
    partLeadState.hoveredEnd = null;
    wireState.hoveredWire = hoveredObject?.wire ?? null;
    wireState.hoveredEnd = hoveredObject?.endKey ?? null;
  }

  updateCanvasCursor();
}

function onWindowPointerMove(event) {
  if (!partDragState.active || partDragState.pointerId !== event.pointerId) {
    return;
  }

  partDragState.clientX = event.clientX;
  partDragState.clientY = event.clientY;
  updatePartDragPreview(event);
}

function onPointerUp(event) {
  if (partDragState.active) {
    finishPartDrag(event);
    return;
  }

  if (ENABLE_PART_LEAD_REDRAG && partLeadState.dragging) {
    finishPartLeadDrag(event);
    return;
  }

  finishDrag(event);
}

function onWindowMouseDownForPartRotate(event) {
  // Right mouse button only. Use mousedown instead of pointerdown so a
  // secondary click still registers while the left button is already holding
  // an active drag.
  if (event.button !== 2) {
    return;
  }

  // Only handle active component placement/redrag.
  if (!partDragState.active || !partDragState.previewPart) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  rotatePartAroundLead(
    partDragState.previewPart,
    PART_REDRAG_SNAP_END,
    event.shiftKey ? -PART_ROTATION_STEP_DEGREES : PART_ROTATION_STEP_DEGREES
  );

  // Re-apply the current hover position after changing orientation.
  updatePartDragPreview(event);

  setStatus(
    `Rotated the ${PART_DEFINITION_BY_KEY.get(partDragState.definitionKey)?.statusLabel ?? 'part'} ${event.shiftKey ? 'counter-clockwise' : 'clockwise'}.`
  );
}

function onWindowWheelForPartRotate(event) {
  if (!partDragState.active || !partDragState.previewPart || !isPointerOverCanvas(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const direction = event.deltaY > 0 ? 1 : -1;

  rotatePartAroundLead(
    partDragState.previewPart,
    PART_REDRAG_SNAP_END,
    direction * PART_ROTATION_STEP_DEGREES
  );

  updatePartDragPreview(event);

  const definition = PART_DEFINITION_BY_KEY.get(partDragState.definitionKey);

  setStatus(
    `Rotated the ${definition?.statusLabel ?? 'part'} ${direction > 0 ? 'clockwise' : 'counter-clockwise'}.`
  );

  updateCanvasCursor();
}

function onWindowKeyDownForPartRotate(event) {
  if (
    event.code !== 'KeyR' ||
    event.repeat ||
    !partDragState.active ||
    !partDragState.previewPart
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  rotatePartAroundLead(
    partDragState.previewPart,
    PART_REDRAG_SNAP_END,
    event.shiftKey ? -PART_ROTATION_STEP_DEGREES : PART_ROTATION_STEP_DEGREES
  );

  updatePartDragPreview({
    clientX: partDragState.clientX,
    clientY: partDragState.clientY,
  });

  const definition = PART_DEFINITION_BY_KEY.get(partDragState.definitionKey);

  setStatus(
    `Rotated the ${definition?.statusLabel ?? 'part'} ${event.shiftKey ? 'counter-clockwise' : 'clockwise'} with R.`
  );

  updateCanvasCursor();
}

function onCanvasContextMenu(event) {
  event.preventDefault();

  // Active drag rotation is handled by onWindowPointerDownForPartRotate().
  if (partDragState.active && partDragState.previewPart) {
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(getAllPlacedPartHitAreas(), false);
  const part = intersections[0]?.object?.userData?.part ?? null;

  if (part) {
    rotatePartAroundLead(
      part,
      PART_REDRAG_SNAP_END,
      event.shiftKey ? -PART_ROTATION_STEP_DEGREES : PART_ROTATION_STEP_DEGREES
    );

    snapPlacedPartLeadToNearestBreadboardTarget(part, PART_REDRAG_SNAP_END);
    animatePartInsertion(part);
    refreshConnectivityPanel();

    const landingSummary = buildPartLeadLandingSummary(part);
    setStatus(
      landingSummary
        ? `Rotated the ${PART_DEFINITION_BY_KEY.get(part.userData.definitionKey)?.statusLabel ?? 'part'} to ${landingSummary}.`
        : `Rotated the ${PART_DEFINITION_BY_KEY.get(part.userData.definitionKey)?.statusLabel ?? 'part'}.`
    );
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function init() {
  const [arduinoGltf, breadboardGltf, ...partGltfs] = await Promise.all([
    loadModel('/models/uno_simulator/Arduino_Uno_R3.glb'),
    loadModel('/models/uno_simulator/Half-Size+Breadboard.glb'),
    ...PART_DEFINITIONS.map((definition) => loadModel(definition.modelUrl)),
  ]);

  const arduinoModel = normalizeModel(arduinoGltf.scene);
  const breadboardModel = normalizeModel(breadboardGltf.scene);
  const arduinoRig = createRotationRig(arduinoModel, BASE_ROTATIONS.arduino);
  const breadboardRig = createRotationRig(breadboardModel, BASE_ROTATIONS.breadboard);

  arduinoRigRoot = arduinoRig.root;
  breadboardRigRoot = breadboardRig.root;
  arduino = arduinoRig.adjustment;
  breadboard = breadboardRig.adjustment;

  for (const [index, definition] of PART_DEFINITIONS.entries()) {
    partModelCache.set(definition.key, normalizeModel(partGltfs[index].scene));
  }

  assembly.add(arduinoRigRoot, breadboardRigRoot);

  const arduinoSize = arduino.userData.size;
  const arduinoHeaderSurfaceY = arduinoSize.y - 2.8;
  const arduinoHeaderBaseX = arduinoSize.x * 0.02;
  const arduinoHeaderRowOffset = arduinoSize.z * 0.22;

  arduinoHeaderLeft = new THREE.Group();
  arduino.add(arduinoHeaderLeft);

  arduinoHeaderLeftContent = new THREE.Group();
  arduinoHeaderLeftContent.position.set(
    arduinoHeaderBaseX,
    arduinoHeaderSurfaceY,
    -arduinoHeaderRowOffset
  );
  arduinoHeaderLeft.add(arduinoHeaderLeftContent);

  const arduinoHeaderLeftGuide = createSurfaceGuide(
    BASE_SURFACE_SIZES.arduinoHeaderLeft.width,
    BASE_SURFACE_SIZES.arduinoHeaderLeft.depth,
    0x38e2d0,
    0x0f9f91
  );
  arduinoHeaderLeftGuide.visible = false;
  surfaceGuides.set('arduinoHeaderLeft', arduinoHeaderLeftGuide);
  arduinoHeaderLeftContent.add(arduinoHeaderLeftGuide);

  arduinoHeaderRight = new THREE.Group();
  arduino.add(arduinoHeaderRight);

  arduinoHeaderRightContent = new THREE.Group();
  arduinoHeaderRightContent.position.set(
    arduinoHeaderBaseX,
    arduinoHeaderSurfaceY,
    arduinoHeaderRowOffset
  );
  arduinoHeaderRight.add(arduinoHeaderRightContent);

  const arduinoHeaderRightGuide = createSurfaceGuide(
    BASE_SURFACE_SIZES.arduinoHeaderRight.width,
    BASE_SURFACE_SIZES.arduinoHeaderRight.depth,
    0xfcc15a,
    0xd97706
  );
  arduinoHeaderRightGuide.visible = false;
  surfaceGuides.set('arduinoHeaderRight', arduinoHeaderRightGuide);
  arduinoHeaderRightContent.add(arduinoHeaderRightGuide);

  arduinoTargets = [];
  arduinoHeaderGroupRoots.clear();

  for (const definition of ARDUINO_HEADER_GROUP_DEFINITIONS) {
    const parent =
      definition.surfaceKey === 'arduinoHeaderLeft'
        ? arduinoHeaderLeftContent
        : arduinoHeaderRightContent;
    createArduinoHeaderGroup(parent, arduinoTargets, definition);
  }

  startAnchor =
    arduinoTargets.find(
      (target) =>
        target.userData.groupKey === 'arduinoHeaderLeftGroup1' && target.userData.pinIndex === 3
    ) ?? arduinoTargets[0];

  const breadboardSize = breadboard.userData.size;
  const topY = breadboardSize.y + 0.25;

  breadboardSurface = new THREE.Group();
  breadboard.add(breadboardSurface);

  const breadboardSurfaceContent = new THREE.Group();
  breadboardSurfaceContent.position.y = topY;
  breadboardSurface.add(breadboardSurfaceContent);

  const breadboardSurfaceGuide = createSurfaceGuide(
    BREADBOARD_SURFACE_BASE_WIDTH,
    BREADBOARD_SURFACE_BASE_DEPTH,
    0xff4fa3,
    0xff2d86
  );
  breadboardSurfaceGuide.visible = false;
  surfaceGuides.set('breadboardSurface', breadboardSurfaceGuide);
  breadboardSurfaceContent.add(breadboardSurfaceGuide);

  breadboardPartsRoot = new THREE.Group();
  breadboardSurfaceContent.add(breadboardPartsRoot);

  breadboardTargets = [];
  powerRailGroupRoots.clear();
  for (let rowIndex = 0; rowIndex < BREADBOARD_TERMINAL_COLUMNS; rowIndex += 1) {
    const z = BREADBOARD_COLUMN_START + rowIndex * BREADBOARD_PITCH;

    for (let columnIndex = 0; columnIndex < BREADBOARD_LEFT_ROW_LABELS.length; columnIndex += 1) {
      addBreadboardSnapTarget(
        breadboardSurfaceContent,
        breadboardTargets,
        `${BREADBOARD_LEFT_ROW_LABELS[columnIndex]}${rowIndex + 1}`,
        BREADBOARD_LEFT_ROW_START + columnIndex * BREADBOARD_PITCH,
        z
      );
    }

    for (let columnIndex = 0; columnIndex < BREADBOARD_RIGHT_ROW_LABELS.length; columnIndex += 1) {
      addBreadboardSnapTarget(
        breadboardSurfaceContent,
        breadboardTargets,
        `${BREADBOARD_RIGHT_ROW_LABELS[columnIndex]}${rowIndex + 1}`,
        BREADBOARD_RIGHT_ROW_START + columnIndex * BREADBOARD_PITCH,
        z
      );
    }
  }

  for (const definition of POWER_RAIL_GROUP_DEFINITIONS) {
    createPowerRailGroup(breadboardSurfaceContent, breadboardTargets, definition);
  }

  applyDebugTransforms();
  const primaryWire = createInteractiveWire({ isPrimary: true });
  interactiveWires.push(primaryWire);
  assembly.add(primaryWire.assembly);
  wireState.activeWire = primaryWire;
  initializePrimaryWire(primaryWire);
  syncInteractiveTransforms();
  updateHandleVisuals();
  frameScene(assembly);
  applyDefaultCameraPose();
  logCameraPose('Initial camera pose');

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('contextmenu', onCanvasContextMenu);
  window.addEventListener('wheel', onWindowWheelForPartRotate, {
    passive: false,
    capture: true,
  });
  window.addEventListener('mousedown', onWindowMouseDownForPartRotate, true);
  window.addEventListener('keydown', onWindowKeyDownForPartRotate, true);
  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  updateHandleVisuals();
  controls.update();
  renderer.render(scene, camera);
}
