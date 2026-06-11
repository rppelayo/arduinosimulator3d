import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { UnoAvrRunner } from './avr/unoAvrRunner.js';
import { compileArduinoSketch} from './avr/avr8Compiler.js';
import { ArduinoUnoSimulator, } from './avr/avr8Simulator.js';

const BREADBOARD_PITCH = 2.54;
const SNAP_DISTANCE = 4.4;
const CABLE_EXIT_OFFSET = 8.0;
const CABLE_RADIUS = 0.55;
const DEG_TO_RAD = Math.PI / 180;
const PLUG_INSERTION_DEPTH = 3.2;
const DEFAULT_PART_SURFACE_LIFT = 0.14;
const WORKSPACE_WIRE_BASE_HEIGHT = 1.9;
const PART_LEAD_HANDLE_RADIUS = 0.76;
const PART_START_LEAD_COLOR = 0x40d6b1;
const PART_END_LEAD_COLOR = 0x7ed2ff;
const SHOW_PART_LANDING_TARGET_MARKERS = false;
const POSITION_LIMIT = 220;
const SURFACE_SIZE_LIMIT = 220;
const BREADBOARD_TERMINAL_COLUMNS = 30;
const CABLE_STRAIN_RELIEF_LENGTH = 6.5;
const CABLE_END_BEND_LIFT = 2.0;
const DEFAULT_WIRE_COLOR = 0xff6d2e;
const ARDUINO_DIGITAL_PIN_NAMES = Array.from({ length: 14 }, (_, index) => `D${index}`);
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
const SHOW_CALIBRATION_PANELS = false;
const ENABLE_PART_LEAD_REDRAG = false;
const PART_ROTATION_STEP_DEGREES = 45;
const PART_REDRAG_SNAP_END = 'start';
const PART_BODY_HITBOX_PADDING = 3.5;
const PART_BODY_HITBOX_MIN_SIZE = 8;
const SHOW_PART_BODY_HITBOX_MARKERS = false;
const PART_BODY_HITBOX_MARKER_OPACITY = 0.1;
const PART_BODY_HITBOX_OUTLINE_OPACITY = 0.55;
const ARDUINO_BOARD_LED_FADE_SPEED = 10.0;
const ARDUINO_BOARD_LED_LIGHT_DECAY = 2.0;
const ARDUINO_BOARD_LED_BOOT_PULSE_DURATION = 0.5;
const ARDUINO_BOARD_LED_SIZE_LIMIT = 8;
const PART_INSERTION_LIFT = 4.0;
const PART_INSERTION_DURATION = 0.16;
const PART_INSERTION_DEPTH = 2.2;
const PART_VISUAL_INSERTION_DEPTH = 2.2;
const PUSH_BUTTON_PRESS_DEPTH = 0.55;
const PUSH_BUTTON_PRESS_SPEED = 18;
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
    iconUrl: '/assets/LED-5mm-red-leg.svg',
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
      size: { x: 8.0, y: 11.0, z: 10.0 },
      offset: { x: -0.5, y: 3.5, z: -13.0 },
    },
  },
  {
    key: 'resistor10k',
    label: '10K Resistor',
    statusLabel: '10K resistor',
    accent: '#f59e0b',
    description: '0.25W through-hole resistor',
    iconUrl: '/assets/resistor_220.svg',
    modelUrl: '/models/uno_simulator/Resistor_0.25W.glb',
    baseRotation: { x: -90, y: 0, z: 0 },
    surfaceLiftY: 15.0,
    leadPoints: [
      { x: -5.55, y: 0, z: 0 },
      { x: 5.55, y: 0, z: 0 },
    ],
    leadLabels: ['Left Lead', 'Right Lead'],
    bodyHitbox: {
      size: { x: 12.0, y: 8.0, z: 4.0 },
      offset: { x: 0.24, y: -17.11, z: -2.65 },
    },
  },
  {
    key: 'pushButton',
    label: 'Push Button',
    statusLabel: 'push button',
    accent: '#3b82f6',
    description: '6.2mm 2-pin tactile push button',
    iconUrl: '/assets/Switch-6mm-2pin.svg',
    modelUrl: '/models/uno_simulator/Push_Button_6.2x6.2_2pins.glb',
    baseRotation: { x: -90, y: 0, z: 0 },
    surfaceLiftY: 4.9,
    leadPoints: [
      { x: -2.5, y: 3.1, z: -4.9 },
      { x: 2.5, y: 3.1, z: -4.9 },
    ],
    leadLabels: ['Lead A', 'Lead B'],
    alwaysShowLeadMarkers: true,
    bodyHitbox: {
      size: { x: 8.0, y: 7.5, z: 8.5 },
      offset: { x: 0.5, y: 0, z: 0.0 },
    },
  },
];
const PART_DEFINITION_BY_KEY = new Map(
  PART_DEFINITIONS.map((definition) => [definition.key, definition])
);
const PART_MODEL_CALIBRATION_DEFINITIONS = [
  {
    key: 'pushButton',
    label: 'Push Button',
    accent: '#3b82f6',
  },
];
const ARDUINO_BOARD_LED_DEFINITIONS = [
  {
    key: 'powerLed',
    label: 'Power LED',
    accent: '#22c55e',
    color: 0x4ade80,
    meshName: null,
    fallbackPosition: { x: 24.58, y: 6.30, z: 10.48 },
    defaultSize: 0.55,
    maxLightIntensity: 0.9,
    lightDistance: 11,
  },
  {
    key: 'builtinLed',
    label: 'Onboard LED',
    accent: '#f59e0b',
    color: 0xffd54a,
    meshName: null,
    fallbackPosition: { x: 25.05, y: 6.60, z: 23.00 },
    defaultSize: 0.6,
    maxLightIntensity: 0.7,
    lightDistance: 10,
  },
];
const ARDUINO_RESET_BUTTON_PRESS_DEPTH = 0.45;
const ARDUINO_RESET_BUTTON_PRESS_SPEED = 18;
const ARDUINO_RESET_BUTTON_HITBOX_RADIUS = 4.0;

let arduinoResetButtonHitArea = null;
let arduinoResetButtonRightPressed = false;

const arduinoResetButtonState = {
  meshName: 'Node9',
  mesh: null,
  basePosition: null,
  pressAmount: 0,
  pressTarget: 0,
};

const PART_LEAD_ENDPOINTS = [
  { endKey: 'start', pointIndex: 0 },
  { endKey: 'end', pointIndex: 1 },
];
const PART_LEAD_MARKER_OFFSET_LIMIT = 50;
const PART_LEAD_MARKER_OFFSET_PRECISION = 2;
const DEFAULT_PART_MODEL_POSITION_OFFSETS = {
  pushButton: { x: 1.26, y: -10.42, z: -43.41 },
};
const DEFAULT_PART_MODEL_ROTATION_OFFSETS = {
  pushButton: { x: 0.0, y: -90.0, z: 90.0 },
};
const DEFAULT_PART_BODY_HITBOX_FALLBACKS = {};
const DEFAULT_ARDUINO_BOARD_LED_OFFSETS = {
  powerLed:   { x: -20.73, y: 12.42, z: -11.58 },
  builtinLed: { x: -21.20, y: -5.88, z: -23.90 },
};

const DEFAULT_ARDUINO_BOARD_LED_SIZES = {
  powerLed: 0.80,
  builtinLed: 0.90,
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
  pushButton: [
    { x: 3.02, y: 1.15, z: -42.80 },
    { x: -1.86, y: 1.12, z: -37.84 },
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
  <p class="instruction">Grab either glowing wire plug and drop it onto an Arduino or breadboard hole. Use the parts bin to drag LEDs, a resistor, and the new push button onto the breadboard.</p>
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
powerRailPanel.hidden = !SHOW_CALIBRATION_PANELS;

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
arduinoHeaderPanel.hidden = !SHOW_CALIBRATION_PANELS;

const arduinoHeaderSectionsRoot = arduinoHeaderPanel.querySelector('[data-arduino-header-sections]');
const copyArduinoHeaderButton = arduinoHeaderPanel.querySelector('[data-action="copy-arduino-header"]');
const resetArduinoHeaderButton = arduinoHeaderPanel.querySelector('[data-action="reset-arduino-header"]');

const partsPanel = document.createElement('aside');
partsPanel.className = 'debug-panel debug-panel--parts';
partsPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Parts Bin</p>
    <h2>Drag Components</h2>
    <p class="debug-panel__copy">Press and drag a component card onto the breadboard, use the mouse-wheel to rotate it, then release to place it.</p>
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
    <p class="debug-panel__copy">Tune each part's lead marker placement from its built-in lead anchors. This is useful when calibrating new models like LEDs, resistors, and push buttons.</p>
  </div>
  <div class="debug-panel__sections" data-part-lead-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy-part-leads">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset-part-leads">Reset</button>
  </div>
`;
document.body.appendChild(partLeadPanel);
partLeadPanel.hidden = !SHOW_CALIBRATION_PANELS;

const partLeadSectionsRoot = partLeadPanel.querySelector('[data-part-lead-sections]');
const copyPartLeadButton = partLeadPanel.querySelector('[data-action="copy-part-leads"]');
const resetPartLeadButton = partLeadPanel.querySelector('[data-action="reset-part-leads"]');

const partModelPanel = document.createElement('aside');
partModelPanel.className = 'debug-panel debug-panel--calibration debug-panel--part-model';
partModelPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Button Calibration</p>
    <h2>Push Button Pose</h2>
    <p class="debug-panel__copy">Adjust the button body's x, y, and z offsets plus x, y, and z rotations without changing the fixed lead anchors or lead-marker calibration.</p>
  </div>
  <div class="debug-panel__sections" data-part-model-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy-part-model">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset-part-model">Reset</button>
  </div>
`;
document.body.appendChild(partModelPanel);
partModelPanel.hidden = !SHOW_CALIBRATION_PANELS;

const partModelSectionsRoot = partModelPanel.querySelector('[data-part-model-sections]');
const copyPartModelButton = partModelPanel.querySelector('[data-action="copy-part-model"]');
const resetPartModelButton = partModelPanel.querySelector('[data-action="reset-part-model"]');

const arduinoBoardLedPanel = document.createElement('aside');
arduinoBoardLedPanel.className = 'debug-panel debug-panel--calibration';
arduinoBoardLedPanel.innerHTML = `
  <div class="debug-panel__header">
    <p class="eyebrow">Arduino LED Calibration</p>
    <h2>Board LED Anchors</h2>
    <p class="debug-panel__copy">Adjust the two Uno SMD LED glows if the imported board model needs a little tuning. Offsets are local to the normalized Arduino model and size is a glow scale multiplier.</p>
  </div>
  <div class="debug-panel__sections" data-arduino-board-led-sections></div>
  <div class="debug-panel__actions">
    <button type="button" class="debug-button" data-action="copy-arduino-board-led">Copy Values</button>
    <button type="button" class="debug-button debug-button--ghost" data-action="reset-arduino-board-led">Reset</button>
  </div>
`;
document.body.appendChild(arduinoBoardLedPanel);
arduinoBoardLedPanel.hidden = !SHOW_CALIBRATION_PANELS;

const arduinoBoardLedSectionsRoot = arduinoBoardLedPanel.querySelector('[data-arduino-board-led-sections]');
const copyArduinoBoardLedButton = arduinoBoardLedPanel.querySelector('[data-action="copy-arduino-board-led"]');
const resetArduinoBoardLedButton = arduinoBoardLedPanel.querySelector('[data-action="reset-arduino-board-led"]');

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
applyPanelCollapseControl(partModelPanel, {
  title: 'Button Calibration',
  collapsedLabel: 'Show Button Calibration',
  initiallyCollapsed: true,
});
applyPanelCollapseControl(arduinoBoardLedPanel, {
  title: 'Arduino LED Calibration',
  collapsedLabel: 'Show Arduino LED Calibration',
  initiallyCollapsed: true,
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8b1a4);
scene.fog = new THREE.Fog(0xb8b1a4, 320, 760);

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.touchAction = 'none';
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
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

function addWorkbenchModel(environment, options) {
  const {
    url,
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 },
    scale = 1,
    name = 'workbench-prop',
  } = options;

  loader.load(
    resolvePublicAssetUrl(url),
    (gltf) => {
      const model = gltf.scene;
      model.name = name;

      model.position.set(position.x, position.y, position.z);
      model.rotation.set(
        rotation.x * DEG_TO_RAD,
        rotation.y * DEG_TO_RAD,
        rotation.z * DEG_TO_RAD
      );

      if (typeof scale === 'number') {
        model.scale.setScalar(scale);
      } else {
        model.scale.set(scale.x, scale.y, scale.z);
      }

      model.traverse((object) => {
        if (!object.isMesh) {
          return;
        }

        object.castShadow = true;
        object.receiveShadow = true;

        if (object.material) {
          object.material = object.material.clone();
          object.material.needsUpdate = true;
        }
      });

      environment.add(model);
    },
    undefined,
    (error) => {
      console.error(`Failed to load workbench model: ${url}`, error);
    }
  );
}

function createRealisticWorkbenchEnvironment() {
  const environment = new THREE.Group();

  const WORKBENCH_SURFACE_Y = -1.2;
  const DESK_HEIGHT = 14;
  const MAT_HEIGHT = 0.8;

  // Wooden / laminate workbench top
  const deskMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a6a46,
    roughness: 0.82,
    metalness: 0.02,
  });

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(520, DESK_HEIGHT, 320),
    deskMaterial
  );

  // Keep desk and mat below the Arduino/breadboard base.
  desk.position.y = WORKBENCH_SURFACE_Y - MAT_HEIGHT - DESK_HEIGHT / 2;
  desk.receiveShadow = true;
  environment.add(desk);

  // Rubber cutting mat
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(360, MAT_HEIGHT, 210),
    new THREE.MeshStandardMaterial({
      color: 0x2f6f5e,
      roughness: 0.88,
      metalness: 0.01,
    })
  );

  mat.position.set(15, WORKBENCH_SURFACE_Y - MAT_HEIGHT / 2, 0);
  mat.receiveShadow = true;
  environment.add(mat);

  // Mat grid
  const matGrid = new THREE.GridHelper(340, 17, 0x79a99a, 0x4f8577);
  matGrid.position.set(15, WORKBENCH_SURFACE_Y + 0.03, 0);

  const gridMaterials = Array.isArray(matGrid.material)
    ? matGrid.material
    : [matGrid.material];

  for (const material of gridMaterials) {
    material.transparent = true;
    material.opacity = 0.18;
    material.depthWrite = false;
  }

  environment.add(matGrid);

  // Back wall
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8d1c3,
    roughness: 0.95,
    metalness: 0.0,
  });

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(540, 220, 10),
    wallMaterial
  );
  backWall.position.set(0, 95, -165);
  backWall.receiveShadow = true;
  environment.add(backWall);

  // Side wall
  const sideWall = new THREE.Mesh(
    new THREE.BoxGeometry(10, 220, 320),
    wallMaterial
  );
  sideWall.position.set(-265, 95, -5);
  sideWall.receiveShadow = true;
  environment.add(sideWall);

  // Small background shelf
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(300, 8, 35),
    new THREE.MeshStandardMaterial({
      color: 0x6f6256,
      roughness: 0.75,
      metalness: 0.03,
    })
  );
  shelf.position.set(40, 95, -148);
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  environment.add(shelf);

  // Background instrument
  const instrument = new THREE.Mesh(
    new THREE.BoxGeometry(70, 35, 28),
    new THREE.MeshStandardMaterial({
      color: 0x3c4652,
      roughness: 0.7,
      metalness: 0.1,
    })
  );
  instrument.position.set(-65, 121, -130);
  instrument.castShadow = true;
  environment.add(instrument);

  // Storage box
  const storageBox = new THREE.Mesh(
    new THREE.BoxGeometry(55, 28, 30),
    new THREE.MeshStandardMaterial({
      color: 0xb88b4a,
      roughness: 0.78,
      metalness: 0.02,
    })
  );
  storageBox.position.set(35, 117, -130);
  storageBox.castShadow = true;
  environment.add(storageBox);

  // Background cable lying on the workbench/mat
  const cableRadius = 1.2;
  const cableY = WORKBENCH_SURFACE_Y + cableRadius * 0.85;

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(125, cableY, -95),
    new THREE.Vector3(150, cableY + 0.25, -70),
    new THREE.Vector3(135, cableY + 0.1, -35),
    new THREE.Vector3(165, cableY + 0.2, 10),
  ]);

  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(cableCurve, 32, cableRadius, 10, false),
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
      metalness: 0.02,
    })
  );

  cable.castShadow = true;
  cable.receiveShadow = true;
  environment.add(cable);

  addWorkbenchModel(environment, {
    url: '/models/uno_simulator/multimeter.glb',
    name: 'multitester',
    position: {
      x: -135,
      y: WORKBENCH_SURFACE_Y + 1.5,
      z: 0,
    },
    rotation: {
      x: 90,
      y: 0,
      z: 90,
    },
    scale: 1,
  });

  scene.add(environment);
  return environment;
}

