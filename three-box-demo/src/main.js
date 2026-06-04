import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ARDUINO_PIN_LABEL = 'D7';
const BREADBOARD_PITCH = 2.54;
const SNAP_DISTANCE = 4.4;
const CABLE_EXIT_OFFSET = 14.85;
const CABLE_RADIUS = 0.9;
const DEG_TO_RAD = Math.PI / 180;
const POSITION_LIMIT = 220;
const SURFACE_SIZE_LIMIT = 220;
const BREADBOARD_TERMINAL_COLUMNS = 30;
const BREADBOARD_LEFT_ROW_LABELS = ['A', 'B', 'C', 'D', 'E'];
const BREADBOARD_RIGHT_ROW_LABELS = ['F', 'G', 'H', 'I', 'J'];
const BREADBOARD_ROW_GAP_HALF = BREADBOARD_PITCH * 1.5;
const BREADBOARD_COLUMN_START = -BREADBOARD_PITCH * ((BREADBOARD_TERMINAL_COLUMNS - 1) / 2);
const BREADBOARD_LEFT_ROW_START =
  -BREADBOARD_ROW_GAP_HALF - BREADBOARD_PITCH * (BREADBOARD_LEFT_ROW_LABELS.length - 1);
const BREADBOARD_RIGHT_ROW_START = BREADBOARD_ROW_GAP_HALF;
const BREADBOARD_SURFACE_BASE_WIDTH =
  (BREADBOARD_RIGHT_ROW_START + BREADBOARD_PITCH * (BREADBOARD_RIGHT_ROW_LABELS.length - 1)) -
  BREADBOARD_LEFT_ROW_START +
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
const DRAG_SURFACE_KEYS = {
  start: ['arduinoHeaderLeft', 'arduinoHeaderRight'],
  end: ['breadboardSurface'],
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

const appShell = document.createElement('div');
appShell.className = 'app-shell';
document.body.appendChild(appShell);

const hud = document.createElement('aside');
hud.className = 'hud';
hud.innerHTML = `
  <p class="eyebrow">Uno Simulator</p>
  <h1>Drag The Dupont Wire</h1>
  <p class="instruction">Grab either glowing wire plug and drop it onto an Arduino or breadboard hole. Use the debug panel to tune object positions and rotations.</p>
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

const debugSectionsRoot = debugPanel.querySelector('[data-debug-sections]');
const copyRotationsButton = debugPanel.querySelector('[data-action="copy"]');
const resetRotationsButton = debugPanel.querySelector('[data-action="reset"]');

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

let arduino = null;
let breadboard = null;
let arduinoRigRoot = null;
let breadboardRigRoot = null;
let arduinoHeaderLeft = null;
let arduinoHeaderRight = null;
let breadboardSurface = null;
const surfaceGuides = new Map();
let startAnchor = null;
let wireStartPlug = null;
let startPlugHitArea = null;
let endPlug = null;
let endPlugHitArea = null;
let cableMesh = null;
let arduinoTargets = [];
let breadboardTargets = [];
let wireAssembly = null;

const wireState = {
  dragging: false,
  draggedEnd: null,
  hoveredHandle: null,
  hoveredTarget: null,
  startSnappedTarget: null,
  endSnappedTarget: null,
  startSurfaceKey: 'arduinoHeaderLeft',
  endSurfaceKey: 'breadboardSurface',
  startTip: new THREE.Vector3(),
  endTip: new THREE.Vector3(),
};

buildTransformDebugPanel();

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

function getSurfaceKeyForEnd(endKey) {
  return endKey === 'start' ? wireState.startSurfaceKey : wireState.endSurfaceKey;
}

function setSurfaceKeyForEnd(endKey, surfaceKey) {
  if (endKey === 'start') {
    wireState.startSurfaceKey = surfaceKey;
    return;
  }

  wireState.endSurfaceKey = surfaceKey;
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

function getClampedDragPointForEnd(endKey, ray, output) {
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
    const fallbackSurfaceKey = getSurfaceKeyForEnd(endKey);

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
  if (!startAnchor) {
    return;
  }

  // D7 currently lives on the calibrated left header strip, so the snap
  // target needs to inherit that surface normal for plug aiming and dragging.
  if (arduinoHeaderLeft) {
    startAnchor.quaternion.copy(arduinoHeaderLeft.quaternion);
  }
}

function updateArduinoDragPlane() {
  if (arduinoTargets.length === 0) {
    return;
  }

  if (!(wireState.dragging && wireState.draggedEnd === 'start' && wireState.hoveredTarget)) {
    const surfaceKey = getSurfaceKeyForEnd('start');

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
      : wireState.startSnappedTarget ?? arduinoTargets[0];

  getTargetWorldNormal(planeTarget, tempBreadboardNormal);
  arduinoDragPlane.setFromNormalAndCoplanarPoint(
    tempBreadboardNormal,
    planeTarget.userData.worldPosition
  );
}

function updateBreadboardDragPlane() {
  if (breadboardTargets.length === 0) {
    return;
  }

  if (!(wireState.dragging && wireState.draggedEnd === 'end' && wireState.hoveredTarget)) {
    const surfaceKey = getSurfaceKeyForEnd('end');

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
      : wireState.endSnappedTarget ?? breadboardTargets[Math.floor(breadboardTargets.length / 2)];

  getTargetWorldNormal(planeTarget, tempBreadboardNormal);
  breadboardDragPlane.setFromNormalAndCoplanarPoint(
    tempBreadboardNormal,
    planeTarget.userData.worldPosition
  );
}

function getPlugSurfaceNormal(endKey, output) {
  const isDraggingThisEnd = wireState.dragging && wireState.draggedEnd === endKey;
  const hoveredTarget = isDraggingThisEnd ? wireState.hoveredTarget : null;
  const snappedTarget = endKey === 'start' ? wireState.startSnappedTarget : wireState.endSnappedTarget;
  const surfaceKey = getSurfaceKeyForEnd(endKey);
  const fallbackTarget = endKey === 'start' ? arduinoTargets[0] : breadboardTargets[0];

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

  if (wireState.startSnappedTarget) {
    wireState.startTip.copy(wireState.startSnappedTarget.userData.worldPosition);
  }

  if (wireState.endSnappedTarget) {
    wireState.endTip.copy(wireState.endSnappedTarget.userData.worldPosition);
  }

  if (cableMesh && endPlug) {
    updateWireGeometry();
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
  const visible = active || snapped;
  const color = snapped ? 0xff8b2b : active ? 0x5aa7ff : 0xcfd8e3;

  marker.visible = visible;
  halo.visible = visible;

  if (!visible) {
    return;
  }

  marker.userData.ring.material.color.setHex(color);
  marker.userData.ring.material.emissive.setHex(color);
  marker.userData.core.material.emissive.setHex(color);
  marker.scale.setScalar(snapped ? 1.28 : active ? 1.14 : 0.94);

  halo.material.color.setHex(color);
  halo.material.opacity = snapped ? 0.34 : active ? 0.24 : 0.1;
  halo.scale.setScalar(snapped ? 1.18 : active ? 1.08 : 0.92);
}

function refreshTargetVisuals() {
  for (const target of [...arduinoTargets, ...breadboardTargets]) {
    const active = target === wireState.hoveredTarget;
    const snapped =
      target === wireState.startSnappedTarget || target === wireState.endSnappedTarget;
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

function createWireAssembly() {
  const group = new THREE.Group();

  const startPlug = createDupontPlug(true);
  const freePlug = createDupontPlug(true);
  const cable = createCableMesh();

  group.add(cable, startPlug, freePlug);

  group.userData.startPlug = startPlug;
  group.userData.endPlug = freePlug;
  group.userData.cableMesh = cable;

  return group;
}

function cacheSnapTargetWorldPositions() {
  for (const target of [...arduinoTargets, ...breadboardTargets]) {
    target.userData.worldPosition = target.getWorldPosition(new THREE.Vector3());
  }
}

function updateHandleVisuals() {
  if (!wireStartPlug || !endPlug) {
    return;
  }

  const pulse = 1 + Math.sin(clock.getElapsedTime() * 4.25) * 0.06;
  const startHalo = wireStartPlug.userData.halo;
  const endHalo = endPlug.userData.halo;

  const startHighlighted =
    (wireState.dragging && wireState.draggedEnd === 'start') || wireState.hoveredHandle === 'start';
  const endHighlighted =
    (wireState.dragging && wireState.draggedEnd === 'end') || wireState.hoveredHandle === 'end';

  const startConnected = Boolean(wireState.startSnappedTarget);
  const endConnected = Boolean(wireState.endSnappedTarget);

  startHalo.material.color.setHex(startConnected ? 0xffb36a : 0x40d6b1);
  startHalo.material.emissive.setHex(startConnected ? 0xff8b2b : 0x40d6b1);
  startHalo.material.opacity = wireState.dragging && wireState.draggedEnd === 'start' ? 0.34 : startHighlighted ? 0.25 : 0.14;
  startHalo.scale.setScalar((startConnected ? 1.1 : 1) * pulse);

  endHalo.material.color.setHex(endConnected ? 0xffb36a : 0x7ed2ff);
  endHalo.material.emissive.setHex(endConnected ? 0xff8b2b : 0x7ed2ff);
  endHalo.material.opacity = wireState.dragging && wireState.draggedEnd === 'end' ? 0.34 : endHighlighted ? 0.25 : 0.14;
  endHalo.scale.setScalar((endConnected ? 1.1 : 1) * pulse);
}

function updateStatusForState() {
  if (wireState.dragging && wireState.hoveredTarget) {
    const destination =
      wireState.draggedEnd === 'start'
        ? `Arduino ${wireState.hoveredTarget.userData.label}`
        : `breadboard ${wireState.hoveredTarget.userData.label}`;
    setStatus(`Release to connect the ${wireState.draggedEnd} plug to ${destination}.`);
    return;
  }

  if (wireState.dragging) {
    const destination =
      wireState.draggedEnd === 'start'
        ? 'the Arduino pin hole'
        : 'a glowing breadboard hole';
    setStatus(`Release over ${destination} to snap the wire into place.`);
    return;
  }

  if (wireState.startSnappedTarget && wireState.endSnappedTarget) {
    setStatus(
      `Connected: Arduino ${wireState.startSnappedTarget.userData.label} -> breadboard ${wireState.endSnappedTarget.userData.label}.`
    );
    return;
  }

  if (wireState.startSnappedTarget) {
    setStatus('Ready: drag either wire plug to reposition the connection.');
    return;
  }

  setStatus('Ready: drag either wire plug to the Arduino or breadboard hole you want.');
}

function updateWireGeometry() {
  if (!cableMesh || !wireStartPlug || !endPlug) {
    return;
  }

  copyStateToVector(positionState.wire, tempWireOffset);

  const startTip = tempStartTip.copy(wireState.startTip).add(tempWireOffset);
  const endTip = tempEndTip.copy(wireState.endTip).add(tempWireOffset);
  const startNormal = getPlugSurfaceNormal('start', tempNormal);
  const endNormal = getPlugSurfaceNormal('end', tempNormalB);

  wireStartPlug.position.copy(startTip);
  // Each plug should stand off from the board surface; the cable then bends
  // between the strain-relief exits instead of deciding the plug direction.
  wireStartPlug.quaternion.setFromUnitVectors(startPlugSurfaceAxis, startNormal);
  wireStartPlug.quaternion.multiply(wireStartRotationOffset);

  endPlug.position.copy(endTip);
  endPlug.quaternion.setFromUnitVectors(endPlugSurfaceAxis, endNormal);
  endPlug.quaternion.multiply(wireEndRotationOffset);

  tempCableStart.set(0, CABLE_EXIT_OFFSET, 0);
  wireStartPlug.localToWorld(tempCableStart);
  tempCableEnd.set(0, CABLE_EXIT_OFFSET, 0);
  endPlug.localToWorld(tempCableEnd);

  const cableDistance = tempCableStart.distanceTo(tempCableEnd);
  const lift = THREE.MathUtils.clamp(cableDistance * 0.18, 8, 24);
  tempAverageNormal.copy(startNormal).add(endNormal);

  if (tempAverageNormal.lengthSq() < 1e-6) {
    tempAverageNormal.copy(upAxis);
  } else {
    tempAverageNormal.normalize();
  }

  tempControlA
    .lerpVectors(tempCableStart, tempCableEnd, 0.33)
    .addScaledVector(tempAverageNormal, lift);
  tempControlB
    .lerpVectors(tempCableStart, tempCableEnd, 0.66)
    .addScaledVector(tempAverageNormal, lift * 0.88);

  const curve = new THREE.CatmullRomCurve3([
    tempCableStart.clone(),
    tempControlA.clone(),
    tempControlB.clone(),
    tempCableEnd.clone(),
  ]);

  const nextGeometry = new THREE.TubeGeometry(curve, 42, CABLE_RADIUS, 14, false);
  cableMesh.geometry.dispose();
  cableMesh.geometry = nextGeometry;
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
  if (wireState.dragging) {
    setCanvasCursor('grabbing');
    return;
  }

  setCanvasCursor(wireState.hoveredHandle ? 'grab' : 'default');
}

function beginDrag(event, draggedEnd) {
  event.preventDefault();
  wireState.dragging = true;
  wireState.draggedEnd = draggedEnd;
  wireState.hoveredHandle = null;
  wireState.hoveredTarget = null;

  if (draggedEnd === 'start') {
    wireState.startSnappedTarget = null;
  } else {
    wireState.endSnappedTarget = null;
  }

  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
  document.body.classList.add('is-dragging');

  updateStatusForState();
  updateCanvasCursor();
  refreshTargetVisuals();
}

function finishDrag(event) {
  if (!wireState.dragging) {
    return;
  }

  const draggedEnd = wireState.draggedEnd;
  wireState.dragging = false;

  if (wireState.hoveredTarget) {
    if (draggedEnd === 'start') {
      wireState.startSnappedTarget = wireState.hoveredTarget;
      wireState.startTip.copy(wireState.hoveredTarget.userData.worldPosition);
    } else {
      wireState.endSnappedTarget = wireState.hoveredTarget;
      wireState.endTip.copy(wireState.hoveredTarget.userData.worldPosition);
    }

    if (wireState.hoveredTarget.userData.surfaceKey) {
      setSurfaceKeyForEnd(draggedEnd, wireState.hoveredTarget.userData.surfaceKey);
    }
  }

  wireState.draggedEnd = null;
  controls.enabled = true;
  document.body.classList.remove('is-dragging');

  if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }

  refreshTargetVisuals();
  updateStatusForState();
  updateCanvasCursor();
  updateWireGeometry();
}

function onPointerDown(event) {
  if (!startPlugHitArea || !endPlugHitArea) {
    return;
  }

  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects([startPlugHitArea, endPlugHitArea], false);
  if (intersections.length > 0) {
    const draggedEnd =
      intersections[0].object === startPlugHitArea ? 'start' : 'end';
    beginDrag(event, draggedEnd);
  }
}

function onPointerMove(event) {
  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  if (wireState.dragging) {
    const clampedSurfaceKey = getClampedDragPointForEnd(
      wireState.draggedEnd,
      raycaster.ray,
      tempPoint
    );

    if (clampedSurfaceKey) {
      setSurfaceKeyForEnd(wireState.draggedEnd, clampedSurfaceKey);

      const dragPoint = tempPointB.copy(tempPoint).sub(
        copyStateToVector(positionState.wire, tempWireOffset)
      );
      const availableTargets =
        wireState.draggedEnd === 'start' ? arduinoTargets : breadboardTargets;
      const nearestTarget = findNearestTarget(dragPoint, availableTargets);
      wireState.hoveredTarget = nearestTarget;

      if (nearestTarget) {
        if (wireState.draggedEnd === 'start') {
          wireState.startTip.copy(nearestTarget.userData.worldPosition);
        } else {
          wireState.endTip.copy(nearestTarget.userData.worldPosition);
        }
      } else {
        if (wireState.draggedEnd === 'start') {
          wireState.startTip.copy(dragPoint);
        } else {
          wireState.endTip.copy(dragPoint);
        }
      }

      if (wireState.draggedEnd === 'start') {
        updateArduinoDragPlane();
      } else {
        updateBreadboardDragPlane();
      }

      updateWireGeometry();
      refreshTargetVisuals();
      updateStatusForState();
    }

    updateCanvasCursor();
    return;
  }

  const intersections = raycaster.intersectObjects([startPlugHitArea, endPlugHitArea], false);
  wireState.hoveredHandle =
    intersections.length === 0
      ? null
      : intersections[0].object === startPlugHitArea
        ? 'start'
        : 'end';
  updateCanvasCursor();
}

function onPointerUp(event) {
  finishDrag(event);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function init() {
  const [arduinoGltf, breadboardGltf] = await Promise.all([
    loadModel('/models/uno_simulator/Arduino_Uno_R3.glb'),
    loadModel('/models/uno_simulator/Half-Size+Breadboard.glb'),
  ]);

  const arduinoModel = normalizeModel(arduinoGltf.scene);
  const breadboardModel = normalizeModel(breadboardGltf.scene);
  const arduinoRig = createRotationRig(arduinoModel, BASE_ROTATIONS.arduino);
  const breadboardRig = createRotationRig(breadboardModel, BASE_ROTATIONS.breadboard);

  arduinoRigRoot = arduinoRig.root;
  breadboardRigRoot = breadboardRig.root;
  arduino = arduinoRig.adjustment;
  breadboard = breadboardRig.adjustment;

  assembly.add(arduinoRigRoot, breadboardRigRoot);

  const arduinoSize = arduino.userData.size;
  const arduinoHeaderSurfaceY = arduinoSize.y - 2.8;
  const arduinoHeaderBaseX = arduinoSize.x * 0.02;
  const arduinoHeaderRowOffset = arduinoSize.z * 0.22;

  arduinoHeaderLeft = new THREE.Group();
  arduino.add(arduinoHeaderLeft);

  const arduinoHeaderLeftContent = new THREE.Group();
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
  surfaceGuides.set('arduinoHeaderLeft', arduinoHeaderLeftGuide);
  arduinoHeaderLeftContent.add(arduinoHeaderLeftGuide);

  arduinoHeaderRight = new THREE.Group();
  arduino.add(arduinoHeaderRight);

  const arduinoHeaderRightContent = new THREE.Group();
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
  surfaceGuides.set('arduinoHeaderRight', arduinoHeaderRightGuide);
  arduinoHeaderRightContent.add(arduinoHeaderRightGuide);

  startAnchor = createSnapTarget(ARDUINO_PIN_LABEL);
  startAnchor.position.set(
    arduinoSize.x * 0.18,
    arduinoSize.y - 2.8,
    -arduinoSize.z * 0.2
  );
  startAnchor.userData.surfaceKey = 'arduinoHeaderLeft';
  arduino.add(startAnchor);
  arduinoTargets = [startAnchor];

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
  surfaceGuides.set('breadboardSurface', breadboardSurfaceGuide);
  breadboardSurfaceContent.add(breadboardSurfaceGuide);

  breadboardTargets = [];
  for (let rowIndex = 0; rowIndex < BREADBOARD_TERMINAL_COLUMNS; rowIndex += 1) {
    const z = BREADBOARD_COLUMN_START + rowIndex * BREADBOARD_PITCH;

    for (let columnIndex = 0; columnIndex < BREADBOARD_LEFT_ROW_LABELS.length; columnIndex += 1) {
      const target = createSnapTarget(`${BREADBOARD_LEFT_ROW_LABELS[columnIndex]}${rowIndex + 1}`);
      target.position.set(
        BREADBOARD_LEFT_ROW_START + columnIndex * BREADBOARD_PITCH,
        0,
        z
      );
      target.userData.surfaceKey = 'breadboardSurface';
      breadboardSurfaceContent.add(target);
      breadboardTargets.push(target);
    }

    for (let columnIndex = 0; columnIndex < BREADBOARD_RIGHT_ROW_LABELS.length; columnIndex += 1) {
      const target = createSnapTarget(`${BREADBOARD_RIGHT_ROW_LABELS[columnIndex]}${rowIndex + 1}`);
      target.position.set(
        BREADBOARD_RIGHT_ROW_START + columnIndex * BREADBOARD_PITCH,
        0,
        z
      );
      target.userData.surfaceKey = 'breadboardSurface';
      breadboardSurfaceContent.add(target);
      breadboardTargets.push(target);
    }
  }

  wireAssembly = createWireAssembly();
  assembly.add(wireAssembly);

  wireStartPlug = wireAssembly.userData.startPlug;
  startPlugHitArea = wireStartPlug.userData.hitArea;
  cableMesh = wireAssembly.userData.cableMesh;
  endPlug = wireAssembly.userData.endPlug;
  endPlugHitArea = endPlug.userData.hitArea;

  wireState.startSnappedTarget = startAnchor;
  applyDebugTransforms();

  let defaultTarget = breadboardTargets[0];
  let nearestDistance = Infinity;

  for (const target of breadboardTargets) {
    const distance = wireState.startTip.distanceTo(target.userData.worldPosition);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      defaultTarget = target;
    }
  }

  wireState.endTip.copy(defaultTarget.userData.worldPosition);
  getTargetWorldNormal(defaultTarget, tempBreadboardNormal);
  wireState.endTip.addScaledVector(tempBreadboardNormal, 10);
  wireState.endTip.addScaledVector(
    tempDirection.set(0, 0, 1).transformDirection(defaultTarget.matrixWorld),
    3.5
  );

  updateBreadboardDragPlane();

  refreshTargetVisuals();
  updateWireGeometry();
  updateHandleVisuals();
  updateStatusForState();
  frameScene(assembly);

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
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
