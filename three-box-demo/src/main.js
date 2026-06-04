import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BREADBOARD_PITCH = 2.54;
const SNAP_DISTANCE = 4.4;
const CABLE_EXIT_OFFSET = 14.85;
const CABLE_RADIUS = 0.9;
const DEG_TO_RAD = Math.PI / 180;
const PLUG_INSERTION_DEPTH = 3.2;
const DEFAULT_PART_SURFACE_LIFT = 0.14;
const WORKSPACE_WIRE_BASE_HEIGHT = 1.9;
const PART_LEAD_HANDLE_RADIUS = 0.76;
const POSITION_LIMIT = 220;
const SURFACE_SIZE_LIMIT = 220;
const BREADBOARD_TERMINAL_COLUMNS = 30;
const CABLE_STRAIN_RELIEF_LENGTH = 6.5;
const CABLE_END_BEND_LIFT = 2.0;
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
    leadLabels: ['Left Lead', 'Right Lead'],
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

console.table(
  PART_DEFINITIONS.map((definition) => ({
    part: definition.label,
    key: definition.key,
    surfaceLiftY: definition.surfaceLiftY ?? DEFAULT_PART_SURFACE_LIFT,
  }))
);

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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7edf4);
scene.fog = new THREE.Fog(0xe7edf4, 260, 520);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(210, 135, 220);

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
controls.minDistance = 90;
controls.maxDistance = 520;
controls.target.set(0, 22, 0);
controls.update();

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
};
const partLeadState = {
  dragging: false,
  activePart: null,
  draggedEnd: null,
  hoveredPart: null,
  hoveredEnd: null,
  hoveredTarget: null,
};

buildTransformDebugPanel();
buildPowerRailCalibrationPanel();
buildArduinoHeaderCalibrationPanel();
buildPartsPanel();

init().catch((error) => {
  console.error(error);
  setStatus('Failed to load the Uno simulator assets. Check the console for details.');
});

function setStatus(message) {
  statusLine.textContent = message;
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
      tempPartLocalPoint.copy(part.userData.startSnappedTarget.userData.worldPosition);
      breadboardPartsRoot.worldToLocal(tempPartLocalPoint);
      part.userData.startLeadPositionLocal.copy(tempPartLocalPoint);
    }

    if (part.userData.endSnappedTarget) {
      tempPartLocalPoint.copy(part.userData.endSnappedTarget.userData.worldPosition);
      breadboardPartsRoot.worldToLocal(tempPartLocalPoint);
      part.userData.endLeadPositionLocal.copy(tempPartLocalPoint);
    }

    updateInteractivePartTransform(part);
  }

  refreshTargetVisuals();
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

