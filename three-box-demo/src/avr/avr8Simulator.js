import {
  avrInstruction,
  AVRADC,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  CPU,
  PinState,
  adcConfig,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from 'avr8js';

const FLASH_SIZE = 0x8000;
const DEFAULT_CLOCK_SPEED_HZ = 16e6;
const DEFAULT_WORK_UNIT_CYCLES = 500000;
const DEFAULT_UPDATE_INTERVAL_MS = 50;
const SERIAL_OUTPUT_MAX_LENGTH = 12000;
const MAX_ANALOG_VOLTAGE = 5;
const MAX_ANALOG_WRITE_VALUE = 255;
const MICROS_PER_SECOND = 1e6;
const SERVO_PULSE_MIN_HIGH_MICROS = 400;
const SERVO_PULSE_MAX_HIGH_MICROS = 2600;
const SERVO_PULSE_MIN_PERIOD_MICROS = 5000;
const SERVO_PULSE_MAX_PERIOD_MICROS = 50000;
const SERVO_PULSE_MAX_AGE_MICROS = 100000;
const BUZZER_TONE_MIN_FREQUENCY_HZ = 20;
const BUZZER_TONE_MAX_FREQUENCY_HZ = 20000;
const BUZZER_TONE_ACTIVE_MIN_FREQUENCY_HZ = 50;
const BUZZER_TONE_ACTIVE_MAX_FREQUENCY_HZ = 8000;
const BUZZER_TONE_MAX_AGE_MICROS = 200000;
const BUZZER_TONE_MIN_EDGE_SAMPLES = 2;
const BUZZER_TONE_SMOOTHING_SAMPLES = 8;

const PWM_WGM_MODES_BY_TIMER_BITS = {
  8: new Set([1, 3, 5, 7]),
  16: new Set([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 14, 15]),
};

const FAST_PWM_WGM_MODES_BY_TIMER_BITS = {
  8: new Set([3, 7]),
  16: new Set([5, 6, 7, 14, 15]),
};

export const ARDUINO_UNO_PIN_ORDER = [
  { name: 'D0', portKey: 'D', bit: 0 },
  { name: 'D1', portKey: 'D', bit: 1 },
  { name: 'D2', portKey: 'D', bit: 2 },
  { name: 'D3', portKey: 'D', bit: 3 },
  { name: 'D4', portKey: 'D', bit: 4 },
  { name: 'D5', portKey: 'D', bit: 5 },
  { name: 'D6', portKey: 'D', bit: 6 },
  { name: 'D7', portKey: 'D', bit: 7 },
  { name: 'D8', portKey: 'B', bit: 0 },
  { name: 'D9', portKey: 'B', bit: 1 },
  { name: 'D10', portKey: 'B', bit: 2 },
  { name: 'D11', portKey: 'B', bit: 3 },
  { name: 'D12', portKey: 'B', bit: 4 },
  { name: 'D13', portKey: 'B', bit: 5 },
  { name: 'A0', portKey: 'C', bit: 0 },
  { name: 'A1', portKey: 'C', bit: 1 },
  { name: 'A2', portKey: 'C', bit: 2 },
  { name: 'A3', portKey: 'C', bit: 3 },
  { name: 'A4', portKey: 'C', bit: 4 },
  { name: 'A5', portKey: 'C', bit: 5 },
];

export const ARDUINO_UNO_ANALOG_PIN_CHANNELS = Object.freeze({
  A0: 0,
  A1: 1,
  A2: 2,
  A3: 3,
  A4: 4,
  A5: 5,
});

const ARDUINO_UNO_PINS_BY_NAME = Object.freeze(
  Object.fromEntries(
    ARDUINO_UNO_PIN_ORDER.map((pinDefinition) => [pinDefinition.name, pinDefinition])
  )
);

const ARDUINO_UNO_PWM_PIN_TIMER_CHANNELS = Object.freeze({
  D3: { timerKey: 'timer2', channel: 'B' },
  D5: { timerKey: 'timer0', channel: 'B' },
  D6: { timerKey: 'timer0', channel: 'A' },
  D9: { timerKey: 'timer1', channel: 'A' },
  D10: { timerKey: 'timer1', channel: 'B' },
  D11: { timerKey: 'timer2', channel: 'A' },
});

const PIN_STATE_NAMES = {
  [PinState.Low]: 'low',
  [PinState.High]: 'high',
  [PinState.Input]: 'input',
  [PinState.InputPullUp]: 'input_pullup',
};

const clampAnalogVoltage = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(MAX_ANALOG_VOLTAGE, Math.max(0, numericValue));
};