const loader = new GLTFLoader();

createRealisticWorkbenchEnvironment();

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

/* controls.addEventListener('end', () => {
  logCameraPose('Camera pose updated');
}); */

const hemisphereLight = new THREE.HemisphereLight(0xfff4df, 0x6d7c88, 1.25);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(0xfff0d2, 2.2);
keyLight.position.set(120, 190, 95);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 20;
keyLight.shadow.camera.far = 500;
keyLight.shadow.camera.left = -240;
keyLight.shadow.camera.right = 240;
keyLight.shadow.camera.top = 240;
keyLight.shadow.camera.bottom = -240;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb9d7ff, 0.45);
fillLight.position.set(-140, 90, -120);
scene.add(fillLight);

const assembly = new THREE.Group();
scene.add(assembly);
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
const partModelPositionState = Object.fromEntries(
  PART_MODEL_CALIBRATION_DEFINITIONS.map((definition) => [
    definition.key,
    cloneTransformState(DEFAULT_PART_MODEL_POSITION_OFFSETS[definition.key]),
  ])
);
const partModelRotationState = Object.fromEntries(
  PART_MODEL_CALIBRATION_DEFINITIONS.map((definition) => [
    definition.key,
    cloneTransformState(DEFAULT_PART_MODEL_ROTATION_OFFSETS[definition.key]),
  ])
);
const partModelCalibrationUi = new Map();
const arduinoBoardLedOffsetState = Object.fromEntries(
  ARDUINO_BOARD_LED_DEFINITIONS.map((definition) => [
    definition.key,
    cloneTransformState(DEFAULT_ARDUINO_BOARD_LED_OFFSETS[definition.key]),
  ])
);
const arduinoBoardLedSizeState = Object.fromEntries(
  ARDUINO_BOARD_LED_DEFINITIONS.map((definition) => [
    definition.key,
    DEFAULT_ARDUINO_BOARD_LED_SIZES[definition.key] ?? definition.defaultSize ?? 0.6,
  ])
);
const arduinoBoardLedCalibrationUi = new Map();
const arduinoBoardLedObjects = new Map();
const arduinoBoardLedRuntimeState = {
  simulationActive: false,
  builtinTarget: false,
  startupStartedAt: -Infinity,
};
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
const tempArduinoLedPosition = new THREE.Vector3();
const tempArduinoLedPositionB = new THREE.Vector3();

let arduino = null;
let breadboard = null;
let arduinoRigRoot = null;
let breadboardRigRoot = null;
let arduinoModelPivot = null;
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
let latestAvrPinStates = {};
let syncingAvrDigitalInputs = false;
let latestCompiledHexText = '';
let arduinoSimulatorHeldInReset = false;
const appliedAvrDigitalInputsByPinName = {};

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

function findPlacedPartById(partId) {
  if (!partId) {
    return null;
  }

  return placedParts.find((part) => part.uuid === partId) ?? null;
}

function findPlacedPartsByDefinitionKey(definitionKey) {
  return placedParts.filter((part) => part?.userData?.definitionKey === definitionKey);
}

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
  originalPlacement: null,
};
const partLeadState = {
  dragging: false,
  activePart: null,
  draggedEnd: null,
  hoveredPart: null,
  hoveredEnd: null,
  hoveredTarget: null,
};
const pushButtonPressState = {
  activePart: null,
};
let arduinoCompileInFlight = false;

buildTransformDebugPanel();
buildPowerRailCalibrationPanel();
buildArduinoHeaderCalibrationPanel();
buildPartLeadCalibrationPanel();
buildPartModelCalibrationPanel();
buildArduinoBoardLedCalibrationPanel();
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

    if (part.userData.definitionKey === 'pushButton' && part.userData.pushButtonPressed) {
      connectElectricalNodes(adjacency, startNodeId, endNodeId);
    }
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

    if (part.userData.definitionKey === 'pushButton' && part.userData.pushButtonPressed) {
      connectNodes(startNodeId, endNodeId);
    }

    components.push({
      id: part.uuid,
      type: part.userData.definitionKey,
      label: definition?.label ?? 'Part',
      pressed: Boolean(part.userData.pushButtonPressed),
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
        pressed: Boolean(component.pressed),
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
      pressed: Boolean(component.pressed),
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

function findReversedLedPaths(snapshot) {
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

      // Reversed case:
      // Digital pin -> LED cathode, LED anode -> resistor -> GND
      if (pinNet === cathodeNet) {
        const resistorToGround = resistors.find((resistor) => {
          const leadANet = resistor.terminals.leadA?.net;
          const leadBNet = resistor.terminals.leadB?.net;

          return (
            (leadANet === anodeNet && groundNets.has(leadBNet)) ||
            (leadBNet === anodeNet && groundNets.has(leadANet))
          );
        });

        if (resistorToGround) {
          paths.push({
            ledId: led.id,
            ledLabel: led.label,
            pin: pinLabel,
            pinNet,
            mode: 'reversed-polarity',
            activeWhen: 'HIGH',
            seriesResistorId: resistorToGround.id,
          });
        }
      }
    }
  }

  return paths;
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

  latestAvrPinStates = {};
  syncingAvrDigitalInputs = false;

  for (const pinName of Object.keys(appliedAvrDigitalInputsByPinName)) {
    delete appliedAvrDigitalInputsByPinName[pinName];
  }

  stopArduinoBoardLedSimulation();
  resetSimulationVisuals();
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
        state?.isHigh ??
        state?.sampledHigh ??
        (typeof state?.logicLevel === 'string'
          ? state.logicLevel.toLowerCase() === 'high'
          : false)
      ),
    };
  }

  return pinStates;
}

function normalizeArduinoPinNetNames(pinNetValue) {
  if (Array.isArray(pinNetValue)) {
    return pinNetValue.filter(Boolean);
  }

  return pinNetValue ? [pinNetValue] : [];
}

function buildAvrDigitalInputValues(pinStates = latestAvrPinStates) {
  const snapshot = buildAvrSimulationSnapshot();
  const arduinoPins = snapshot.arduinoPins ?? {};
  const groundNets = new Set(normalizeArduinoPinNetNames(arduinoPins.GND));
  const drivenHighNets = new Set([
    ...normalizeArduinoPinNetNames(arduinoPins['5V']),
    ...normalizeArduinoPinNetNames(arduinoPins['3.3V']),
  ]);
  const drivenLowNets = new Set();

  for (const pinName of ARDUINO_DIGITAL_PIN_NAMES) {
    const state = pinStates?.[pinName];

    if (!state || (state.mode !== 'output' && state.mode !== 'pwm')) {
      continue;
    }

    const targetNets = state.value ? drivenHighNets : drivenLowNets;

    for (const netName of normalizeArduinoPinNetNames(arduinoPins[pinName])) {
      targetNets.add(netName);
    }
  }

  const desiredInputsByPinName = {};

  for (const pinName of ARDUINO_DIGITAL_PIN_NAMES) {
    const state = pinStates?.[pinName];

    if (!state || state.mode === 'output' || state.mode === 'pwm') {
      continue;
    }

    const netNames = normalizeArduinoPinNetNames(arduinoPins[pinName]);
    let nextValue = state.mode === 'input_pullup';

    if (netNames.some((netName) => drivenLowNets.has(netName) || groundNets.has(netName))) {
      nextValue = false;
    } else if (
      netNames.some((netName) => drivenHighNets.has(netName))
    ) {
      nextValue = true;
    }

    desiredInputsByPinName[pinName] = nextValue;
  }

  return desiredInputsByPinName;
}

