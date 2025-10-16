// Jest tests for main.js using real implementations (no full module mock)

const {
  pitchToMidi,
  getStemDirection,
  generateRandomMeasure,
  getAllowedPitches,
  getRandomPitch,
  generateRandomMeasures,
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
    <input type="checkbox" id="musicMode" />
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

// New tests for Music mode
describe('Music mode generation', () => {
  function enableMusicMode() {
    const mm = document.getElementById('musicMode');
    if (mm) mm.checked = true;
    const fr = document.getElementById('fullyRandom');
    if (fr) fr.checked = false;
  }

  test('treble and bass rhythms align per column', () => {
    enableMusicMode();
    const measures = generateRandomMeasures(4, 2);
    measures.forEach((m) => {
      expect(m.treble.length).toBe(m.bass.length);
      for (let i = 0; i < m.treble.length; i++) {
        expect(m.treble[i].duration).toBe(m.bass[i].duration);
        // Types may differ if one voice uses a rest at phrase end (e.g., 'h' vs 'hr').
        // Alignment requires duration equality; allow type differences between note/rest glyphs.
      }
    });
  });

  test('treble motion is mostly stepwise with rare small leaps', () => {
    enableMusicMode();
    const measures = generateRandomMeasures(4, 1);
    const trebleAllowed = getAllowedPitches('treble');
    const idx = (p) => trebleAllowed.indexOf(p);
    const trebleNotes = measures[0].treble.filter((n) => !n.isRest);

    let bigLeaps = 0;
    let leaps2 = 0;

    for (let i = 1; i < trebleNotes.length; i++) {
      const a = idx(trebleNotes[i - 1].pitch);
      const b = idx(trebleNotes[i].pitch);
      if (a >= 0 && b >= 0) {
        const d = Math.abs(b - a);
        if (d > 2) bigLeaps++;
        else if (d === 2) leaps2++;
      }
    }

    expect(bigLeaps).toBe(0);
    // Allow a small number of ±2 leaps relative to length
    expect(leaps2).toBeLessThanOrEqual(Math.max(1, Math.floor(trebleNotes.length / 5)));
  });

  test('bass pitches approximate root/fifth pattern and stay within allowed range', () => {
    enableMusicMode();
    const measures = generateRandomMeasures(4, 1);
    const bassAllowed = getAllowedPitches('bass');
    const center = document.getElementById('chosenNoteBass').value || 'c/3';
    const centerMidi = pitchToMidi(center);
    const fifthMidi = centerMidi + 7;
    const thirdMidi = centerMidi + 4;

    const bassNotes = measures[0].bass.filter((n) => !n.isRest);
    bassNotes.forEach((n, idx) => {
      expect(bassAllowed).toContain(n.pitch);
      const m = pitchToMidi(n.pitch);
      // Target for index: even->root, odd->fifth, occasionally third (test tolerant)
      const targets = [centerMidi, fifthMidi, thirdMidi];
      const minDist = Math.min(...targets.map((t) => Math.abs(m - t)));
      // Within a few semitones of target (after snapping to allowed pitches)
      expect(minDist).toBeLessThanOrEqual(3);
    });
  });

  test('all generated pitches stay within allowed ranges', () => {
    enableMusicMode();
    const measures = generateRandomMeasures(3, 2);
    measures.forEach((m) => {
      const trebleAllowed = getAllowedPitches('treble');
      const bassAllowed = getAllowedPitches('bass');
      m.treble.forEach((n) => {
        if (!n.isRest) expect(trebleAllowed).toContain(n.pitch);
      });
      m.bass.forEach((n) => {
        if (!n.isRest) expect(bassAllowed).toContain(n.pitch);
      });
    });
  });
});