const clampUnitInterval = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numericValue));
};

const cyclesToMicros = (cycles, clockSpeedHz) => {
  const numericCycles = Number(cycles);
  const numericClockSpeed = Number(clockSpeedHz);

  if (
    !Number.isFinite(numericCycles) ||
    !Number.isFinite(numericClockSpeed) ||
    numericClockSpeed <= 0
  ) {
    return null;
  }

  return (numericCycles * MICROS_PER_SECOND) / numericClockSpeed;
};

const averageNumbers = (values = []) => {
  const numericValues = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

const edgeIntervalCyclesToFrequencyHz = (edgeIntervalCycles, clockSpeedHz) => {
  const numericInterval = Number(edgeIntervalCycles);
  const numericClockSpeed = Number(clockSpeedHz);

  if (
    !Number.isFinite(numericInterval) ||
    numericInterval <= 0 ||
    !Number.isFinite(numericClockSpeed) ||
    numericClockSpeed <= 0
  ) {
    return null;
  }

  return numericClockSpeed / (2 * numericInterval);
};

const isAudibleEdgeIntervalCycles = (edgeIntervalCycles, clockSpeedHz) => {
  const frequencyHz = edgeIntervalCyclesToFrequencyHz(edgeIntervalCycles, clockSpeedHz);

  return Number.isFinite(frequencyHz) &&
    frequencyHz >= BUZZER_TONE_MIN_FREQUENCY_HZ &&
    frequencyHz <= BUZZER_TONE_MAX_FREQUENCY_HZ;
};

const recordPassiveToneEdge = (tracker, currentCycles, clockSpeedHz) => {
  if (!tracker) {
    return;
  }

  if (
    !Number.isFinite(tracker.lastEdgeCycles) ||
    !Number.isFinite(currentCycles) ||
    currentCycles <= tracker.lastEdgeCycles
  ) {
    tracker.lastEdgeCycles = currentCycles;
    return;
  }

  const edgeIntervalCycles = currentCycles - tracker.lastEdgeCycles;
  tracker.lastEdgeCycles = currentCycles;

  if (!isAudibleEdgeIntervalCycles(edgeIntervalCycles, clockSpeedHz)) {
    tracker.estimatedToneFrequencyHz = null;
    tracker.recentEdgeIntervalsCycles = [];
    return;
  }

  tracker.recentEdgeIntervalsCycles.push(edgeIntervalCycles);

  if (tracker.recentEdgeIntervalsCycles.length > BUZZER_TONE_SMOOTHING_SAMPLES) {
    tracker.recentEdgeIntervalsCycles.shift();
  }

  tracker.estimatedToneFrequencyHz = edgeIntervalCyclesToFrequencyHz(
    averageNumbers(tracker.recentEdgeIntervalsCycles),
    clockSpeedHz
  );
};

const isServoLikePulseSnapshot = ({ highMicros, periodMicros }) => {
  if (!Number.isFinite(highMicros)) {
    return false;
  }

  if (
    highMicros < SERVO_PULSE_MIN_HIGH_MICROS ||
    highMicros > SERVO_PULSE_MAX_HIGH_MICROS
  ) {
    return false;
  }

  if (
    Number.isFinite(periodMicros) &&
    (
      periodMicros < SERVO_PULSE_MIN_PERIOD_MICROS ||
      periodMicros > SERVO_PULSE_MAX_PERIOD_MICROS
    )
  ) {
    return false;
  }

  return true;
};

const readRegisterValue = (cpu, address, bits = 8) => {
  if (!Number.isInteger(address) || address < 0) {
    return 0;
  }

  if (bits === 16) {
    return cpu.data[address] | (cpu.data[address + 1] << 8);
  }

  return cpu.data[address];
};

const readTimerCompareValue = (cpu, timerConfig, channel) => {
  const registerAddress = timerConfig?.[channel === 'A' ? 'OCRA' : 'OCRB'];
  const timerBits = Number(timerConfig?.bits) === 16 ? 16 : 8;

  return readRegisterValue(cpu, registerAddress, timerBits);
};

const isPwmWgmMode = (timerConfig, wgm) => (
  PWM_WGM_MODES_BY_TIMER_BITS[Number(timerConfig?.bits) === 16 ? 16 : 8]?.has(wgm)
);

const isFastPwmWgmMode = (timerConfig, wgm) => (
  FAST_PWM_WGM_MODES_BY_TIMER_BITS[Number(timerConfig?.bits) === 16 ? 16 : 8]?.has(wgm)
);

const getPwmCompareMode = (timer, channel) => {
  const shift = channel === 'A' ? 6 : 4;
  return (timer.TCCRA >> shift) & 0x3;
};

const resolvePwmHighRatio = ({
  compareMode,
  compareValue,
  isFastPwmMode,
  topValue,
}) => {
  if (compareMode !== 2 && compareMode !== 3) {
    return null;
  }

  const normalizedTop = Number(topValue);

  if (!Number.isFinite(normalizedTop) || normalizedTop <= 0) {
    return compareMode === 3 ? 1 : 0;
  }

  if (compareValue <= 0) {
    return compareMode === 3 ? 1 : 0;
  }

  if (compareValue >= normalizedTop) {
    return compareMode === 3 ? 0 : 1;
  }

  const baseRatio = isFastPwmMode
    ? clampUnitInterval((compareValue + 1) / (normalizedTop + 1))
    : clampUnitInterval(compareValue / normalizedTop);

  return compareMode === 3
    ? clampUnitInterval(1 - baseRatio)
    : baseRatio;
};

const createAnalogOutputSnapshot = (cpu, portsByKey, timersByKey) => {
  const analogOutputsByPinName = {};

  Object.entries(ARDUINO_UNO_PWM_PIN_TIMER_CHANNELS).forEach(([pinName, pwmConfig]) => {
    const pinDefinition = ARDUINO_UNO_PINS_BY_NAME[pinName];
    const timerRecord = timersByKey?.[pwmConfig.timerKey];
    const port = pinDefinition ? portsByKey?.[pinDefinition.portKey] : null;
    const ddrRegisterAddress = port?.portConfig?.DDR;
    const ddrRegisterValue = Number.isInteger(ddrRegisterAddress)
      ? cpu.data[ddrRegisterAddress]
      : 0;

    if (!pinDefinition || !timerRecord || !port || !(ddrRegisterValue & (1 << pinDefinition.bit))) {
      return;
    }

    const compareMode = getPwmCompareMode(timerRecord.instance, pwmConfig.channel);
    const wgm = Number(timerRecord.instance.WGM);

    if (!isPwmWgmMode(timerRecord.config, wgm)) {
      return;
    }

    const highRatio = resolvePwmHighRatio({
      compareMode,
      compareValue: readTimerCompareValue(cpu, timerRecord.config, pwmConfig.channel),
      isFastPwmMode: isFastPwmWgmMode(timerRecord.config, wgm),
      topValue: timerRecord.instance.TOP,
    });

    if (highRatio === null) {
      return;
    }

    const dutyCycle = clampUnitInterval(highRatio);

    analogOutputsByPinName[pinName] = {
      channel: pwmConfig.channel,
      dutyCycle,
      enabled: true,
      pinName,
      timerKey: pwmConfig.timerKey,
      value: Math.round(dutyCycle * MAX_ANALOG_WRITE_VALUE),
      voltage: dutyCycle * MAX_ANALOG_VOLTAGE,
      wgm,
    };
  });

  return analogOutputsByPinName;
};

const createServoPulseSnapshot = (pulseTrackingByPinName, currentCycles, clockSpeedHz) => {
  const pulseOutputsByPinName = {};

  Object.entries(pulseTrackingByPinName || {}).forEach(([pinName, tracker]) => {
    const lastActivityCycles = Number(
      tracker?.lastPulseCompletedAtCycles ??
      tracker?.lastRisingCycles ??
      tracker?.highStartCycles
    );
    const ageMicros = cyclesToMicros(currentCycles - lastActivityCycles, clockSpeedHz);

    if (
      !Number.isFinite(lastActivityCycles) ||
      !Number.isFinite(ageMicros) ||
      ageMicros > SERVO_PULSE_MAX_AGE_MICROS
    ) {
      return;
    }

    const completedHighCycles = Number(tracker?.lastPulseHighCycles);
    const activeHighCycles = Number(tracker?.highStartCycles);
    const highCycles = Number.isFinite(completedHighCycles)
      ? completedHighCycles
      : Number.isFinite(activeHighCycles)
        ? Math.max(0, currentCycles - activeHighCycles)
        : null;
    const highMicros = cyclesToMicros(highCycles, clockSpeedHz);
    const periodMicros = cyclesToMicros(tracker?.lastPeriodCycles, clockSpeedHz);

    if (!isServoLikePulseSnapshot({ highMicros, periodMicros })) {
      return;
    }

    pulseOutputsByPinName[pinName] = {
      detected: true,
      highMicros,
      pinName,
      periodMicros: Number.isFinite(periodMicros) ? periodMicros : null,
      ageMicros,
    };
  });

  return pulseOutputsByPinName;
};

const createPassiveToneSnapshot = (pulseTrackingByPinName, currentCycles, clockSpeedHz) => {
  const toneOutputsByPinName = {};

  Object.entries(pulseTrackingByPinName || {}).forEach(([pinName, tracker]) => {
    const lastEdgeCycles = Number(tracker?.lastEdgeCycles);
    const estimatedFrequencyHz = Number(tracker?.estimatedToneFrequencyHz);
    const ageMicros = cyclesToMicros(currentCycles - lastEdgeCycles, clockSpeedHz);
    const sampleCount = Array.isArray(tracker?.recentEdgeIntervalsCycles)
      ? tracker.recentEdgeIntervalsCycles.length
      : 0;

    if (
      !Number.isFinite(lastEdgeCycles) ||
      !Number.isFinite(ageMicros) ||
      ageMicros > BUZZER_TONE_MAX_AGE_MICROS ||
      sampleCount < BUZZER_TONE_MIN_EDGE_SAMPLES ||
      !Number.isFinite(estimatedFrequencyHz) ||
      estimatedFrequencyHz < BUZZER_TONE_ACTIVE_MIN_FREQUENCY_HZ ||
      estimatedFrequencyHz > BUZZER_TONE_ACTIVE_MAX_FREQUENCY_HZ
    ) {
      return;
    }

    toneOutputsByPinName[pinName] = {
      ageMicros,
      detected: true,
      edgeSampleCount: sampleCount,
      frequencyHz: estimatedFrequencyHz,
      pinName,
    };
  });

  return toneOutputsByPinName;
};

const loadHex = (source, target) => {
  for (const rawLine of String(source || '').split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line[0] !== ':' || line.slice(7, 9) !== '00') {
      continue;
    }

    const byteCount = Number.parseInt(line.slice(1, 3), 16);
    const address = Number.parseInt(line.slice(3, 7), 16);

    for (let index = 0; index < byteCount; index += 1) {
      target[address + index] = Number.parseInt(
        line.slice(9 + (index * 2), 11 + (index * 2)),
        16
      );
    }
  }
};