function syncAvrDigitalInputsFromCircuit(pinStates = latestAvrPinStates) {
  if (
    syncingAvrDigitalInputs ||
    !avrRunner ||
    typeof avrRunner.setDigitalInputs !== 'function'
  ) {
    return;
  }

  const desiredInputsByPinName = buildAvrDigitalInputValues(pinStates);
  const changedInputsByPinName = {};

  for (const [pinName, nextValue] of Object.entries(desiredInputsByPinName)) {
    if (appliedAvrDigitalInputsByPinName[pinName] === nextValue) {
      continue;
    }

    changedInputsByPinName[pinName] = nextValue;
  }

  if (Object.keys(changedInputsByPinName).length === 0) {
    return;
  }

  syncingAvrDigitalInputs = true;

  try {
    Object.assign(appliedAvrDigitalInputsByPinName, changedInputsByPinName);
    avrRunner.setDigitalInputs(changedInputsByPinName);
  } finally {
    syncingAvrDigitalInputs = false;
  }
}

function getCurrentAvrPinStates() {
  if (Object.keys(latestAvrPinStates).length > 0) {
    return latestAvrPinStates;
  }

  if (avrRunner && typeof avrRunner.readDigitalPinStates === 'function') {
    return avrRunner.readDigitalPinStates();
  }

  return {};
}

function startAvrHexWithExistingSimulator(hexText) {
  disposeAvrRunner();

  avrRunner = new ArduinoUnoSimulator({
    hex: hexText,

    onUpdate: (snapshot) => {
      const pinStates = normalizeSimulationPinStates(snapshot);
      latestAvrPinStates = pinStates;
      syncAvrDigitalInputsFromCircuit(pinStates);
      updateArduinoBoardLedRuntime(snapshot, pinStates);
      console.table(pinStates);
      updateLedVisualsFromArduinoPinStates(pinStates);
    },

    onError: (error) => {
      console.error('AVR simulator error:', error);
      setStatus?.(error?.message || 'AVR simulator stopped because of an error.');
      disposeAvrRunner();
    },
  });

  startArduinoBoardLedSimulation();
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
const LED_ON_COLOR = 0xff2a1a;
const LED_ON_EMISSIVE = 0xff1a10;
const LED_OFF_EMISSIVE = 0x000000;

const LED_FADE_SPEED = 9.0;       // higher = faster fade
const LED_GLOW_COLOR = 0xff1e12;
const LED_LIGHT_DISTANCE = 28;
const LED_LIGHT_DECAY = 2.0;
const LED_MAX_LIGHT_INTENSITY = 1.8;
const LED_MAX_GLOW_OPACITY = 0.28;
const LED_MAX_EMISSIVE_INTENSITY = 4.5;

const LED_REVERSE_SMOKE_COLOR = 0x777777;
const LED_SMOKE_PARTICLE_COUNT = 28;
const LED_SMOKE_RADIUS = 1.2;
const LED_SMOKE_MAX_OPACITY = 0.42;
const LED_SMOKE_RISE_SPEED = 6.0;
const LED_SMOKE_SPREAD_SPEED = 3.2;
const LED_SMOKE_LIFETIME = 1.6;
const LED_REVERSE_SMOKE_DELAY = 1.5;

function createSmokeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0.0, 'rgba(160,160,160,0.55)');
  gradient.addColorStop(0.35, 'rgba(130,130,130,0.35)');
  gradient.addColorStop(0.7, 'rgba(100,100,100,0.12)');
  gradient.addColorStop(1.0, 'rgba(80,80,80,0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const LED_SMOKE_TEXTURE = createSmokeTexture();

window.ledSmokeTuning = window.ledSmokeTuning ?? {
  sourceHeight: 0,
  sourceX: 0,
  sourceY: 0,
  sourceZ: -4.2,
};

function ensureLedGlowObjects(part) {
  if (!part || part.userData.ledGlowReady) {
    return;
  }

  let ledBodyMesh = null;

  part.userData.content?.traverse((object) => {
    if (ledBodyMesh || !object.isMesh || !object.material) {
      return;
    }

    if (object.name === 'Node1' || isLedBodyMesh(object)) {
      ledBodyMesh = object;
    }
  });

  if (!ledBodyMesh) {
    console.warn('LED body mesh not found for glow placement.', part);
    return;
  }

  ledBodyMesh.geometry.computeBoundingBox();

  const localCenter = new THREE.Vector3();
  ledBodyMesh.geometry.boundingBox.getCenter(localCenter);

  // Move the glow slightly toward the visible front/top of the dome.
  // Tune these three values if needed.
  localCenter.x += 0;
  localCenter.y += 0;
  localCenter.z += 0;

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 32, 32),
    new THREE.MeshBasicMaterial({
      color: LED_GLOW_COLOR,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );

  glow.position.copy(localCenter);
  glow.renderOrder = 999;

  const pointLight = new THREE.PointLight(
    LED_GLOW_COLOR,
    0,
    LED_LIGHT_DISTANCE,
    LED_LIGHT_DECAY
  );

  pointLight.position.copy(localCenter);

  // Important: attach to the actual dome mesh, not the part root.
  ledBodyMesh.add(glow);
  ledBodyMesh.add(pointLight);

  part.userData.ledGlow = glow;
  part.userData.ledPointLight = pointLight;
  part.userData.ledBrightness = part.userData.ledBrightness ?? 0;
  part.userData.ledTargetBrightness = part.userData.ledTargetBrightness ?? 0;
  part.userData.ledGlowReady = true;
}

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
  ensureLedGlowObjects(part);

  part.userData.ledTargetBrightness = isOn ? 1 : 0;
  part.userData.isLedOn = isOn;
}

function updateLedVisualsFromArduinoPinStates(pinStates) {
  const snapshot = buildAvrSimulationSnapshot();
  const ledPaths = findLedOutputPaths(snapshot);
  const reversedLedPaths = findReversedLedPaths(snapshot);

  const poweredLedIds = new Set();
  const reversedPoweredLedIds = new Set();

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

  for (const path of reversedLedPaths) {
    const pinState = pinStates[path.pin];

    if (!pinState) {
      continue;
    }

    const isReversedPowered =
      path.activeWhen === 'HIGH'
        ? pinState.mode === 'output' && pinState.value === true
        : pinState.mode === 'output' && pinState.value === false;

    if (isReversedPowered) {
      reversedPoweredLedIds.add(path.ledId);
    }
  }

  for (const part of placedParts) {
    if (part.userData.definitionKey !== 'ledRed') {
      continue;
    }

    const isCorrectlyPowered = poweredLedIds.has(part.uuid);
    const isReversedPowered = reversedPoweredLedIds.has(part.uuid);

    setLedVisualState(part, isCorrectlyPowered && !isReversedPowered);

    // Do not start smoke instantly.
    // Store the reverse-polarity state, and let animateLedSmoke() handle the delay.
    part.userData.ledReversePowered = isReversedPowered;

    if (!isReversedPowered) {
      part.userData.ledReverseStartedAt = null;
      setLedSmokeState(part, false);
    }
  }
}

function ensureLedSmokeObjects(part) {
  if (!part || part.userData.ledSmokeReady) {
    return;
  }

  let ledBodyMesh = null;

  part.userData.content?.traverse((object) => {
    if (ledBodyMesh || !object.isMesh || !object.material) {
      return;
    }

    if (object.name === 'Node1' || isLedBodyMesh(object)) {
      ledBodyMesh = object;
    }
  });

  if (!ledBodyMesh) {
    console.warn('LED body mesh not found for smoke placement.', part);
    return;
  }

  ledBodyMesh.geometry.computeBoundingBox();

  const localCenter = new THREE.Vector3();
  ledBodyMesh.geometry.boundingBox.getCenter(localCenter);

  const smokeGroup = new THREE.Group();
  smokeGroup.position.copy(localCenter);

  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: LED_REVERSE_SMOKE_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
  });

  const particles = [];

  for (let i = 0; i < LED_SMOKE_PARTICLE_COUNT; i += 1) {
    const particle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: LED_SMOKE_TEXTURE,
        color: LED_REVERSE_SMOKE_COLOR,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      })
    );

    particle.visible = false;
    particle.userData.seed = Math.random() * Math.PI * 2;
    particle.userData.age = Math.random() * LED_SMOKE_LIFETIME;
    particle.userData.offsetX = (Math.random() - 0.5) * 1.8;
    particle.userData.offsetZ = (Math.random() - 0.5) * 1.8;
    particle.userData.scaleSeed = 0.7 + Math.random() * 0.8;

    smokeGroup.add(particle);
    particles.push(particle);
  }

  ledBodyMesh.add(smokeGroup);

  // Convert world up into ledBodyMesh local direction
  ledBodyMesh.updateMatrixWorld(true);

  const smokeUpLocal = new THREE.Vector3(0, 1, 0);
  const parentQuaternion = new THREE.Quaternion();
  ledBodyMesh.getWorldQuaternion(parentQuaternion);
  smokeUpLocal.applyQuaternion(parentQuaternion.invert()).normalize();

  part.userData.ledSmokeGroup = smokeGroup;
  part.userData.ledSmokeParticles = particles;
  part.userData.ledSmokeUpLocal = smokeUpLocal;
  part.userData.ledSmokeActive = false;
  part.userData.ledSmokeReady = true;
}

function updateLedSmokeSourcePosition(part) {
  if (!part?.userData?.ledSmokeGroup) {
    return;
  }

  let ledBodyMesh = null;

  part.userData.content?.traverse((object) => {
    if (ledBodyMesh || !object.isMesh || !object.material) {
      return;
    }

    if (object.name === 'Node1' || isLedBodyMesh(object)) {
      ledBodyMesh = object;
    }
  });

  if (!ledBodyMesh) {
    return;
  }

  ledBodyMesh.updateMatrixWorld(true);
  ledBodyMesh.geometry.computeBoundingBox();

  const localCenter = new THREE.Vector3();
  ledBodyMesh.geometry.boundingBox.getCenter(localCenter);

  // Convert real scene-up direction into this LED mesh's local space.
  const worldQuaternion = new THREE.Quaternion();
  ledBodyMesh.getWorldQuaternion(worldQuaternion);

  const smokeUpLocal = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(worldQuaternion.invert())
    .normalize();

  const tuning = window.ledSmokeTuning ?? {};

  // Move the source along real world-up, not arbitrary local y/z.
  localCenter.addScaledVector(smokeUpLocal, tuning.sourceHeight ?? 0);

  // Optional manual local-axis trims.
  localCenter.x += tuning.sourceX ?? 0;
  localCenter.y += tuning.sourceY ?? 0;
  localCenter.z += tuning.sourceZ ?? 0;

  part.userData.ledSmokeGroup.position.copy(localCenter);
  part.userData.ledSmokeUpLocal = smokeUpLocal;
}

function setLedSmokeState(partOrId, isSmoking) {
  const part =
    typeof partOrId === 'string'
      ? findPlacedPartById(partOrId)
      : partOrId;

  if (!part || part.userData.definitionKey !== 'ledRed') {
    return;
  }

  ensureLedSmokeObjects(part);
  part.userData.ledSmokeActive = isSmoking;
}

function ensureAvrRunner() {
  if (avrRunner) {
    return avrRunner;
  }

  avrRunner = new UnoAvrRunner({
    onPinStatesChanged: (pinStates) => {
      latestAvrPinStates = pinStates;
      syncAvrDigitalInputsFromCircuit(pinStates);
      updateArduinoBoardLedRuntime(null, pinStates);
      updateLedVisualsFromArduinoPinStates(pinStates);
    },
  });

  return avrRunner;
}

function holdArduinoSimulatorInReset() {
  if (!avrRunner) {
    return;
  }

  arduinoSimulatorHeldInReset = true;

  // Stop CPU and clear visuals while reset is held.
  disposeAvrRunner();

  setStatus('Arduino is held in reset.');
}

