import {
  CPU,
  avrInstruction,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
} from 'avr8js';

const FLASH_WORDS = 16384;

// ATmega328P data-space I/O addresses used by AVR8JS.
const PINB = 0x23;
const DDRB = 0x24;
const PORTB = 0x25;

const PINC = 0x26;
const DDRC = 0x27;
const PORTC = 0x28;

const PIND = 0x29;
const DDRD = 0x2a;
const PORTD = 0x2b;

const UNO_DIGITAL_PIN_MAP = {
  D0: { ddr: DDRD, port: PORTD, pin: PIND, bit: 0 },
  D1: { ddr: DDRD, port: PORTD, pin: PIND, bit: 1 },
  D2: { ddr: DDRD, port: PORTD, pin: PIND, bit: 2 },
  D3: { ddr: DDRD, port: PORTD, pin: PIND, bit: 3 },
  D4: { ddr: DDRD, port: PORTD, pin: PIND, bit: 4 },
  D5: { ddr: DDRD, port: PORTD, pin: PIND, bit: 5 },
  D6: { ddr: DDRD, port: PORTD, pin: PIND, bit: 6 },
  D7: { ddr: DDRD, port: PORTD, pin: PIND, bit: 7 },

  D8: { ddr: DDRB, port: PORTB, pin: PINB, bit: 0 },
  D9: { ddr: DDRB, port: PORTB, pin: PINB, bit: 1 },
  D10: { ddr: DDRB, port: PORTB, pin: PINB, bit: 2 },
  D11: { ddr: DDRB, port: PORTB, pin: PINB, bit: 3 },
  D12: { ddr: DDRB, port: PORTB, pin: PINB, bit: 4 },
  D13: { ddr: DDRB, port: PORTB, pin: PINB, bit: 5 },
};

function parseIntelHexToProgram(hexText) {
  const program = new Uint16Array(FLASH_WORDS);
  let upperLinearAddress = 0;

  const lines = hexText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith(':')) {
      continue;
    }

    const byteCount = Number.parseInt(line.slice(1, 3), 16);
    const address = Number.parseInt(line.slice(3, 7), 16);
    const recordType = Number.parseInt(line.slice(7, 9), 16);

    const data = [];

    for (let index = 0; index < byteCount; index += 1) {
      data.push(Number.parseInt(line.slice(9 + index * 2, 11 + index * 2), 16));
    }

    if (recordType === 0x00) {
      const absoluteAddress = upperLinearAddress + address;

      for (let index = 0; index < data.length; index += 2) {
        const byteAddress = absoluteAddress + index;
        const wordAddress = byteAddress >> 1;

        if (wordAddress >= 0 && wordAddress < program.length) {
          const lowByte = data[index] ?? 0xff;
          const highByte = data[index + 1] ?? 0xff;
          program[wordAddress] = lowByte | (highByte << 8);
        }
      }
    } else if (recordType === 0x01) {
      break;
    } else if (recordType === 0x04) {
      upperLinearAddress = ((data[0] ?? 0) << 24) | ((data[1] ?? 0) << 16);
    }
  }

  return program;
}

export class UnoAvrRunner {
  constructor({ onPinStatesChanged } = {}) {
    this.cpu = null;
    this.timer0 = null;
    this.timer1 = null;
    this.timer2 = null;

    this.running = false;
    this.animationFrameId = null;
    this.instructionsPerFrame = 8000;

    this.onPinStatesChanged = onPinStatesChanged ?? null;
    this.lastPinStateKey = '';
  }

  loadHex(hexText) {
    this.stop();

    const program = parseIntelHexToProgram(hexText);

    this.cpu = new CPU(program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    this.lastPinStateKey = '';
    this.emitPinStatesIfChanged();
  }

  start() {
    if (!this.cpu || this.running) {
      return;
    }

    this.running = true;
    this.scheduleNextFrame();
  }

  stop() {
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset() {
    if (!this.cpu) {
      return;
    }

    const program = this.cpu.progMem;
    this.stop();

    this.cpu = new CPU(program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    this.lastPinStateKey = '';
    this.emitPinStatesIfChanged();
  }

  scheduleNextFrame() {
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.stepFrame();

      if (this.running) {
        this.scheduleNextFrame();
      }
    });
  }

  stepFrame() {
    if (!this.cpu) {
      return;
    }

    for (let index = 0; index < this.instructionsPerFrame; index += 1) {
      avrInstruction(this.cpu);
      this.timer0.tick();
      this.timer1.tick();
      this.timer2.tick();
    }

    this.emitPinStatesIfChanged();
  }

  readDigitalPinStates() {
    if (!this.cpu) {
      return {};
    }

    const pinStates = {};

    for (const [pinLabel, config] of Object.entries(UNO_DIGITAL_PIN_MAP)) {
      const mask = 1 << config.bit;
      const ddrValue = this.cpu.data[config.ddr] ?? 0;
      const portValue = this.cpu.data[config.port] ?? 0;

      const isOutput = (ddrValue & mask) !== 0;
      const isHigh = (portValue & mask) !== 0;

      pinStates[pinLabel] = {
        mode: isOutput ? 'output' : 'input',
        value: isHigh,
      };
    }

    return pinStates;
  }

  emitPinStatesIfChanged() {
    if (!this.onPinStatesChanged) {
      return;
    }

    const pinStates = this.readDigitalPinStates();
    const nextKey = JSON.stringify(pinStates);

    if (nextKey === this.lastPinStateKey) {
      return;
    }

    this.lastPinStateKey = nextKey;
    this.onPinStatesChanged(pinStates);
  }
}