const formatSimulationTime = (seconds) => {
  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '0 ms';
  }

  if (totalSeconds < 1) {
    return `${Math.round(totalSeconds * 1000)} ms`;
  }

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)} s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds - (minutes * 60);
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
};

const toSnapshotState = (
  pinState,
  sampledHigh,
  analogOutput = null,
  servoPulseOutput = null,
  passiveToneOutput = null
) => {
  const normalizedMode = PIN_STATE_NAMES[pinState] || 'unknown';
  const isOutput = normalizedMode === 'high' || normalizedMode === 'low';
  const pwmEnabled = Boolean(analogOutput?.enabled);
  const logicLevel = sampledHigh ? 'high' : 'low';
  const normalizedState = pwmEnabled
    ? `pwm_${logicLevel}`
    : isOutput
      ? normalizedMode
      : `${normalizedMode}_${logicLevel}`;
  const outputVoltageRatio = pwmEnabled
    ? clampUnitInterval(analogOutput?.dutyCycle)
    : isOutput
      ? (normalizedMode === 'high' ? 1 : 0)
      : null;

  return {
    rawState: pinState,
    mode: pwmEnabled ? 'pwm' : normalizedMode,
    logicLevel,
    sampledHigh,
    state: normalizedState,
    isHigh: isOutput ? normalizedMode === 'high' : sampledHigh,
    isOutput,
    outputMode: isOutput ? (pwmEnabled ? 'pwm' : 'digital') : 'input',
    outputVoltageRatio,
    averageVoltage: outputVoltageRatio === null
      ? null
      : outputVoltageRatio * MAX_ANALOG_VOLTAGE,
    pwmChannel: pwmEnabled ? analogOutput.channel : '',
    pwmDutyCycle: pwmEnabled ? outputVoltageRatio : null,
    pwmEnabled,
    pwmTimer: pwmEnabled ? analogOutput.timerKey : '',
    pwmValue: pwmEnabled ? analogOutput.value : null,
    servoPulseAgeMicros: servoPulseOutput?.detected ? servoPulseOutput.ageMicros : null,
    servoPulseDetected: Boolean(servoPulseOutput?.detected),
    servoPulseHighMicros: servoPulseOutput?.detected ? servoPulseOutput.highMicros : null,
    servoPulsePeriodMicros: servoPulseOutput?.detected ? servoPulseOutput.periodMicros : null,
    toneAgeMicros: passiveToneOutput?.detected ? passiveToneOutput.ageMicros : null,
    toneDetected: Boolean(passiveToneOutput?.detected),
    toneEdgeSampleCount: passiveToneOutput?.detected ? passiveToneOutput.edgeSampleCount : 0,
    toneFrequencyHz: passiveToneOutput?.detected ? passiveToneOutput.frequencyHz : null,
  };
};