function releaseArduinoSimulatorReset() {
  if (!arduinoSimulatorHeldInReset) {
    return;
  }

  arduinoSimulatorHeldInReset = false;

  if (!latestCompiledHexText) {
    setStatus('Arduino reset released, but no compiled program is loaded.');
    return;
  }

  // Restart same HEX from address 0, like a reset/reboot.
  startAvrHexWithExistingSimulator(latestCompiledHexText);

  setStatus('Arduino reset released. Sketch restarted.');
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
  latestCompiledHexText = hexText;

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

window.testArduinoResetDown = () => setArduinoResetButtonPressed(true);
window.testArduinoResetUp = () => setArduinoResetButtonPressed(false);

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

window.testLedSmokeOn = () => {
  for (const part of placedParts) {
    if (part.userData.definitionKey === 'ledRed') {
      part.userData.ledReversePowered = true;
      part.userData.ledReverseStartedAt = null;
    }
  }
};

window.testLedSmokeOff = () => {
  for (const part of placedParts) {
    if (part.userData.definitionKey === 'ledRed') {
      part.userData.ledReversePowered = false;
      part.userData.ledReverseStartedAt = null;
      setLedSmokeState(part, false);
    }
  }
};

function formatDebugVector(value) {
  if (!value) {
    return '0.00, 0.00, 0.00';
  }

  return [
    Number(value.x ?? 0).toFixed(2),
    Number(value.y ?? 0).toFixed(2),
    Number(value.z ?? 0).toFixed(2),
  ].join(', ');
}

function buildPartMeshDebugEntries(part) {
  if (!part?.userData?.content) {
    return [];
  }

  const entries = [];
  const localBox = new THREE.Box3();
  const localCenter = new THREE.Vector3();
  const localSize = new THREE.Vector3();

  part.userData.content.traverse((object) => {
    if (!object.isMesh || !object.geometry) {
      return;
    }

    object.geometry.computeBoundingBox();

    if (!object.geometry.boundingBox) {
      return;
    }

    localBox.copy(object.geometry.boundingBox);
    localBox.getCenter(localCenter);
    localBox.getSize(localSize);

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    const roleHint =
      localSize.z > 4 && localSize.x < 1.5 && localSize.y < 1.5
        ? 'lead candidate'
        : localCenter.z > 3
          ? 'cap candidate'
          : localSize.x > 5 && localSize.y > 5
            ? 'body candidate'
            : 'detail candidate';

    entries.push({
      uuid: object.uuid,
      meshName: object.name || '(unnamed)',
      parentName: object.parent?.name || '(root)',
      materialNames: materials.map((material) => material?.name || '(unnamed)').join(', '),
      materialColors: materials.map((material) => material?.color?.getHexString?.() ?? 'n/a').join(', '),
      localCenter: formatDebugVector(localCenter),
      localSize: formatDebugVector(localSize),
      localPosition: formatDebugVector(object.position),
      roleHint,
    });
  });

  return entries;
}

function debugPlacedPartMeshes(definitionKey, options = {}) {
  const { partId = null, logLabel = definitionKey } = options;
  const parts = partId
    ? [findPlacedPartById(partId)].filter(Boolean)
    : findPlacedPartsByDefinitionKey(definitionKey);

  if (parts.length === 0) {
    console.warn(`No placed ${logLabel} parts found. Place one on the breadboard first.`);
    return [];
  }

  const results = parts.map((part, index) => {
    const entries = buildPartMeshDebugEntries(part);

    console.groupCollapsed(`${logLabel} part ${index + 1} (${part.uuid})`);
    console.table(entries);
    console.log('part', part);
    console.groupEnd();

    return {
      partId: part.uuid,
      definitionKey,
      entries,
    };
  });

  return results;
}

function findPushButtonPlungerMesh(part) {
  if (!part?.userData?.content) {
    return null;
  }

  let exactMatch = null;
  let bestCandidate = null;
  let bestScore = -Infinity;
  const localBox = new THREE.Box3();
  const localCenter = new THREE.Vector3();
  const localSize = new THREE.Vector3();

  part.userData.content.traverse((object) => {
    if (!object.isMesh || !object.geometry) {
      return;
    }

    if (object.name === 'Node12') {
      exactMatch = object;
      return;
    }

    object.geometry.computeBoundingBox();

    if (!object.geometry.boundingBox) {
      return;
    }

    localBox.copy(object.geometry.boundingBox);
    localBox.getCenter(localCenter);
    localBox.getSize(localSize);

    const score =
      localCenter.z * 10 -
      Math.abs(localCenter.x) * 2 -
      Math.abs(localCenter.y) * 2 -
      Math.abs(localSize.z - 0.8) * 8 -
      Math.abs(localSize.x - 3.5) * 2 -
      Math.abs(localSize.y - 3.5) * 2;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = object;
    }
  });

  return exactMatch ?? bestCandidate;
}

function ensurePushButtonAnimationData(part) {
  if (!part || part.userData.definitionKey !== 'pushButton') {
    return false;
  }

  if (part.userData.pushButtonAnimationReady) {
    return true;
  }

  const plungerMesh = findPushButtonPlungerMesh(part);

  if (!plungerMesh) {
    console.warn('Push button plunger mesh not found for press animation.', part);
    return false;
  }

  part.userData.pushButtonPlungerMesh = plungerMesh;
  part.userData.pushButtonPlungerBasePosition = plungerMesh.position.clone();
  part.userData.pushButtonPressAmount = part.userData.pushButtonPressAmount ?? 0;
  part.userData.pushButtonPressTarget = part.userData.pushButtonPressTarget ?? 0;
  part.userData.pushButtonPressed = Boolean(part.userData.pushButtonPressed);
  part.userData.pushButtonAnimationReady = true;

  return true;
}

function refreshCircuitStateVisuals() {
  refreshConnectivityPanel();

  if (avrRunner?.cpu) {
    const pinStates = getCurrentAvrPinStates();
    syncAvrDigitalInputsFromCircuit(pinStates);
    updateLedVisualsFromArduinoPinStates(pinStates);
  }
}

function setPushButtonPressedState(part, isPressed) {
  if (!part || part.userData.definitionKey !== 'pushButton') {
    return;
  }

  ensurePushButtonAnimationData(part);

  const nextPressed = Boolean(isPressed);

  if (part.userData.pushButtonPressed === nextPressed) {
    return;
  }

  part.userData.pushButtonPressed = nextPressed;
  part.userData.pushButtonPressTarget = nextPressed ? 1 : 0;

  refreshCircuitStateVisuals();
}

function releaseActivePushButtonPress() {
  if (!pushButtonPressState.activePart) {
    return;
  }

  setPushButtonPressedState(pushButtonPressState.activePart, false);
  pushButtonPressState.activePart = null;
}

function animatePushButtons(deltaTime) {
  const allParts = [
    ...placedParts,
    ...(partDragState.previewPart ? [partDragState.previewPart] : []),
  ];

  for (const part of allParts) {
    if (!ensurePushButtonAnimationData(part)) {
      continue;
    }

    const currentAmount = part.userData.pushButtonPressAmount ?? 0;
    const targetAmount = part.userData.pushButtonPressTarget ?? 0;
    const nextAmount = THREE.MathUtils.damp(
      currentAmount,
      targetAmount,
      PUSH_BUTTON_PRESS_SPEED,
      deltaTime
    );

    part.userData.pushButtonPressAmount = nextAmount;

    const plungerMesh = part.userData.pushButtonPlungerMesh;
    const basePosition = part.userData.pushButtonPlungerBasePosition;

    if (!plungerMesh || !basePosition) {
      continue;
    }

    plungerMesh.position.copy(basePosition);
    plungerMesh.position.y -= nextAmount * PUSH_BUTTON_PRESS_DEPTH;
  }
}

window.debugLedMeshes = (partId = null) =>
  debugPlacedPartMeshes('ledRed', {
    partId,
    logLabel: 'LED',
  });

window.debugArduinoMeshes = () => {
  if (!arduinoModelPivot) {
    console.warn('Arduino model is not ready yet.');
    return [];
  }

  const entries = [];
  const localBox = new THREE.Box3();
  const localCenter = new THREE.Vector3();
  const localSize = new THREE.Vector3();

  arduinoModelPivot.traverse((object) => {
    if (!object.isMesh || !object.geometry) {
      return;
    }

    object.geometry.computeBoundingBox();

    if (!object.geometry.boundingBox) {
      return;
    }

    localBox.copy(object.geometry.boundingBox);
    localBox.getCenter(localCenter);
    localBox.getSize(localSize);

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    entries.push({
      meshName: object.name || '(unnamed)',
      parentName: object.parent?.name || '(root)',
      materialNames: materials.map((material) => material?.name || '(unnamed)').join(', '),
      materialColors: materials.map((material) => material?.color?.getHexString?.() ?? 'n/a').join(', '),
      localCenter: formatDebugVector(localCenter),
      localSize: formatDebugVector(localSize),
      localPosition: formatDebugVector(object.position),
    });
  });

  console.table(entries);
  return entries;
};

window.debugPushButtonMeshes = (partId = null) =>
  debugPlacedPartMeshes('pushButton', {
    partId,
    logLabel: 'Push Button',
  });

window.debugPartMeshes = (definitionKey, partId = null) =>
  debugPlacedPartMeshes(definitionKey, {
    partId,
    logLabel: PART_DEFINITION_BY_KEY.get(definitionKey)?.label ?? definitionKey,
  });


window.loadAvrHex = (hexText) => {
  const runner = ensureAvrRunner();
  runner.loadHex(hexText);
  console.log('AVR HEX loaded.');
};

window.startAvr = () => {
  startArduinoBoardLedSimulation();
  ensureAvrRunner().start();
  console.log('AVR simulation started.');
};

window.stopAvr = () => {
  stopArduinoSimulation();
};

window.debugAvrPinStates = () => {
  const states = getCurrentAvrPinStates();
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
  const placedComponentCount = placedParts.length;
  clearElementChildren(connectionList);

  if (groups.length === 0) {
    if (placedComponentCount === 0) {
      connectionSummaryLine.textContent =
        'No interconnected wire ends or component leads yet.';

      const emptyState = document.createElement('p');
      emptyState.className = 'connection-panel__empty';
      emptyState.textContent =
        'Drop wire plugs or component legs into the breadboard to see shared nets here.';
      connectionList.appendChild(emptyState);
      return;
    }

    connectionSummaryLine.textContent =
      `${placedComponentCount} placed component${placedComponentCount === 1 ? '' : 's'} with lead positions shown below.`;
  } else {
    const totalEndpoints = groups.reduce(
      (endpointCount, group) => endpointCount + group.members.length,
      0
    );
    connectionSummaryLine.textContent =
      `${groups.length} interconnection ${groups.length === 1 ? 'group' : 'groups'} across ${totalEndpoints} attached endpoints.` +
      (placedComponentCount > 0
        ? ` ${placedComponentCount} placed component${placedComponentCount === 1 ? '' : 's'} tracked.`
        : '');
  }

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

  for (const part of placedParts) {
    const card = document.createElement('article');
    card.className = 'connection-card connection-card--placement';

    const placementLabel = document.createElement('p');
    placementLabel.className = 'connection-card__eyebrow';
    placementLabel.textContent =
      part.userData.definitionKey === 'pushButton' && part.userData.pushButtonPressed
        ? 'Placement | Pressed'
        : 'Placement';
    card.appendChild(placementLabel);

    const title = document.createElement('h3');
    title.className = 'connection-card__title';
    title.textContent = getPartDisplayName(part);
    card.appendChild(title);

    const members = document.createElement('div');
    members.className = 'connection-card__members';

    for (const endKey of ['start', 'end']) {
      const snappedTarget = getPartLeadSnappedTarget(part, endKey);
      const landingTarget = getPartLeadLandingTarget(part, endKey);
      const target = snappedTarget ?? landingTarget;

      const memberRow = document.createElement('div');
      memberRow.className = 'connection-card__member';

      const memberLabel = document.createElement('span');
      memberLabel.className = 'connection-card__member-label';
      memberLabel.textContent =
        `${getPartLeadLabel(part, endKey)}${snappedTarget ? ' (snapped)' : landingTarget ? ' (aligned)' : ''}`;

      const memberLocation = document.createElement('span');
      memberLocation.className = 'connection-card__member-location';
      memberLocation.textContent = target
        ? buildTargetLocationLabel(target)
        : 'Unplaced';

      memberRow.append(memberLabel, memberLocation);
      members.appendChild(memberRow);
    }

    card.appendChild(members);
    connectionList.appendChild(card);
  }
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
    updatePartLeadHandlePositions(previewPart);
  }

  for (const part of placedParts) {
    updatePartLeadHandlePositions(part);
  }

  refreshTargetVisuals();
  updateHandleVisuals();
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
    setStatus('Reset all part lead marker offsets to their defaults.');
  });
}

function cloneTransformState(state) {
  return {
    x: state?.x ?? 0,
    y: state?.y ?? 0,
    z: state?.z ?? 0,
  };
}

function formatTransformStateObject(state, precision = 1) {
  return `{ x: ${(state?.x ?? 0).toFixed(precision)}, y: ${(state?.y ?? 0).toFixed(precision)}, z: ${(state?.z ?? 0).toFixed(precision)} }`;
}

function getPartModelPositionOffsetState(definitionKey) {
  return partModelPositionState[definitionKey] ?? { x: 0, y: 0, z: 0 };
}

