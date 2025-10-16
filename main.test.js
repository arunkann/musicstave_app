// Jest tests for main.js using real implementations (no full module mock)

const {
  pitchToMidi,
  getStemDirection,
  generateRandomMeasure,
  getAllowedPitches,
  getRandomPitch,
} = require('./main');

beforeEach(() => {
  // Use jsdom's real document and create the minimal elements our code expects
  document.body.innerHTML = `
    <select id="chosenNoteTreble"><option value="c/4" selected>c/4</option></select>
    <select id="rangeAboveTreble"><option value="2" selected>2</option></select>
    <select id="rangeBelowTreble"><option value="1" selected>1</option></select>

    <select id="chosenNoteBass"><option value="c/3" selected>c/3</option></select>
    <select id="rangeAboveBass"><option value="1" selected>1</option></select>
    <select id="rangeBelowBass"><option value="0" selected>0</option></select>

    <input type="checkbox" id="fullyRandom" />
  `;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('pitchToMidi', () => {
  test('converts c/4 to MIDI 60 (middle C)', () => {
    expect(pitchToMidi('c/4')).toBe(60);
  });

  test('converts b/3 to MIDI 59', () => {
    expect(pitchToMidi('b/3')).toBe(59);
  });
});

describe('getStemDirection', () => {
  test('treble: B4 or higher stems down', () => {
    expect(getStemDirection('treble', 'b/4')).toBe(-1);
    expect(getStemDirection('treble', 'c/5')).toBe(-1);
  });

  test('treble: below B4 stems up', () => {
    expect(getStemDirection('treble', 'a/4')).toBe(1);
    expect(getStemDirection('treble', 'c/4')).toBe(1);
  });

  test('bass: D3 or higher stems down', () => {
    expect(getStemDirection('bass', 'd/3')).toBe(-1);
    expect(getStemDirection('bass', 'e/3')).toBe(-1);
  });

  test('bass: below D3 stems up', () => {
    expect(getStemDirection('bass', 'c/3')).toBe(1);
    expect(getStemDirection('bass', 'b/2')).toBe(1);
  });
});

describe('generateRandomMeasure', () => {
  test('sum of durations equals beats (4/4)', () => {
    const measure = generateRandomMeasure(4);
    const sum = measure.reduce((acc, n) => acc + n.duration, 0);
    expect(sum).toBe(4);
  });

  test('sum of durations equals beats (3/4)', () => {
    const measure = generateRandomMeasure(3);
    const sum = measure.reduce((acc, n) => acc + n.duration, 0);
    expect(sum).toBe(3);
  });

  test('uses only supported note/rest types', () => {
    const allowed = new Set(['w', 'h', 'q', 'wr', 'hr', 'qr']);
    const measure = generateRandomMeasure(4);
    measure.forEach((n) => {
      expect(allowed.has(n.type)).toBe(true);
    });
  });
});

describe('getAllowedPitches', () => {
  test('treble range around chosen note', () => {
    // chosenNoteTreble=c/4, above=2, below=1
    expect(getAllowedPitches('treble')).toEqual(['b/3', 'c/4', 'd/4', 'e/4']);
  });

  test('bass range around chosen note', () => {
    // chosenNoteBass=c/3, above=1, below=0
    expect(getAllowedPitches('bass')).toEqual(['c/3', 'd/3']);
  });
});

describe('getRandomPitch', () => {
  test('returns a pitch from the allowed treble range', () => {
    const allowed = getAllowedPitches('treble');
    const pitch = getRandomPitch('treble');
    expect(allowed).toContain(pitch);
  });

  test('returns a pitch from the allowed bass range', () => {
    const allowed = getAllowedPitches('bass');
    const pitch = getRandomPitch('bass');
    expect(allowed).toContain(pitch);
  });
});