const createPinSnapshot = (
  cpu,
  portsByKey,
  analogOutputsByPinName = {},
  servoPulseOutputsByPinName = {},
  passiveToneOutputsByPinName = {}
) => {
  const pinStates = {};

  for (const pinDefinition of ARDUINO_UNO_PIN_ORDER) {
    const port = portsByKey[pinDefinition.portKey];
    const pinRegisterAddress = port?.portConfig?.PIN;
    const pinRegisterValue = Number.isInteger(pinRegisterAddress)
      ? cpu.data[pinRegisterAddress]
      : 0;
    const sampledHigh = Boolean(pinRegisterValue & (1 << pinDefinition.bit));
    const state = toSnapshotState(
      port.pinState(pinDefinition.bit),
      sampledHigh,
      analogOutputsByPinName[pinDefinition.name] || null,
      servoPulseOutputsByPinName[pinDefinition.name] || null,
      passiveToneOutputsByPinName[pinDefinition.name] || null
    );

    pinStates[pinDefinition.name] = {
      ...pinDefinition,
      ...state,
    };
  }

  return pinStates;
};

export class ArduinoUnoSimulator {
  constructor(options = {}) {
    const hex = String(options.hex || '').trim();

    if (!hex) {
      throw new Error('Simulator requires a compiled Intel HEX program.');
    }

    this.clockSpeedHz = Number(options.clockSpeedHz) > 0
      ? Number(options.clockSpeedHz)
      : DEFAULT_CLOCK_SPEED_HZ;
    this.workUnitCycles = Number(options.workUnitCycles) > 0
      ? Number(options.workUnitCycles)
      : DEFAULT_WORK_UNIT_CYCLES;
    this.updateIntervalMs = Number(options.updateIntervalMs) > 0
      ? Number(options.updateIntervalMs)
      : DEFAULT_UPDATE_INTERVAL_MS;
    this.onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this.running = false;
    this.pendingTimerId = null;
    this.lastEmittedAt = 0;
    this.serialOutput = '';
    this.trackedPinTransitionNames = new Set(
      (Array.isArray(options.trackedPinTransitionNames) ? options.trackedPinTransitionNames : [])
        .map((pinName) => String(pinName || '').trim())
        .filter((pinName) => ARDUINO_UNO_PINS_BY_NAME[pinName])
    );
    this.pinTransitionEvents = [];
    this.nextPinTransitionSequence = 1;
    this.pulseTrackingByPinName = Object.fromEntries(
      ARDUINO_UNO_PIN_ORDER.map((pinDefinition) => [
        pinDefinition.name,
        {
          estimatedToneFrequencyHz: null,
          highStartCycles: null,
          initialized: false,
          lastEdgeCycles: null,
          lastIsOutput: false,
          lastLogicHigh: false,
          lastPeriodCycles: null,
          lastPulseCompletedAtCycles: null,
          lastPulseHighCycles: null,
          lastRisingCycles: null,
          recentEdgeIntervalsCycles: [],
        },
      ])
    );

    this.program = new Uint16Array(FLASH_SIZE);
    loadHex(hex, new Uint8Array(this.program.buffer));

    this.cpu = new CPU(this.program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, this.clockSpeedHz);
    this.portsByKey = {
      B: this.portB,
      C: this.portC,
      D: this.portD,
    };
    this.timersByKey = {
      timer0: {
        config: timer0Config,
        instance: this.timer0,
      },
      timer1: {
        config: timer1Config,
        instance: this.timer1,
      },
      timer2: {
        config: timer2Config,
        instance: this.timer2,
      },
    };
    this.analogInputVoltagesByPinName = Object.fromEntries(
      Object.keys(ARDUINO_UNO_ANALOG_PIN_CHANNELS).map((pinName) => [pinName, 0])
    );

    this.usart.onByteTransmit = (value) => {
      this.serialOutput += String.fromCharCode(value);

      if (this.serialOutput.length > SERIAL_OUTPUT_MAX_LENGTH) {
        this.serialOutput = this.serialOutput.slice(-SERIAL_OUTPUT_MAX_LENGTH);
      }
    };

    const scheduleUpdate = (portKey) => {
      this.capturePulseTrackingForPort(portKey);

      if (this.running) {
        this.emitUpdate();
      }
    };

    this.portB.addListener(() => scheduleUpdate('B'));
    this.portC.addListener(() => scheduleUpdate('C'));
    this.portD.addListener(() => scheduleUpdate('D'));
  }