function getPartModelRotationOffsetState(definitionKey) {
  return partModelRotationState[definitionKey] ?? { x: 0, y: 0, z: 0 };
}

function buildPartModelFinalPositionSummary(definitionKey) {
  const definition = PART_DEFINITION_BY_KEY.get(definitionKey);
  const offset = getPartModelPositionOffsetState(definitionKey);

  return `x ${formatPositionUnits(offset.x)}  y ${formatPositionUnits((definition?.surfaceLiftY ?? DEFAULT_PART_SURFACE_LIFT) + offset.y)}  z ${formatPositionUnits(offset.z)}`;
}

function buildPartModelFinalRotationSummary(definitionKey) {
  const definition = PART_DEFINITION_BY_KEY.get(definitionKey);
  const offset = getPartModelRotationOffsetState(definitionKey);

  return `x ${formatRotationDegrees((definition?.baseRotation?.x ?? 0) + offset.x)}  y ${formatRotationDegrees((definition?.baseRotation?.y ?? 0) + offset.y)}  z ${formatRotationDegrees((definition?.baseRotation?.z ?? 0) + offset.z)}`;
}

function refreshPartModelCalibrationSection(definitionKey) {
  const section = partModelCalibrationUi.get(definitionKey);

  if (!section) {
    return;
  }

  for (const axis of ['x', 'y', 'z']) {
    section.controls.position[axis].range.value = String(partModelPositionState[definitionKey][axis]);
    section.controls.position[axis].number.value =
      partModelPositionState[definitionKey][axis].toFixed(2);
    section.controls.rotation[axis].range.value = String(partModelRotationState[definitionKey][axis]);
    section.controls.rotation[axis].number.value =
      partModelRotationState[definitionKey][axis].toFixed(1);
  }

  section.positionReadout.textContent =
    `Rendered Position: ${buildPartModelFinalPositionSummary(definitionKey)}`;
  section.rotationReadout.textContent =
    `Rendered Rotation: ${buildPartModelFinalRotationSummary(definitionKey)}`;
}

function applyPartContentCalibration(part) {
  const definition = PART_DEFINITION_BY_KEY.get(part?.userData?.definitionKey);
  const contentRoot = part?.userData?.contentRoot;

  if (!definition || !contentRoot) {
    return false;
  }

  const positionOffset = getPartModelPositionOffsetState(definition.key);
  const rotationOffset = getPartModelRotationOffsetState(definition.key);

  tempPartEuler.set(
    ((definition.baseRotation?.x ?? 0) + rotationOffset.x) * DEG_TO_RAD,
    ((definition.baseRotation?.y ?? 0) + rotationOffset.y) * DEG_TO_RAD,
    ((definition.baseRotation?.z ?? 0) + rotationOffset.z) * DEG_TO_RAD,
    'XYZ'
  );
  contentRoot.rotation.copy(tempPartEuler);
  const visualInsertionOffsetY = part.userData.visualInsertionOffsetY ?? 0;

  contentRoot.position.set(
    positionOffset.x,
    (definition.surfaceLiftY ?? DEFAULT_PART_SURFACE_LIFT) +
      positionOffset.y +
      visualInsertionOffsetY,
    positionOffset.z
  );

  return true;
}

function applyPartModelCalibration(definitionKey = null) {
  const partsToUpdate = [];

  if (
    partDragState.previewPart &&
    (!definitionKey || partDragState.previewPart.userData.definitionKey === definitionKey)
  ) {
    partsToUpdate.push(partDragState.previewPart);
  }

  for (const part of placedParts) {
    if (definitionKey && part.userData.definitionKey !== definitionKey) {
      continue;
    }

    partsToUpdate.push(part);
  }

  for (const part of partsToUpdate) {
    applyPartContentCalibration(part);

    if (part.userData.bodyHitArea) {
      updatePartBodyHitArea(part);
    }
  }
}

function setPartModelPositionValue(definitionKey, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampPositionUnits(parsed);
  partModelPositionState[definitionKey][axis] = value;

  refreshPartModelCalibrationSection(definitionKey);
  applyPartModelCalibration(definitionKey);
}

function setPartModelRotationValue(definitionKey, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  const value = clampRotationDegrees(parsed);
  partModelRotationState[definitionKey][axis] = value;

  refreshPartModelCalibrationSection(definitionKey);
  applyPartModelCalibration(definitionKey);
}