function createAxisControlMarkup(axis, value, type, limits, label = axis.toUpperCase()) {
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
        value="${value.toFixed(1)}"
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
    loader.load(url, resolve, undefined, reject);
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

function setTargetVisualState(target, active, snapped) {
  const marker = target.userData.marker;
  const halo = target.userData.halo;
  const forcedVisible = Boolean(target.userData.alwaysVisible);
  const visible = forcedVisible || active || snapped;
  const color = snapped
    ? 0xff8b2b
    : active
      ? 0x5aa7ff
      : target.userData.idleColor ?? 0xcfd8e3;

  marker.visible = visible;
  halo.visible = visible;

  if (!visible) {
    return;
  }

  marker.userData.ring.material.color.setHex(color);
  marker.userData.ring.material.emissive.setHex(color);
  marker.userData.core.material.emissive.setHex(color);
  marker.scale.setScalar(snapped ? 1.28 : active ? 1.14 : forcedVisible ? 0.82 : 0.94);

  halo.material.color.setHex(color);
  halo.material.opacity = snapped ? 0.34 : active ? 0.24 : forcedVisible ? 0.14 : 0.1;
  halo.scale.setScalar(snapped ? 1.18 : active ? 1.08 : forcedVisible ? 0.84 : 0.92);
}

function refreshTargetVisuals() {
  for (const target of getAllSnapTargets()) {
    const active = target === wireState.hoveredTarget || target === partLeadState.hoveredTarget;
    const snapped = isTargetSnappedByAnyWire(target) || isTargetSnappedByAnyPart(target);
    setTargetVisualState(target, active, snapped);
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

function createCableMesh() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xff6d2e,
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

function createWireAssembly(includeHandles = true) {
  const group = new THREE.Group();

  const startPlug = createDupontPlug(includeHandles);
  const freePlug = createDupontPlug(includeHandles);
  const cable = createCableMesh();

  group.add(cable, startPlug, freePlug);

  group.userData.startPlug = startPlug;
  group.userData.endPlug = freePlug;
  group.userData.cableMesh = cable;

  return group;
}

function createInteractiveWire(options = {}) {
  const assembly = createWireAssembly(true);
  const wire = {
    assembly,
    startPlug: assembly.userData.startPlug,
    endPlug: assembly.userData.endPlug,
    startHitArea: assembly.userData.startPlug.userData.hitArea,
    endHitArea: assembly.userData.endPlug.userData.hitArea,
    cableMesh: assembly.userData.cableMesh,
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
  wire.startTip.set(baseX - 14, WORKSPACE_WIRE_BASE_HEIGHT, baseZ - 5);
  wire.endTip.set(baseX + 14, WORKSPACE_WIRE_BASE_HEIGHT, baseZ + 5);
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
  const leadLabels = definition?.leadLabels ?? ['Left Lead', 'Right Lead'];

  return endKey === 'start' ? leadLabels[0] : leadLabels[1];
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
  const scaleX = part.userData.leadScaleX ?? 1;
  const startHandle = part.userData.startHandle;
  const endHandle = part.userData.endHandle;
  const startLeadLocalPoint = part.userData.startLeadLocalPoint;
  const endLeadLocalPoint = part.userData.endLeadLocalPoint;

  if (!startHandle || !endHandle || !startLeadLocalPoint || !endLeadLocalPoint) {
    return;
  }

  startHandle.position.copy(startLeadLocalPoint);
  startHandle.position.x *= scaleX;
  endHandle.position.copy(endLeadLocalPoint);
  endHandle.position.x *= scaleX;
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

  const startLeadLocalPoint = new THREE.Vector3(
    definition.leadPoints?.[0]?.x ?? 0,
    definition.leadPoints?.[0]?.y ?? 0,
    definition.leadPoints?.[0]?.z ?? 0
  ).applyEuler(tempPartEuler);
  const endLeadLocalPoint = new THREE.Vector3(
    definition.leadPoints?.[1]?.x ?? 0,
    definition.leadPoints?.[1]?.y ?? 0,
    definition.leadPoints?.[1]?.z ?? 0
  ).applyEuler(tempPartEuler);

  const startHandle = createPartLeadHandle(0x40d6b1);
  const endHandle = createPartLeadHandle(0x7ed2ff);
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
  root.userData.startLeadLocalPoint = startLeadLocalPoint;
  root.userData.endLeadLocalPoint = endLeadLocalPoint;
  root.userData.startLeadPositionLocal = new THREE.Vector3();
  root.userData.endLeadPositionLocal = new THREE.Vector3();
  root.userData.startSnappedTarget = null;
  root.userData.endSnappedTarget = null;
  root.userData.leadScaleX = 1;

  root.userData.startHitArea.userData.part = root;
  root.userData.startHitArea.userData.endKey = 'start';
  root.userData.startHitArea.userData.interactionType = 'partLead';
  root.userData.endHitArea.userData.part = root;
  root.userData.endHitArea.userData.endKey = 'end';
  root.userData.endHitArea.userData.interactionType = 'partLead';

  updatePartLeadHandlePositions(root);

  return root;
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

  const leadScaleX = THREE.MathUtils.clamp(worldLeadLength / localLeadLength, 0.35, 4);
  part.userData.leadScaleX = leadScaleX;
  contentRoot.scale.set(leadScaleX, 1, 1);

  tempPartScaledLeadPoint.copy(startLeadLocalPoint);
  tempPartScaledLeadPoint.x *= leadScaleX;
  tempPartScaledLeadPoint.applyQuaternion(part.quaternion);

  part.position.copy(startLeadPositionLocal).sub(tempPartScaledLeadPoint);
  updatePartLeadHandlePositions(part);

  return true;
}

function updatePartPlacementPreviewTransform(part, worldPoint) {
  if (!breadboardPartsRoot || !part) {
    return false;
  }

  tempPartLocalPoint.copy(worldPoint);
  breadboardPartsRoot.worldToLocal(tempPartLocalPoint);

  tempPartLeadPointA
    .copy(part.userData.startLeadLocalPoint)
    .add(part.userData.endLeadLocalPoint)
    .multiplyScalar(0.5);

  part.userData.startLeadPositionLocal
    .copy(tempPartLocalPoint)
    .add(tempPartScaledLeadPoint.copy(part.userData.startLeadLocalPoint).sub(tempPartLeadPointA));
  part.userData.endLeadPositionLocal
    .copy(tempPartLocalPoint)
    .add(tempPartScaledLeadPointB.copy(part.userData.endLeadLocalPoint).sub(tempPartLeadPointA));

  part.userData.startLeadPositionLocal.y = 0;
  part.userData.endLeadPositionLocal.y = 0;
  part.userData.startSnappedTarget = null;
  part.userData.endSnappedTarget = null;

  return updateInteractivePartTransform(part);
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
  partDragState.active = true;
  partDragState.pointerId = event.pointerId;
  partDragState.definitionKey = definitionKey;
  partDragState.previewPart = previewPart;
  partDragState.placementValid = false;
  partDragState.clientX = event.clientX;
  partDragState.clientY = event.clientY;
  wireState.hoveredWire = null;
  wireState.hoveredEnd = null;
  breadboardPartsRoot.add(previewPart);
  previewPart.visible = false;
  document.body.classList.add('is-dragging');

  updateStatusForState();
  updateCanvasCursor();
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
    placedParts.push(placedPart);
    setStatus(`Placed the ${definition?.statusLabel ?? 'part'} on the breadboard.`);
  } else {
    updateStatusForState();
  }

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
  } else {
    part.userData.endSnappedTarget = null;
  }

  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
  document.body.classList.add('is-dragging');

  updateStatusForState();
  updateCanvasCursor();
  refreshTargetVisuals();
}

function finishPartLeadDrag(event) {
  const part = partLeadState.activePart;

  if (!partLeadState.dragging || !part) {
    return;
  }

  const draggedEnd = partLeadState.draggedEnd;
  partLeadState.dragging = false;

  if (partLeadState.hoveredTarget) {
    tempPartLocalPoint.copy(partLeadState.hoveredTarget.userData.worldPosition);
    breadboardPartsRoot.worldToLocal(tempPartLocalPoint);

    if (draggedEnd === 'start') {
      part.userData.startSnappedTarget = partLeadState.hoveredTarget;
      part.userData.startLeadPositionLocal.copy(tempPartLocalPoint);
    } else {
      part.userData.endSnappedTarget = partLeadState.hoveredTarget;
      part.userData.endLeadPositionLocal.copy(tempPartLocalPoint);
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
  refreshTargetVisuals();
  updateStatusForState();
  updateCanvasCursor();
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
  const distance = (maxDimension / (2 * Math.tan(fov / 2))) * 1.5;

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

  setCanvasCursor(wireState.hoveredWire || partLeadState.hoveredPart ? 'grab' : 'default');
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
  updateStatusForState();
  updateCanvasCursor();
  updateWireGeometry(wire);
}

function onPointerDown(event) {
  if (partDragState.active) {
    return;
  }

  const hitAreas = [...getAllWireHitAreas(), ...getAllPartLeadHitAreas()];

  if (hitAreas.length === 0) {
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(hitAreas, false);
  if (intersections.length > 0) {
    const { wire, part, endKey, interactionType } = intersections[0].object.userData;

    if (interactionType === 'partLead' && part && endKey) {
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
    partLeadState.hoveredTarget = nearestTarget;

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
    [...getAllWireHitAreas(), ...getAllPartLeadHitAreas()],
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

  if (partLeadState.dragging) {
    finishPartLeadDrag(event);
    return;
  }

  finishDrag(event);
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

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
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