  recordTrackedPinTransition(pinDefinition, {
    currentCycles,
    isOutput,
    logicHigh,
    normalizedMode,
    sampledHigh,
  }) {
    if (!pinDefinition || !this.trackedPinTransitionNames.has(pinDefinition.name)) {
      return;
    }

    this.pinTransitionEvents.push({
      cpuCycles: Number.isFinite(Number(currentCycles)) ? Number(currentCycles) : 0,
      isHigh: Boolean(logicHigh),
      isOutput: Boolean(isOutput),
      logicLevel: logicHigh ? 'high' : 'low',
      mode: normalizedMode,
      pinName: pinDefinition.name,
      sampledHigh: Boolean(sampledHigh),
      sequence: this.nextPinTransitionSequence,
    });
    this.nextPinTransitionSequence += 1;
  }

  capturePulseTrackingForPort(portKey) {
    const port = this.portsByKey?.[portKey];
    const pinRegisterAddress = port?.portConfig?.PIN;
    const pinRegisterValue = Number.isInteger(pinRegisterAddress)
      ? this.cpu.data[pinRegisterAddress]
      : 0;
    const currentCycles = Number(this.cpu.cycles) || 0;

    ARDUINO_UNO_PIN_ORDER
      .filter((pinDefinition) => pinDefinition.portKey === portKey)
      .forEach((pinDefinition) => {
        const tracker = this.pulseTrackingByPinName[pinDefinition.name];
        const pinState = port?.pinState(pinDefinition.bit);
        const normalizedMode = PIN_STATE_NAMES[pinState] || 'unknown';
        const isOutput = normalizedMode === 'high' || normalizedMode === 'low';
        const logicHigh = isOutput
          ? normalizedMode === 'high'
          : Boolean(pinRegisterValue & (1 << pinDefinition.bit));

        if (!tracker) {
          return;
        }

        if (!tracker.initialized) {
          tracker.initialized = true;
          tracker.lastIsOutput = isOutput;
          tracker.lastLogicHigh = logicHigh;

          if (isOutput && logicHigh) {
            tracker.lastRisingCycles = currentCycles;
            tracker.highStartCycles = currentCycles;
          }

          return;
        }

        const wasHighOutput = tracker.lastIsOutput && tracker.lastLogicHigh;
        const isHighOutput = isOutput && logicHigh;
        const didTransition = tracker.lastIsOutput !== isOutput || tracker.lastLogicHigh !== logicHigh;

        if (didTransition) {
          this.recordTrackedPinTransition(pinDefinition, {
            currentCycles,
            isOutput,
            logicHigh,
            normalizedMode,
            sampledHigh: logicHigh,
          });
        }

        if (!wasHighOutput && isHighOutput) {
          recordPassiveToneEdge(tracker, currentCycles, this.clockSpeedHz);

          if (
            Number.isFinite(tracker.lastRisingCycles) &&
            currentCycles >= tracker.lastRisingCycles
          ) {
            tracker.lastPeriodCycles = currentCycles - tracker.lastRisingCycles;
          }

          tracker.lastRisingCycles = currentCycles;
          tracker.highStartCycles = currentCycles;
        } else if (wasHighOutput && !isHighOutput) {
          recordPassiveToneEdge(tracker, currentCycles, this.clockSpeedHz);

          if (
            Number.isFinite(tracker.highStartCycles) &&
            currentCycles >= tracker.highStartCycles
          ) {
            tracker.lastPulseHighCycles = currentCycles - tracker.highStartCycles;
            tracker.lastPulseCompletedAtCycles = currentCycles;
          }

          tracker.highStartCycles = null;
        } else if (isHighOutput && !Number.isFinite(tracker.highStartCycles)) {
          tracker.highStartCycles = currentCycles;
        }

        tracker.lastIsOutput = isOutput;
        tracker.lastLogicHigh = logicHigh;
      });
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.emitUpdate(true);
    this.scheduleNextSlice();
  }