function createPartModelCalibrationSection(definition) {
  const section = document.createElement('section');
  section.className = 'rotation-card';
  section.style.setProperty('--accent', definition.accent);

  section.innerHTML = `
    <div class="rotation-card__header">
      <h3>${definition.label}</h3>
      <p data-position-readout></p>
      <p data-rotation-readout></p>
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Position Offset</p>
      ${['x', 'y', 'z']
        .map((axis) =>
          createAxisControlMarkup(
            axis,
            partModelPositionState[definition.key][axis],
            'position',
            {
              min: -POSITION_LIMIT,
              max: POSITION_LIMIT,
              rangeStep: 0.1,
              numberStep: 0.01,
            },
            axis.toUpperCase(),
            2
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
            partModelRotationState[definition.key][axis],
            'rotation',
            {
              min: -180,
              max: 180,
              rangeStep: 0.5,
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
          setPartModelPositionValue(definition.key, axis, event.target.value);
          return;
        }

        setPartModelRotationValue(definition.key, axis, event.target.value);
      };

      range.addEventListener('input', handleInput);
      number.addEventListener('input', handleInput);

      controls[group][axis] = { range, number };
    }
  }

  partModelCalibrationUi.set(definition.key, {
    positionReadout: section.querySelector('[data-position-readout]'),
    rotationReadout: section.querySelector('[data-rotation-readout]'),
    controls,
  });

  refreshPartModelCalibrationSection(definition.key);

  return section;
}

function buildPartModelCopyBlock(definition) {
  return [
    `${definition.key}: {`,
    `  positionOffset: ${formatTransformStateObject(getPartModelPositionOffsetState(definition.key), 2)},`,
    `  rotationOffset: ${formatTransformStateObject(getPartModelRotationOffsetState(definition.key), 1)},`,
    '},',
  ].join('\n');
}

function buildPartModelCalibrationPanel() {
  for (const definition of PART_MODEL_CALIBRATION_DEFINITIONS) {
    partModelSectionsRoot.appendChild(createPartModelCalibrationSection(definition));
  }

  copyPartModelButton.addEventListener('click', async () => {
    const blocks = PART_MODEL_CALIBRATION_DEFINITIONS.map((definition) =>
      buildPartModelCopyBlock(definition)
    );

    try {
      await navigator.clipboard.writeText(blocks.join('\n\n'));
      setStatus('Copied the current push button pose calibration values to the clipboard.');
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      setStatus('Clipboard access is unavailable. Read the push button pose values directly from the calibration panel.');
    }
  });

  resetPartModelButton.addEventListener('click', () => {
    for (const definition of PART_MODEL_CALIBRATION_DEFINITIONS) {
      partModelPositionState[definition.key] = cloneTransformState(
        DEFAULT_PART_MODEL_POSITION_OFFSETS[definition.key]
      );
      partModelRotationState[definition.key] = cloneTransformState(
        DEFAULT_PART_MODEL_ROTATION_OFFSETS[definition.key]
      );
      refreshPartModelCalibrationSection(definition.key);
    }

    applyPartModelCalibration('pushButton');
    setStatus('Reset the push button body pose offsets and rotations to their defaults.');
  });
}

function getArduinoBoardLedOffsetSummary(key) {
  const state = arduinoBoardLedOffsetState[key] ?? { x: 0, y: 0, z: 0 };
  return `x ${formatPositionUnits(state.x)}  y ${formatPositionUnits(state.y)}  z ${formatPositionUnits(state.z)}`;
}

function getArduinoBoardLedSizeSummary(key) {
  const size = Number(arduinoBoardLedSizeState[key] ?? 0);
  return size.toFixed(2);
}

function setArduinoBoardLedOffsetValue(key, axis, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  arduinoBoardLedOffsetState[key][axis] = clampPositionUnits(parsed);
  refreshArduinoBoardLedCalibrationSection(key);
  applyArduinoBoardLedCalibration(key);
}

function setArduinoBoardLedSizeValue(key, nextValue) {
  const parsed = Number.parseFloat(nextValue);
  arduinoBoardLedSizeState[key] = THREE.MathUtils.clamp(
    Number.isFinite(parsed) ? parsed : DEFAULT_ARDUINO_BOARD_LED_SIZES[key] ?? 0.6,
    0.1,
    ARDUINO_BOARD_LED_SIZE_LIMIT
  );
  refreshArduinoBoardLedCalibrationSection(key);
  applyArduinoBoardLedCalibration(key);
}

function refreshArduinoBoardLedCalibrationSection(key) {
  const section = arduinoBoardLedCalibrationUi.get(key);

  if (!section) {
    return;
  }

  for (const axis of ['x', 'y', 'z']) {
    section.controls.offset[axis].range.value = String(arduinoBoardLedOffsetState[key][axis]);
    section.controls.offset[axis].number.value =
      arduinoBoardLedOffsetState[key][axis].toFixed(2);
  }

  section.controls.size.range.value = String(arduinoBoardLedSizeState[key]);
  section.controls.size.number.value = Number(arduinoBoardLedSizeState[key]).toFixed(2);
  section.offsetReadout.textContent = `Offset: ${getArduinoBoardLedOffsetSummary(key)}`;
  section.sizeReadout.textContent = `Size: ${getArduinoBoardLedSizeSummary(key)}`;
}

function createArduinoBoardLedCalibrationSection(definition) {
  const section = document.createElement('section');
  section.className = 'rotation-card';
  section.style.setProperty('--accent', definition.accent);
  section.innerHTML = `
    <div class="rotation-card__header">
      <h3>${definition.label}</h3>
      <p data-offset-readout></p>
      <p data-size-readout></p>
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Position Offset</p>
      ${['x', 'y', 'z']
        .map((axis) =>
          createAxisControlMarkup(
            axis,
            arduinoBoardLedOffsetState[definition.key][axis],
            'offset',
            {
              min: -POSITION_LIMIT,
              max: POSITION_LIMIT,
              rangeStep: 0.1,
              numberStep: 0.01,
            },
            axis.toUpperCase(),
            2
          )
        )
        .join('')}
    </div>
    <div class="transform-group">
      <p class="transform-group__title">Glow Size</p>
      ${createAxisControlMarkup(
        'size',
        arduinoBoardLedSizeState[definition.key],
        'size',
        {
          min: 0.1,
          max: ARDUINO_BOARD_LED_SIZE_LIMIT,
          rangeStep: 0.05,
          numberStep: 0.01,
        },
        'S',
        2
      )}
    </div>
  `;

  const controls = {
    offset: { x: {}, y: {}, z: {} },
    size: {},
  };

  for (const axis of ['x', 'y', 'z']) {
    const range = section.querySelector(
      `[data-group="offset"][data-axis="${axis}"][data-role="range"]`
    );
    const number = section.querySelector(
      `[data-group="offset"][data-axis="${axis}"][data-role="number"]`
    );

    const handleInput = (event) => {
      setArduinoBoardLedOffsetValue(definition.key, axis, event.target.value);
    };

    range.addEventListener('input', handleInput);
    number.addEventListener('input', handleInput);
    controls.offset[axis] = { range, number };
  }

  const sizeRange = section.querySelector(
    `[data-group="size"][data-axis="size"][data-role="range"]`
  );
  const sizeNumber = section.querySelector(
    `[data-group="size"][data-axis="size"][data-role="number"]`
  );
  const handleSizeInput = (event) => {
    setArduinoBoardLedSizeValue(definition.key, event.target.value);
  };
  sizeRange.addEventListener('input', handleSizeInput);
  sizeNumber.addEventListener('input', handleSizeInput);
  controls.size = {
    range: sizeRange,
    number: sizeNumber,
  };

  arduinoBoardLedCalibrationUi.set(definition.key, {
    offsetReadout: section.querySelector('[data-offset-readout]'),
    sizeReadout: section.querySelector('[data-size-readout]'),
    controls,
  });

  refreshArduinoBoardLedCalibrationSection(definition.key);

  return section;
}

function buildArduinoBoardLedCopyBlock(definition) {
  return [
    `${definition.key}: {`,
    `  offset: ${formatTransformStateObject(arduinoBoardLedOffsetState[definition.key], 2)},`,
    `  size: ${Number(arduinoBoardLedSizeState[definition.key]).toFixed(2)},`,
    '},',
  ].join('\n');
}

function buildArduinoBoardLedCalibrationPanel() {
  for (const definition of ARDUINO_BOARD_LED_DEFINITIONS) {
    arduinoBoardLedSectionsRoot.appendChild(createArduinoBoardLedCalibrationSection(definition));
  }

  copyArduinoBoardLedButton.addEventListener('click', async () => {
    const blocks = ARDUINO_BOARD_LED_DEFINITIONS.map((definition) =>
      buildArduinoBoardLedCopyBlock(definition)
    );

    try {
      await navigator.clipboard.writeText(blocks.join('\n\n'));
      setStatus('Copied the Arduino board LED calibration values to the clipboard.');
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      setStatus('Clipboard access is unavailable. Read the Arduino board LED values directly from the calibration panel.');
    }
  });

  resetArduinoBoardLedButton.addEventListener('click', () => {
    for (const definition of ARDUINO_BOARD_LED_DEFINITIONS) {
      arduinoBoardLedOffsetState[definition.key] = cloneTransformState(
        DEFAULT_ARDUINO_BOARD_LED_OFFSETS[definition.key]
      );
      arduinoBoardLedSizeState[definition.key] =
        DEFAULT_ARDUINO_BOARD_LED_SIZES[definition.key] ?? definition.defaultSize ?? 0.6;
      refreshArduinoBoardLedCalibrationSection(definition.key);
    }

    applyArduinoBoardLedCalibration();
    setStatus('Reset the Arduino board LED offsets and sizes to their defaults.');
  });
}

function getArduinoBoardLedDefinition(key) {
  return ARDUINO_BOARD_LED_DEFINITIONS.find((definition) => definition.key === key) ?? null;
}

function getArduinoBoardLedBasePosition(definition, output) {
  if (!definition) {
    return output.set(0, 0, 0);
  }

  if (arduinoModelPivot && definition.meshName) {
    const mesh = arduinoModelPivot.getObjectByName(definition.meshName);

    if (mesh) {
      tempBox.setFromObject(mesh);

      if (!tempBox.isEmpty()) {
        tempBox.getCenter(output);
        arduinoModelPivot.worldToLocal(output);
        return output;
      }
    }
  }

  return output.set(
    definition.fallbackPosition?.x ?? 0,
    definition.fallbackPosition?.y ?? 0,
    definition.fallbackPosition?.z ?? 0
  );
}

function ensureArduinoBoardLedObjects() {
  if (!arduinoModelPivot) {
    return;
  }

  for (const definition of ARDUINO_BOARD_LED_DEFINITIONS) {
    if (arduinoBoardLedObjects.has(definition.key)) {
      continue;
    }

    const root = new THREE.Group();
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 24),
      new THREE.MeshBasicMaterial({
        color: definition.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.65, 24, 24),
      new THREE.MeshBasicMaterial({
        color: definition.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const pointLight = new THREE.PointLight(
      definition.color,
      0,
      definition.lightDistance ?? 10,
      ARDUINO_BOARD_LED_LIGHT_DECAY
    );

    glow.renderOrder = 998;
    halo.renderOrder = 997;

    root.add(halo, glow, pointLight);
    arduinoModelPivot.add(root);

    arduinoBoardLedObjects.set(definition.key, {
      root,
      glow,
      halo,
      pointLight,
      currentBrightness: 0,
    });
  }
}

function applyArduinoBoardLedCalibration(definitionKey = null) {
  if (!arduinoModelPivot) {
    return;
  }

  ensureArduinoBoardLedObjects();

  for (const definition of ARDUINO_BOARD_LED_DEFINITIONS) {
    if (definitionKey && definition.key !== definitionKey) {
      continue;
    }

    const ledObject = arduinoBoardLedObjects.get(definition.key);

    if (!ledObject) {
      continue;
    }

    getArduinoBoardLedBasePosition(definition, tempArduinoLedPosition);
    tempArduinoLedPositionB.copy(tempArduinoLedPosition).add(
      copyStateToVector(arduinoBoardLedOffsetState[definition.key], tempPoint)
    );
    ledObject.root.position.copy(tempArduinoLedPositionB);
    ledObject.root.scale.setScalar(arduinoBoardLedSizeState[definition.key] ?? definition.defaultSize ?? 1);
  }
}

function startArduinoBoardLedSimulation() {
  arduinoBoardLedRuntimeState.simulationActive = true;
  arduinoBoardLedRuntimeState.builtinTarget = false;
  arduinoBoardLedRuntimeState.startupStartedAt = clock.getElapsedTime();
}

function stopArduinoBoardLedSimulation() {
  arduinoBoardLedRuntimeState.simulationActive = false;
  arduinoBoardLedRuntimeState.builtinTarget = false;
  arduinoBoardLedRuntimeState.startupStartedAt = -Infinity;
}

function updateArduinoBoardLedRuntime(snapshot = null, pinStates = null) {
  const resolvedPinStates = pinStates ?? normalizeSimulationPinStates(snapshot ?? {});
  const d13State = resolvedPinStates?.D13;

  arduinoBoardLedRuntimeState.builtinTarget = Boolean(
    snapshot?.builtinLedOn ??
    (d13State?.mode === 'output' && d13State?.value === true)
  );
}

function animateArduinoBoardLeds(deltaTime) {
  if (arduinoBoardLedObjects.size === 0) {
    return;
  }

  const elapsed = clock.getElapsedTime();
  const startupElapsed = elapsed - arduinoBoardLedRuntimeState.startupStartedAt;
  const bootPulseBrightness =
    arduinoBoardLedRuntimeState.simulationActive &&
    startupElapsed >= 0 &&
    startupElapsed <= ARDUINO_BOARD_LED_BOOT_PULSE_DURATION
      ? Math.sin((startupElapsed / ARDUINO_BOARD_LED_BOOT_PULSE_DURATION) * Math.PI)
      : 0;

  for (const definition of ARDUINO_BOARD_LED_DEFINITIONS) {
    const ledObject = arduinoBoardLedObjects.get(definition.key);

    if (!ledObject) {
      continue;
    }

    const steadyTarget =
      !arduinoBoardLedRuntimeState.simulationActive
        ? 0
        : definition.key === 'powerLed'
          ? 1
          : arduinoBoardLedRuntimeState.builtinTarget
            ? 1
            : 0;
    const target = definition.key === 'builtinLed'
      ? Math.max(steadyTarget, bootPulseBrightness)
      : steadyTarget;
    const nextBrightness = THREE.MathUtils.damp(
      ledObject.currentBrightness ?? 0,
      target,
      ARDUINO_BOARD_LED_FADE_SPEED,
      deltaTime
    );

    ledObject.currentBrightness = nextBrightness;
    ledObject.glow.material.opacity = nextBrightness * 0.42;
    ledObject.halo.material.opacity = nextBrightness * 0.18;
    ledObject.glow.scale.setScalar(THREE.MathUtils.lerp(0.78, 1.12, nextBrightness));
    ledObject.halo.scale.setScalar(THREE.MathUtils.lerp(1.0, 1.32, nextBrightness));
    ledObject.pointLight.intensity = nextBrightness * (definition.maxLightIntensity ?? 0.75);
  }
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

  const iconMarkup = definition.iconUrl
    ? `<img class="parts-card__icon-img" src="${definition.iconUrl}" alt="" draggable="false" />`
    : `<span class="parts-card__icon-text">${definition.label.slice(0, 1)}</span>`;

  section.innerHTML = `
    <button type="button" class="parts-card__button" data-part-key="${definition.key}">
      <span class="parts-card__icon">${iconMarkup}</span>
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

function resetSimulationVisuals() {
  stopArduinoBoardLedSimulation();

  for (const part of placedParts) {
    if (part.userData.definitionKey !== 'ledRed') {
      continue;
    }

    setLedVisualState(part, false);

    part.userData.ledReversePowered = false;
    part.userData.ledReverseStartedAt = null;
    setLedSmokeState(part, false);
  }
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

  resetSimulationVisuals();

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

  const PIN_RADIUS = 0.18;
  const PIN_LENGTH = 4.2;

  const COLLAR_TOP_RADIUS = 0.48;
  const COLLAR_BOTTOM_RADIUS = 0.54;
  const COLLAR_HEIGHT = 1.0;

  const HOUSING_SIZE = 1.8;
  const HOUSING_HEIGHT = 3.5;

  const RELIEF_TOP_RADIUS = 0.45;
  const RELIEF_BOTTOM_RADIUS = 0.56;
  const RELIEF_HEIGHT = 1.4;

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(PIN_RADIUS, PIN_RADIUS, PIN_LENGTH, 18),
    new THREE.MeshStandardMaterial({
      color: 0xd9e2eb,
      metalness: 0.7,
      roughness: 0.28,
    })
  );
  pin.position.y = PIN_LENGTH / 2;

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(COLLAR_TOP_RADIUS, COLLAR_BOTTOM_RADIUS, COLLAR_HEIGHT, 20),
    new THREE.MeshStandardMaterial({
      color: 0xb9c0c7,
      metalness: 0.35,
      roughness: 0.45,
    })
  );
  collar.position.y = PIN_LENGTH + COLLAR_HEIGHT / 2 - 0.15;

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(HOUSING_SIZE, HOUSING_HEIGHT, HOUSING_SIZE),
    new THREE.MeshStandardMaterial({
      color: 0x1f2730,
      roughness: 0.88,
      metalness: 0.05,
    })
  );
  housing.position.y = PIN_LENGTH + COLLAR_HEIGHT + HOUSING_HEIGHT / 2 - 0.35;

  const strainRelief = new THREE.Mesh(
    new THREE.CylinderGeometry(RELIEF_TOP_RADIUS, RELIEF_BOTTOM_RADIUS, RELIEF_HEIGHT, 18),
    new THREE.MeshStandardMaterial({
      color: 0x2c3641,
      roughness: 0.9,
      metalness: 0.04,
    })
  );
  strainRelief.position.y =
    PIN_LENGTH + COLLAR_HEIGHT + HOUSING_HEIGHT + RELIEF_HEIGHT / 2 - 0.55;

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

    halo.position.y = housing.position.y;
    group.add(halo);

    const hitArea = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 18, 18),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );

    hitArea.position.y = housing.position.y;
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

function isPartLeadTargetOccupied(target, ignoredPart = null, ignoredEndKey = null) {
  if (!target) {
    return false;
  }

  for (const part of placedParts) {
    for (const endKey of ['start', 'end']) {
      if (part === ignoredPart && endKey === ignoredEndKey) {
        continue;
      }

      if (getPartLeadConnectivityTarget(part, endKey) === target) {
        return true;
      }
    }
  }

  return false;
}

function isWireTargetOccupiedByPart(target) {
  if (!target || target.userData?.surfaceKey !== 'breadboardSurface') {
    return false;
  }

  for (const part of placedParts) {
    if (
      getPartLeadConnectivityTarget(part, 'start') === target ||
      getPartLeadConnectivityTarget(part, 'end') === target
    ) {
      return true;
    }
  }

  return false;
}

function isTargetCoveredByPartBody(target, ignoredPart = null) {
  if (!target || target.userData?.surfaceKey !== 'breadboardSurface') {
    return false;
  }

  for (const part of placedParts) {
    if (part === ignoredPart) {
      continue;
    }

    // Do not treat the component's own lead holes as "covered body" holes.
    // They are handled separately by isPartLeadTargetOccupied().
    if (
      getPartLeadConnectivityTarget(part, 'start') === target ||
      getPartLeadConnectivityTarget(part, 'end') === target
    ) {
      continue;
    }

    const hitArea = updatePartBodyHitArea(part);

    if (!hitArea) {
      continue;
    }

    part.updateMatrixWorld(true);
    hitArea.updateMatrixWorld(true);
    hitArea.geometry.computeBoundingBox();

    tempPartLocalPoint.copy(target.userData.worldPosition);
    hitArea.worldToLocal(tempPartLocalPoint);

    if (hitArea.geometry.boundingBox?.containsPoint(tempPartLocalPoint)) {
      return true;
    }
  }

  return false;
}

function isWireTargetBlocked(target) {
  return (
    isWireTargetOccupiedByPart(target) ||
    isTargetCoveredByPartBody(target)
  );
}