  stop() {
    this.running = false;

    if (this.pendingTimerId !== null) {
      clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }
  }

  dispose() {
    this.stop();
  }

  setDigitalInput(pinName, value) {
    this.setDigitalInputs({
      [pinName]: value,
    });
  }

  setAnalogInput(pinName, voltage) {
    this.setAnalogInputs({
      [pinName]: voltage,
    });
  }

  setDigitalInputs(valuesByPinName = {}) {
    let didUpdatePins = false;

    Object.entries(valuesByPinName).forEach(([pinName, value]) => {
      const pinDefinition = ARDUINO_UNO_PIN_ORDER.find((pin) => pin.name === pinName);

      if (!pinDefinition) {
        return;
      }

      const port = this.portsByKey[pinDefinition.portKey];

      if (!port) {
        return;
      }

      port.setPin(pinDefinition.bit, Boolean(value));
      didUpdatePins = true;
    });

    if (didUpdatePins) {
      this.emitUpdate(true);
    }
  }

  setAnalogInputs(valuesByPinName = {}) {
    let didUpdatePins = false;

    Object.entries(valuesByPinName).forEach(([pinName, value]) => {
      const channel = ARDUINO_UNO_ANALOG_PIN_CHANNELS[pinName];

      if (!Number.isInteger(channel)) {
        return;
      }

      const nextVoltage = clampAnalogVoltage(value);
      const currentVoltage = Number(this.analogInputVoltagesByPinName[pinName] || 0);

      if (Math.abs(currentVoltage - nextVoltage) < 1e-6) {
        return;
      }

      this.analogInputVoltagesByPinName[pinName] = nextVoltage;
      this.adc.channelValues[channel] = nextVoltage;
      didUpdatePins = true;
    });

    if (didUpdatePins) {
      this.emitUpdate(true);
    }
  }