function isPartLeadTargetBlocked(target, ignoredPart = null, ignoredEndKey = null) {
  if (isPartLeadTargetOccupied(target, ignoredPart, ignoredEndKey)) {
    return true;
  }

  if (target?.userData?.surfaceKey !== 'breadboardSurface') {
    return false;
  }

  if (isTargetCoveredByPartBody(target, ignoredPart)) {
    return true;
  }

  return interactiveWires.some(
    (wire) => wire.startSnappedTarget === target || wire.endSnappedTarget === target
  );
}
function findNearestAvailablePartLeadTarget(
  point,
  targets,
  {
    maxDistance = SNAP_DISTANCE,
    ignoredPart = null,
    ignoredEndKey = null,
  } = {}
) {
  let nearestTarget = null;
  let nearestDistance = Infinity;

  for (const target of targets) {
    if (isPartLeadTargetBlocked(target, ignoredPart, ignoredEndKey)) {
      continue;
    }

    const distance = point.distanceTo(target.userData.worldPosition);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target;
    }
  }

  if (!nearestTarget) {
    return null;
  }

  if (Number.isFinite(maxDistance) && nearestDistance > maxDistance) {
    return null;
  }

  return nearestTarget;
}

function findNearestAvailableWireTarget(
  point,
  targets,
  {
    maxDistance = SNAP_DISTANCE,
  } = {}
) {
  let nearestTarget = null;
  let nearestDistance = Infinity;

  for (const target of targets) {
    if (isWireTargetBlocked(target)) {
      continue;
    }

    const distance = point.distanceTo(target.userData.worldPosition);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target;
    }
  }

  if (!nearestTarget) {
    return null;
  }

  if (Number.isFinite(maxDistance) && nearestDistance > maxDistance) {
    return null;
  }

  return nearestTarget;
}

function partHasOccupiedLeadTargets(part) {
  if (!part) {
    return false;
  }

  return ['start', 'end'].some((endKey) =>
    isPartLeadTargetBlocked(getPartLeadConnectivityTarget(part, endKey), part, endKey)
  );
}

function capturePartPlacementState(part) {
  if (!part) {
    return null;
  }

  return {
    startLeadPositionLocal: part.userData.startLeadPositionLocal?.clone?.() ?? null,
    endLeadPositionLocal: part.userData.endLeadPositionLocal?.clone?.() ?? null,
    startSnappedTarget: part.userData.startSnappedTarget ?? null,
    endSnappedTarget: part.userData.endSnappedTarget ?? null,
    startLandedTarget: part.userData.startLandedTarget ?? null,
    endLandedTarget: part.userData.endLandedTarget ?? null,
    startInsertionDepth: part.userData.startInsertionDepth ?? 0,
    endInsertionDepth: part.userData.endInsertionDepth ?? 0,
  };
}

function restorePartPlacementState(part, snapshot) {
  if (!part || !snapshot) {
    return false;
  }

  if (snapshot.startLeadPositionLocal) {
    part.userData.startLeadPositionLocal.copy(snapshot.startLeadPositionLocal);
  }

  if (snapshot.endLeadPositionLocal) {
    part.userData.endLeadPositionLocal.copy(snapshot.endLeadPositionLocal);
  }

  part.userData.startSnappedTarget = snapshot.startSnappedTarget ?? null;
  part.userData.endSnappedTarget = snapshot.endSnappedTarget ?? null;
  part.userData.startLandedTarget = snapshot.startLandedTarget ?? null;
  part.userData.endLandedTarget = snapshot.endLandedTarget ?? null;
  setPartLeadInsertionDepth(part, 'start', snapshot.startInsertionDepth ?? 0);
  setPartLeadInsertionDepth(part, 'end', snapshot.endInsertionDepth ?? 0);

  updateInteractivePartTransform(part);
  updatePartLeadLandingTargets(part);
  updatePartBodyHitArea(part);

  return true;
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
  if (!SHOW_PART_LANDING_TARGET_MARKERS || !target) {
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
  const candidate = findNearestAvailablePartLeadTarget(tempPartWorldPosition, breadboardTargets, {
    ignoredPart: part,
    ignoredEndKey: endKey,
  });

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
  const color = active
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

  const showOnlySnappedLeadMarkers = false;
  const alwaysShowLeadMarkers = Boolean(definition?.alwaysShowLeadMarkers);

  if (alwaysShowLeadMarkers) {
    startHandle.visible = true;
    endHandle.visible = true;
  } else if (showOnlySnappedLeadMarkers) {
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

  applyPartContentCalibration(root);
  ensurePushButtonAnimationData(root);
  updatePartLeadLocalPoints(root);
  root.userData.startLeadPositionLocal.copy(root.userData.startLeadLocalPoint);
  root.userData.endLeadPositionLocal.copy(root.userData.endLeadLocalPoint);
  updateInteractivePartTransform(root);
  updatePartBodyHitArea(root);

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
  applyPartContentCalibration(part);
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
  partDragState.originalPlacement = null;
}

function clearPlacedParts() {
  releaseActivePushButtonPress();

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
  updatePartLeadLandingTargets(partDragState.previewPart);
  partDragState.placementValid = !partHasOccupiedLeadTargets(partDragState.previewPart);
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
  partDragState.originalPlacement = capturePartPlacementState(part);

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
  partDragState.originalPlacement = null;
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

  const nearestTarget = findNearestAvailablePartLeadTarget(
    tempPartWorldPosition,
    breadboardTargets,
    {
      maxDistance: Infinity,
      ignoredPart: part,
      ignoredEndKey: endKey,
    }
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
    if (partDragState.mode === 'redrag' && partDragState.originalPart && partDragState.originalPlacement) {
      restorePartPlacementState(partDragState.originalPart, partDragState.originalPlacement);
      partDragState.previewPart = null;
      partDragState.placementValid = false;
      setStatus(`Kept the ${definition?.statusLabel ?? 'part'} in its previous holes because the new drop was not allowed.`);
    } else {
      clearPartDragPreview();
    }
  } else {
    partDragState.previewPart = null;
    partDragState.placementValid = false;
  }

  partDragState.active = false;
  partDragState.pointerId = null;
  partDragState.definitionKey = null;
  document.body.classList.remove('is-dragging');

  if (placedPart) {
    const didSnapPartLead = snapPlacedPartLeadToNearestBreadboardTarget(
      placedPart,
      PART_REDRAG_SNAP_END
    );

    if (!didSnapPartLead || partHasOccupiedLeadTargets(placedPart)) {
      if (partDragState.mode === 'redrag' && partDragState.originalPlacement) {
        restorePartPlacementState(placedPart, partDragState.originalPlacement);
        setStatus(`Kept the ${definition?.statusLabel ?? 'part'} in its previous holes because that breadboard hole already has a component lead.`);
      } else {
        if (placedPart.parent) {
          placedPart.parent.remove(placedPart);
        }

        setStatus(`Couldn't place the ${definition?.statusLabel ?? 'part'} there because one of those breadboard holes already has a component lead.`);
      }
    } else {
      refreshTargetVisuals();

      animatePartInsertionVisual(placedPart);

      if (partDragState.mode === 'new' && !placedParts.includes(placedPart)) {
        placedParts.push(placedPart);
      }

      const landingSummary = buildPartLeadLandingSummary(placedPart);

      setStatus(
        landingSummary
          ? `${partDragState.mode === 'redrag' ? 'Moved' : 'Placed'} the ${definition?.statusLabel ?? 'part'} with ${landingSummary}.`
          : `${partDragState.mode === 'redrag' ? 'Moved' : 'Placed'} the ${definition?.statusLabel ?? 'part'} on the breadboard.`
      );
    }
  } else {
    updateStatusForState();
  }

  partDragState.mode = 'new';
  partDragState.originalPart = null;
  partDragState.originalPlacement = null;

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
  const definition = PART_DEFINITION_BY_KEY.get(part?.userData?.definitionKey);
  const accentColor = definition?.accent ?? '#ffffff';
  const material = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: SHOW_PART_BODY_HITBOX_MARKERS ? PART_BODY_HITBOX_MARKER_OPACITY : 0,
    depthWrite: false,
  });

  const hitArea = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    material
  );

  hitArea.name = 'part-body-hit-area';
  hitArea.userData.interactionType = 'placedPart';
  hitArea.userData.part = part;

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: SHOW_PART_BODY_HITBOX_MARKERS ? PART_BODY_HITBOX_OUTLINE_OPACITY : 0,
      depthWrite: false,
    })
  );
  outline.name = 'part-body-hit-area-outline';
  outline.raycast = () => {};

  hitArea.add(outline);
  hitArea.userData.outline = outline;

  // Keep it raycastable and visible for body-hitbox tuning.
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
  const outline = hitArea.userData.outline ?? null;

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

  if (outline) {
    outline.geometry.dispose();
    outline.geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(tempSize.x, tempSize.y, tempSize.z)
    );
  }

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

function getArduinoResetButtonHitAreas() {
  ensureArduinoResetButtonAnimationData();

  return arduinoResetButtonHitArea ? [arduinoResetButtonHitArea] : [];
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

  // For parts on the breadboard, insertion should follow the breadboard surface normal,
  // not the snap target object's local normal.
  if (target.userData.surfaceKey === 'breadboardSurface') {
    getSurfaceNormal('breadboardSurface', tempNormal);
  } else {
    getTargetWorldNormal(target, tempNormal);
  }

  // Positive depth means inserted into the hole.
  tempPartLocalPoint.addScaledVector(
    tempNormal,
    -getPartLeadInsertionDepth(part, endKey)
  );

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
  part.userData.visualInsertionOffsetY = inserted ? PART_VISUAL_INSERTION_DEPTH : 0;
  updateInteractivePartTransform(part);
}

function snapBothPartLeadsToNearestBreadboardTargets(part) {
  if (!part || !breadboardPartsRoot || breadboardTargets.length === 0) {
    return false;
  }

  cacheSnapTargetWorldPositions();
  part.updateMatrixWorld(true);
  breadboardPartsRoot.updateMatrixWorld(true);

  const startHandle = part.userData.startHandle;
  const endHandle = part.userData.endHandle;

  if (!startHandle || !endHandle) {
    return false;
  }

  startHandle.getWorldPosition(tempPartLeadPointA);
  endHandle.getWorldPosition(tempPartLeadPointB);

  const startTarget = findNearestAvailablePartLeadTarget(tempPartLeadPointA, breadboardTargets, {
    maxDistance: Infinity,
    ignoredPart: part,
    ignoredEndKey: 'start',
  });

  const endTarget = findNearestAvailablePartLeadTarget(tempPartLeadPointB, breadboardTargets, {
    maxDistance: Infinity,
    ignoredPart: part,
    ignoredEndKey: 'end',
  });

  if (!startTarget || !endTarget || startTarget === endTarget) {
    return false;
  }

  part.userData.startSnappedTarget = startTarget;
  part.userData.endSnappedTarget = endTarget;
  part.userData.startLandedTarget = startTarget;
  part.userData.endLandedTarget = endTarget;

  // Start above the holes.
  setPartLeadInsertionDepth(part, 'start', 0);
  setPartLeadInsertionDepth(part, 'end', 0);

  writePartLeadLocalPositionFromTarget(
    part,
    'start',
    startTarget,
    part.userData.startLeadPositionLocal
  );

  writePartLeadLocalPositionFromTarget(
    part,
    'end',
    endTarget,
    part.userData.endLeadPositionLocal
  );

  updateInteractivePartTransform(part);
  updatePartLeadLandingTargets(part);

  return true;
}