  scheduleNextSlice() {
    this.pendingTimerId = setTimeout(() => {
      this.pendingTimerId = null;
      this.runSlice();
    }, 0);
  }

  runSlice() {
    if (!this.running) {
      return;
    }

    try {
      const targetCycles = this.cpu.cycles + this.workUnitCycles;

      while (this.cpu.cycles < targetCycles) {
        avrInstruction(this.cpu);
        this.cpu.tick();
      }

      this.emitUpdate();
      this.scheduleNextSlice();
    } catch (error) {
      this.stop();

      if (this.onError) {
        this.onError(error);
      } else {
        throw error;
      }
    }
  }

  emitUpdate(force = false) {
    if (!this.onUpdate) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastEmittedAt < this.updateIntervalMs) {
      return;
    }

    this.lastEmittedAt = now;

    const analogOutputsByPinName = createAnalogOutputSnapshot(
      this.cpu,
      this.portsByKey,
      this.timersByKey
    );
    const servoPulseOutputsByPinName = createServoPulseSnapshot(
      this.pulseTrackingByPinName,
      this.cpu.cycles,
      this.clockSpeedHz
    );
    const passiveToneOutputsByPinName = createPassiveToneSnapshot(
      this.pulseTrackingByPinName,
      this.cpu.cycles,
      this.clockSpeedHz
    );
    const pinStates = createPinSnapshot(
      this.cpu,
      this.portsByKey,
      analogOutputsByPinName,
      servoPulseOutputsByPinName,
      passiveToneOutputsByPinName
    );
    const elapsedSeconds = this.cpu.cycles / this.clockSpeedHz;
    const pinTransitionEvents = this.pinTransitionEvents.slice();
    this.pinTransitionEvents = [];

    this.onUpdate({
      analogInputsByPinName: {
        ...this.analogInputVoltagesByPinName,
      },
      analogOutputsByPinName,
      builtinLedOn: Boolean(pinStates.D13?.isHigh),
      cpuCycles: this.cpu.cycles,
      elapsedSeconds,
      elapsedTimeText: formatSimulationTime(elapsedSeconds),
      passiveToneOutputsByPinName,
      pinStates,
      pinTransitionEvents,
      servoPulseOutputsByPinName,
      serialOutput: this.serialOutput,
    });
  }
}