function animatePartInsertionVisual(part) {
  if (!part) {
    return;
  }

  if (part.userData.insertionAnimationFrame) {
    cancelAnimationFrame(part.userData.insertionAnimationFrame);
    part.userData.insertionAnimationFrame = null;
  }

  const startOffset = -PART_INSERTION_LIFT;
  const targetOffset = PART_VISUAL_INSERTION_DEPTH;

  part.userData.visualInsertionOffsetY = startOffset;
  applyPartContentCalibration(part);
  updatePartBodyHitArea(part);

  const startedAt = performance.now();

  function step(now) {
    const elapsed = (now - startedAt) / 1000;
    const t = THREE.MathUtils.clamp(elapsed / PART_INSERTION_DURATION, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    part.userData.visualInsertionOffsetY = THREE.MathUtils.lerp(
      startOffset,
      targetOffset,
      eased
    );

    applyPartContentCalibration(part);
    updatePartBodyHitArea(part);

    if (t < 1) {
      part.userData.insertionAnimationFrame = requestAnimationFrame(step);
      return;
    }

    // Stay inserted.
    part.userData.visualInsertionOffsetY = targetOffset;
    applyPartContentCalibration(part);
    updatePartBodyHitArea(part);

    part.userData.insertionAnimationFrame = null;
  }

  part.userData.insertionAnimationFrame = requestAnimationFrame(step);
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

function ensureArduinoResetButtonAnimationData() {
  if (!arduinoModelPivot) {
    return false;
  }

  if (arduinoResetButtonState.mesh) {
    return true;
  }

  const mesh = arduinoModelPivot.getObjectByName(arduinoResetButtonState.meshName);

  if (!mesh) {
    console.warn('Arduino reset button mesh not found:', arduinoResetButtonState.meshName);
    return false;
  }

  arduinoResetButtonState.mesh = mesh;
  arduinoResetButtonState.basePosition = mesh.position.clone();

  // Add invisible clickable area attached to the reset cap mesh.
  if (!arduinoResetButtonHitArea) {
    const hitArea = new THREE.Mesh(
      new THREE.SphereGeometry(ARDUINO_RESET_BUTTON_HITBOX_RADIUS, 18, 18),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );

    hitArea.userData.isArduinoResetButtonHitArea = true;

    // Attach to the reset cap, so it follows the button if animated.
    mesh.add(hitArea);

    mesh.geometry.computeBoundingBox();

    const resetButtonLocalCenter = new THREE.Vector3();

    if (mesh.geometry.boundingBox) {
      mesh.geometry.boundingBox.getCenter(resetButtonLocalCenter);
    }

    hitArea.position.copy(resetButtonLocalCenter);

    // Optional: make it easier to click
    hitArea.scale.setScalar(1.6);

    arduinoResetButtonHitArea = hitArea;
  }

  return true;
}

function setArduinoResetButtonPressed(isPressed) {
  if (!ensureArduinoResetButtonAnimationData()) {
    return;
  }

  const nextPressed = Boolean(isPressed);
  arduinoResetButtonState.pressTarget = nextPressed ? 1 : 0;

  if (nextPressed) {
    holdArduinoSimulatorInReset();
  } else {
    releaseArduinoSimulatorReset();
  }
}

function animateArduinoResetButton(deltaTime) {
  if (!ensureArduinoResetButtonAnimationData()) {
    return;
  }

  const nextAmount = THREE.MathUtils.damp(
    arduinoResetButtonState.pressAmount,
    arduinoResetButtonState.pressTarget,
    ARDUINO_RESET_BUTTON_PRESS_SPEED,
    deltaTime
  );

  arduinoResetButtonState.pressAmount = nextAmount;

  arduinoResetButtonState.mesh.position.copy(arduinoResetButtonState.basePosition);

  // Start with local Y, same as your push-button animation.
  arduinoResetButtonState.mesh.position.z +=
    nextAmount * ARDUINO_RESET_BUTTON_PRESS_DEPTH;
}

function animateLedSmoke(deltaTime) {
  const elapsed = clock.getElapsedTime();

  for (const part of placedParts) {
    if (part.userData.definitionKey !== 'ledRed') {
      continue;
    }

    ensureLedSmokeObjects(part);
    updateLedSmokeSourcePosition(part);

    const particles = part.userData.ledSmokeParticles ?? [];
    const reversePowered = Boolean(part.userData.ledReversePowered);

    if (reversePowered && part.userData.ledReverseStartedAt == null) {
      part.userData.ledReverseStartedAt = elapsed;
    }

    const reverseDuration =
      reversePowered && part.userData.ledReverseStartedAt != null
        ? elapsed - part.userData.ledReverseStartedAt
        : 0;

    const active = reversePowered && reverseDuration >= LED_REVERSE_SMOKE_DELAY;

    part.userData.ledSmokeActive = active;

    for (const particle of particles) {
      if (!particle) {
        continue;
      }

      if (!active) {
        particle.material.opacity = THREE.MathUtils.damp(
          particle.material.opacity,
          0,
          8,
          deltaTime
        );

        if (particle.material.opacity < 0.01) {
          particle.visible = false;
        }

        continue;
      }

      particle.visible = true;

      particle.userData.age += deltaTime;

      if (particle.userData.age > LED_SMOKE_LIFETIME) {
        particle.userData.age = 0;
        particle.userData.offsetX = (Math.random() - 0.5) * 0.8;
        particle.userData.offsetZ = (Math.random() - 0.5) * 0.8;
        particle.userData.scaleSeed = 0.7 + Math.random() * 0.8;
      }

      const t = particle.userData.age / LED_SMOKE_LIFETIME;
      const swirl = Math.sin(elapsed * 3.0 + particle.userData.seed) * 0.35;

      const smokeUpLocal = part.userData.ledSmokeUpLocal ?? new THREE.Vector3(0, 1, 0);

      // build a sideways drift vector
      const driftX =
        particle.userData.offsetX + swirl * t * LED_SMOKE_SPREAD_SPEED;
      const driftZ =
        particle.userData.offsetZ +
        Math.cos(elapsed * 2.2 + particle.userData.seed) * t;

      // rise along world-up converted into local space
      tempPoint.copy(smokeUpLocal).multiplyScalar(t * LED_SMOKE_RISE_SPEED);

      // add some sideways spread in local X/Z
      tempPoint.x += driftX;
      tempPoint.z += driftZ;

      particle.position.copy(tempPoint);

      const scale = particle.userData.scaleSeed * THREE.MathUtils.lerp(0.4, 1.8, t);
      particle.scale.setScalar(scale);

      // Fade in, then fade out.
      const opacity =
        t < 0.35
          ? THREE.MathUtils.lerp(0, LED_SMOKE_MAX_OPACITY, t / 0.35)
          : THREE.MathUtils.lerp(LED_SMOKE_MAX_OPACITY, 0, (t - 0.35) / 0.65);

      particle.material.opacity = opacity;
    }
  }
}

function animateLedVisuals(deltaTime) {
  const elapsed = clock.getElapsedTime();

  for (const part of placedParts) {
    if (part.userData.definitionKey !== 'ledRed') {
      continue;
    }

    cacheOriginalLedMaterials(part);
    ensureLedGlowObjects(part);

    const current = part.userData.ledBrightness ?? 0;
    const target = part.userData.ledTargetBrightness ?? 0;

    const next = THREE.MathUtils.damp(
      current,
      target,
      LED_FADE_SPEED,
      deltaTime
    );

    part.userData.ledBrightness = next;

    // Small living pulse when ON, but none when OFF.
    const pulse =
      target > 0
        ? 0.92 + Math.sin(elapsed * 34.0) * 0.08
        : 1.0;

    const brightness = THREE.MathUtils.clamp(next * pulse, 0, 1);

    for (const entry of part.userData.ledMaterialCache ?? []) {
      const material = entry.material;

      if (!material) {
        continue;
      }

      if (entry.color && material.color) {
        material.color.copy(entry.color).lerp(
          new THREE.Color(LED_ON_COLOR),
          brightness
        );
      }

      if (material.emissive) {
        const baseEmissive = entry.emissive ?? new THREE.Color(LED_OFF_EMISSIVE);
        material.emissive.copy(baseEmissive).lerp(
          new THREE.Color(LED_ON_EMISSIVE),
          brightness
        );
        material.emissiveIntensity =
          entry.emissiveIntensity +
          brightness * LED_MAX_EMISSIVE_INTENSITY;
      }

      material.transparent = true;
      material.opacity = THREE.MathUtils.lerp(entry.opacity ?? 1, 0.94, brightness);
      material.needsUpdate = true;
    }

    if (part.userData.ledGlow) {
      part.userData.ledGlow.material.opacity = brightness * LED_MAX_GLOW_OPACITY;
      part.userData.ledGlow.scale.setScalar(
        THREE.MathUtils.lerp(0.75, 1.25, brightness)
      );
    }

    if (part.userData.ledPointLight) {
      part.userData.ledPointLight.intensity =
        brightness * LED_MAX_LIGHT_INTENSITY;
    }
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

  if (wireState.hoveredTarget && !isWireTargetBlocked(wireState.hoveredTarget)) {
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

function getPushButtonPartUnderPointer(event) {
  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(getAllPlacedPartHitAreas(), false);
  const part = intersections[0]?.object?.userData?.part ?? null;

  return part?.userData?.definitionKey === 'pushButton' ? part : null;
}

function onPointerDown(event) {
  if (partDragState.active) {
    return;
  }

  // RIGHT CLICK = press Arduino reset button OR placed push button
  if (event.button === 2) {
    updatePointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);

    const resetIntersections = raycaster.intersectObjects(
      getArduinoResetButtonHitAreas(),
      false
    );

    const hitObject = resetIntersections[0]?.object;

    if (hitObject?.userData?.isArduinoResetButtonHitArea) {
      event.preventDefault();
      event.stopPropagation();

      arduinoResetButtonRightPressed = true;
      setArduinoResetButtonPressed(true);

      controls.enabled = false;

      if (event.pointerId !== undefined) {
        renderer.domElement.setPointerCapture(event.pointerId);
      }

      setStatus('Pressed Arduino reset button.');
      updateCanvasCursor();
      return;
    }

    const part = getPushButtonPartUnderPointer(event);

    if (!part) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    pushButtonPressState.activePart = part;
    setPushButtonPressedState(part, true);

    controls.enabled = false;

    if (event.pointerId !== undefined) {
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    setStatus(`Pressed the ${PART_DEFINITION_BY_KEY.get(part.userData.definitionKey)?.statusLabel ?? 'push button'}.`);
    updateCanvasCursor();
    return;
  }

  // LEFT CLICK only = drag/redrag
  if (event.button !== 0) {
    return;
  }

  const hitAreas = [
    ...getArduinoResetButtonHitAreas(),
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

    const nearestTarget = findNearestAvailablePartLeadTarget(tempPoint, breadboardTargets, {
      ignoredPart: partLeadState.activePart,
      ignoredEndKey: partLeadState.draggedEnd,
    });

    partLeadState.hoveredTarget =
      nearestTarget &&
      isMatchingFixedLeadTarget(partLeadState.activePart, partLeadState.draggedEnd, nearestTarget)
        ? nearestTarget
        : null;

    if (partLeadState.hoveredTarget) {
      tempPartLocalPoint.copy(partLeadState.hoveredTarget.userData.worldPosition);
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
      const nearestTarget = findNearestAvailableWireTarget(dragPoint, availableTargets);
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
  if (arduinoResetButtonRightPressed) {
    arduinoResetButtonRightPressed = false;
    setArduinoResetButtonPressed(false);

    controls.enabled = true;

    if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }

    updateCanvasCursor();
    return;
  }

  if (pushButtonPressState.activePart) {
    releaseActivePushButtonPress();

    controls.enabled = true;

    if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }

    updateCanvasCursor();
    return;
  }

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

function onWindowMouseDownForSecondaryAction(event) {
  if (event.button !== 2) {
    return;
  }

  // Right-click rotation is intentionally disabled now.
  if (partDragState.active || !isPointerOverCanvas(event)) {
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(getAllPlacedPartHitAreas(), false);
  const part = intersections[0]?.object?.userData?.part ?? null;

  if (!part || part.userData.definitionKey !== 'pushButton') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  pushButtonPressState.activePart = part;
  setPushButtonPressedState(part, true);
  setStatus(`Pressed the ${PART_DEFINITION_BY_KEY.get(part.userData.definitionKey)?.statusLabel ?? 'button'}.`);
}

function onWindowMouseUpForSecondaryAction(event) {
  if (event.button !== 2) {
    return;
  }

  if (!pushButtonPressState.activePart) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const part = pushButtonPressState.activePart;
  releaseActivePushButtonPress();
  setStatus(`Released the ${PART_DEFINITION_BY_KEY.get(part.userData.definitionKey)?.statusLabel ?? 'button'}.`);
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

  if (partDragState.active && partDragState.previewPart) {
    return;
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

  arduinoModelPivot = arduinoModel;
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

  ensureArduinoBoardLedObjects();
  applyArduinoBoardLedCalibration();
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
  window.addEventListener('mousedown', onWindowMouseDownForSecondaryAction, true);
  window.addEventListener('mouseup', onWindowMouseUpForSecondaryAction, true);
  window.addEventListener('keydown', onWindowKeyDownForPartRotate, true);
  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('blur', releaseActivePushButtonPress);

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  
  controls.update();
  updateHandleVisuals();
  animateArduinoBoardLeds(delta);
  animatePushButtons(delta);
  animateArduinoResetButton(delta);
  animateLedVisuals(delta);
  animateLedSmoke(delta);

  renderer.render(scene, camera);
}
