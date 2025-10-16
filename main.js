// Helper function to convert pitch string (e.g., "c/4") to MIDI note number.
function pitchToMidi(pitch) {
  const noteOrder = { "c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11 };
  const parts = pitch.split('/');
  const note = parts[0];
  const octave = parseInt(parts[1]);
  return (octave + 1) * 12 + noteOrder[note];
}

// Determine stem direction based on clef and pitch.
function getStemDirection(clef, pitch) {
  const midi = pitchToMidi(pitch);
  if (clef === "treble") {
      return midi >= 71 ? -1 : 1; // B4 or higher: stem down.
  } else {
      return midi >= 50 ? -1 : 1; // D3 or higher: stem down.
  }
}

// Generate a random measure of notes/rests fitting the given beats.
function generateRandomMeasure(beats) {
  let remainingBeats = beats;
  let notes = [];
  const noteValues = { "w": 4, "h": 2, "q": 1 };
  const restValues = { "wr": 4, "hr": 2, "qr": 1 };

  while (remainingBeats > 0) {
      const isNote = Math.random() < 0.9 && remainingBeats >= 1;
      const availableTypes = isNote ? noteValues : restValues;
      const typeKeys = Object.keys(availableTypes).filter(type => availableTypes[type] <= remainingBeats);

      if (typeKeys.length === 0) {
          const smallestType = Object.keys(restValues).reduce(
              (min, key) => restValues[key] < restValues[min] ? key : min,
              "qr"
          );
          const value = restValues[smallestType];
          notes.push({ type: smallestType, isRest: true, duration: value });
          remainingBeats -= value;
      } else {
          const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
          const value = availableTypes[type];
          notes.push({ type: type, isRest: !isNote, duration: value });
          remainingBeats -= value;
      }
  }
  return notes;
}

// Musical helpers to create more rhythmic, tonal phrases.
function midiToClosestAllowedPitch(clef, targetMidi) {
  const allowed = getAllowedPitches(clef);
  if (!allowed || allowed.length === 0) return null;
  let best = allowed[0];
  let bestDist = Math.abs(pitchToMidi(best) - targetMidi);
  for (let i = 1; i < allowed.length; i++) {
    const dist = Math.abs(pitchToMidi(allowed[i]) - targetMidi);
    if (dist < bestDist) {
      best = allowed[i];
      bestDist = dist;
    }
  }
  return best;
}

function stepwiseNextPitch(prevPitch, clef) {
  const allowed = getAllowedPitches(clef);
  if (!prevPitch || allowed.length === 0) {
    return getRandomPitch(clef);
  }
  const idx = allowed.indexOf(prevPitch);
  // If prevPitch not in allowed (shouldn't happen), snap to closest by MIDI.
  if (idx === -1) {
    const snapped = midiToClosestAllowedPitch(clef, pitchToMidi(prevPitch));
    const snappedIdx = allowed.indexOf(snapped);
    return allowed[Math.max(0, Math.min(allowed.length - 1, snappedIdx))];
  }
  // Weighted step choices: -1, 0, +1 (mostly stepwise), occasional ±2 leap.
  const choices = [-1, 0, +1, -2, +2];
  const weights = [0.35, 0.2, 0.35, 0.05, 0.05];
  const r = Math.random();
  let acc = 0;
  let offset = 0;
  for (let i = 0; i < choices.length; i++) {
    acc += weights[i];
    if (r <= acc) {
      offset = choices[i];
      break;
    }
  }
  const nextIdx = Math.max(0, Math.min(allowed.length - 1, idx + offset));
  return allowed[nextIdx];
}

// Build a simple rhythmic pattern for a measure given total beats.
// Only uses quarter, half, whole to match current renderer.
function buildRhythmPattern(beats) {
  const patternsByBeats = {
    4: [
      ["q", "q", "q", "q"],
      ["h", "q", "q"],
      ["q", "h", "q"],
      ["h", "h"],
      ["w"],
    ],
    3: [
      ["q", "q", "q"],
      ["h", "q"],
      ["q", "h"],
    ],
  };
  const patterns = patternsByBeats[beats] || [["q", "q", "q", "q"]];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

// Generate measures with musical phrasing: stepwise treble melody,
// bass alternating root and fifth for simple harmonic support.
function generateMusicalMeasures(beats, numMeasures) {
  let measures = [];
  const trebleCenter = document.getElementById("chosenNoteTreble")?.value || "c/4";
  const bassCenter = document.getElementById("chosenNoteBass")?.value || "c/3";
  const trebleCenterMidi = pitchToMidi(trebleCenter);
  const bassCenterMidi = pitchToMidi(bassCenter);

  for (let i = 0; i < numMeasures; i++) {
    const rhythm = buildRhythmPattern(beats);

    // Build treble line: start near center, move mostly stepwise.
    let treblePrev = midiToClosestAllowedPitch("treble", trebleCenterMidi);
    const trebleMeasure = rhythm.map((dur, idx) => {
      // small chance to rest at end of phrase
      const isPhraseRest = idx === rhythm.length - 1 && Math.random() < 0.15;
      if (isPhraseRest) {
        const restTypeMap = { "q": "qr", "h": "hr", "w": "wr" };
        return { type: restTypeMap[dur] || "qr", isRest: true, duration: dur === "h" ? 2 : dur === "w" ? 4 : 1, clef: "treble", pitch: null };
      }
      const nextPitch = stepwiseNextPitch(treblePrev, "treble");
      treblePrev = nextPitch;
      const durationValue = dur === "h" ? 2 : dur === "w" ? 4 : 1;
      return { type: dur, isRest: false, duration: durationValue, clef: "treble", pitch: nextPitch };
    });

    // Build bass line: alternate root and fifth, occasional third.
    const bassFifthMidi = bassCenterMidi + 7; // perfect fifth up
    const bassThirdMidi = bassCenterMidi + 4; // major third up (approx)
    let useThird = Math.random() < 0.25;

    const bassMeasure = rhythm.map((dur, idx) => {
      const isPhraseRest = idx === rhythm.length - 1 && Math.random() < 0.1;
      if (isPhraseRest) {
        const restTypeMap = { "q": "qr", "h": "hr", "w": "wr" };
        return { type: restTypeMap[dur] || "qr", isRest: true, duration: dur === "h" ? 2 : dur === "w" ? 4 : 1, clef: "bass", pitch: null };
      }
      let targetMidi;
      if (useThird && idx % 4 === 2) {
        targetMidi = bassThirdMidi;
      } else {
        targetMidi = idx % 2 === 0 ? bassCenterMidi : bassFifthMidi;
      }
      const pitch = midiToClosestAllowedPitch("bass", targetMidi) || getRandomPitch("bass");
      const durationValue = dur === "h" ? 2 : dur === "w" ? 4 : 1;
      return { type: dur, isRest: false, duration: durationValue, clef: "bass", pitch };
    });

    measures.push({ treble: trebleMeasure, bass: bassMeasure });
  }

  return measures;
}

// Generate measures based on the "Fully random (beta)" checkbox state.
function generateRandomMeasures(beats, numMeasures) {
  const fullyRandom = document.getElementById("fullyRandom").checked;
  const musicMode = document.getElementById("musicMode") && document.getElementById("musicMode").checked;
  let measures = [];

  if (musicMode) {
    // Generate musical, rhythmic measures with aligned voices.
    return generateMusicalMeasures(beats, numMeasures);
  }

  for (let i = 0; i < numMeasures; i++) {
      if (fullyRandom) {
          // Beta mode: Generate fully independent measures for each clef.
          let trebleMeasure = generateRandomMeasure(beats).map(note => ({
              ...note,
              clef: "treble",
              pitch: note.isRest ? null : getRandomPitch("treble")
          }));
          let bassMeasure = generateRandomMeasure(beats).map(note => ({
              ...note,
              clef: "bass",
              pitch: note.isRest ? null : getRandomPitch("bass")
          }));
          measures.push({ treble: trebleMeasure, bass: bassMeasure });
      } else {
          // Default mode: Generate a single base measure pattern to use for both clefs.
          let baseMeasure = generateRandomMeasure(beats);
          let trebleMeasure = baseMeasure.map(note => ({
              ...note,
              clef: "treble",
              pitch: note.isRest ? null : getRandomPitch("treble")
          }));
          let bassMeasure = baseMeasure.map(note => ({
              ...note,
              clef: "bass",
              pitch: note.isRest ? null : getRandomPitch("bass")
          }));
          measures.push({ treble: trebleMeasure, bass: bassMeasure });
      }
  }
  return measures;
}

// Get allowed pitches based on user selection.
function getAllowedPitches(clef) {
  let chosenNote, rangeAbove, rangeBelow, fullScale;
  if (clef === "treble") {
      chosenNote = document.getElementById("chosenNoteTreble").value;
      rangeAbove = parseInt(document.getElementById("rangeAboveTreble").value);
      rangeBelow = parseInt(document.getElementById("rangeBelowTreble").value);
      fullScale = [
          "a/3", "b/3", "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4",
          "c/5", "d/5", "e/5", "f/5", "g/5", "a/5", "b/5", "c/6"
      ];
  } else {
      chosenNote = document.getElementById("chosenNoteBass").value;
      rangeAbove = parseInt(document.getElementById("rangeAboveBass").value);
      rangeBelow = parseInt(document.getElementById("rangeBelowBass").value);
      fullScale = [
          "e/2", "f/2", "g/2", "a/2", "b/2",
          "c/3", "d/3", "e/3", "f/3", "g/3", "a/3", "b/3",
          "c/4", "d/4", "e/4"
      ];
  }
  const index = fullScale.indexOf(chosenNote);
  if (index === -1) return fullScale;
  const start = Math.max(0, index - rangeBelow);
  const end = Math.min(fullScale.length, index + rangeAbove + 1);
  return fullScale.slice(start, end);
}

// Pick a random pitch from allowed range.
function getRandomPitch(clef) {
  const allowed = getAllowedPitches(clef);
  return allowed[Math.floor(Math.random() * allowed.length)];
}

// Render the staff with aligned voices for treble and bass.
function renderStaff(measures, timeSignature) {
  const div = document.getElementById("staff");
  div.innerHTML = "";


  const { Renderer, Stave, StaveNote, Formatter, Voice } = Vex.Flow;
  const numMeasures = measures.length;
  const totalWidth = window.innerWidth * 0.9;
  const measureWidth = numMeasures === 1 ? totalWidth / 2 : totalWidth / numMeasures;

  const showTreble = document.getElementById("showTreble").checked;
  const showBass = document.getElementById("showBass").checked;
  const totalStaves = (showTreble ? 1 : 0) + (showBass ? 1 : 0);
  const rendererHeight = totalStaves === 2 ? 250 : 150;

  const renderer = new Renderer(div, Renderer.Backends.SVG);
  renderer.resize(totalWidth + 20, rendererHeight);
  const context = renderer.getContext();

  // Compute beats and beat value from time signature.
  const [beats, beatValue] = timeSignature.split("/").map(n => parseInt(n));

  // DEBUG: Log the entire measure data
  console.log("=== Measures Data ===");
  measures.forEach((m, i) => {
      console.log(`Measure #${i + 1} - Treble:`, m.treble);
      console.log(`Measure #${i + 1} - Bass:  `, m.bass);
  });
  console.log("=====================");

  for (let i = 0; i < numMeasures; i++) {
      const x = 10 + i * measureWidth;
      let trebleStave, bassStave;

      // Set up staves.
      if (showTreble) {
          trebleStave = new Stave(x, 0, measureWidth);
          if (i === 0) trebleStave.addClef("treble").addTimeSignature(timeSignature);
          trebleStave.setContext(context).draw();
      }
      if (showBass) {
          let yBass = showTreble ? 100 : 0;
          bassStave = new Stave(x, yBass, measureWidth);
          if (i === 0) bassStave.addClef("bass").addTimeSignature(timeSignature);
          bassStave.setContext(context).draw();
      }

      // Prepare notes for both clefs.
      const trebleNotes = showTreble ? measures[i].treble.map(n => {
          if (n.isRest) {
              return new StaveNote({ clef: "treble", keys: ["b/4"], duration: n.type });
          } else {
              const note = new StaveNote({ clef: "treble", keys: [n.pitch], duration: n.type });
              note.setStemDirection(getStemDirection("treble", n.pitch));
              return note;
          }
      }) : [];

      const bassNotes = showBass ? measures[i].bass.map(n => {
          if (n.isRest) {
              return new StaveNote({ clef: "bass", keys: ["d/3"], duration: n.type });
          } else {
              const note = new StaveNote({ clef: "bass", keys: [n.pitch], duration: n.type });
              note.setStemDirection(getStemDirection("bass", n.pitch));
              return note;
          }
      }) : [];

      // Create voices and format them together if both clefs are shown.
      if (showTreble && showBass && trebleNotes.length > 0 && bassNotes.length > 0) {
          const trebleVoice = new Voice({ num_beats: beats, beat_value: beatValue })
              .setMode(Voice.Mode.SOFT)
              .addTickables(trebleNotes);
          const bassVoice = new Voice({ num_beats: beats, beat_value: beatValue })
              .setMode(Voice.Mode.SOFT)
              .addTickables(bassNotes);

          new Formatter()
              .joinVoices([trebleVoice, bassVoice])
              .format([trebleVoice, bassVoice], measureWidth - 50);

              const trebleTickables = trebleVoice.getTickables();
              const bassTickables = bassVoice.getTickables();
              const minLength = Math.min(trebleTickables.length, bassTickables.length);
              
              for (let idx = 0; idx < minLength; idx++) {
                const trebleTickable = trebleTickables[idx];
                const bassTickable = bassTickables[idx];
              
                const bassIsRest = typeof bassTickable.isRest === "function" && bassTickable.isRest();
                const trebleIsRest = typeof trebleTickable.isRest === "function" && trebleTickable.isRest();
              
                if (bassIsRest || trebleIsRest) {
                  console.log(`Skipping offset for column #${idx} because either bass or treble is a rest.`);
                } else {
                  const shift = 10; // Adjust as needed.
                  bassTickable.setXShift(shift);
                  console.log(`Bass note #${idx} shifted by ${shift}. New absolute x: ${bassTickable.getAbsoluteX()}`);
                }
              }
              


          // DEBUG: Log absolute x positions for each tickable after formatting.
          trebleVoice.getTickables().forEach((tickable, idx) => {
              console.log(`Measure #${i + 1} Treble note #${idx} absolute x:`, tickable.getAbsoluteX());
          });
          bassVoice.getTickables().forEach((tickable, idx) => {
              console.log(`Measure #${i + 1} Bass note #${idx} absolute x:`, tickable.getAbsoluteX());
          });

          trebleVoice.draw(context, trebleStave);
          bassVoice.draw(context, bassStave);

      } else if (showTreble && trebleNotes.length > 0) {
          // Single treble staff
          const trebleVoice = new Voice({ num_beats: beats, beat_value: beatValue })
              .setMode(Voice.Mode.SOFT)
              .addTickables(trebleNotes);

          new Formatter().format([trebleVoice], measureWidth - 50);

          trebleVoice.getTickables().forEach((tickable, idx) => {
              console.log(`Measure #${i + 1} (Treble Only) note #${idx} absolute x:`, tickable.getAbsoluteX());
          });

          trebleVoice.draw(context, trebleStave);

      } else if (showBass && bassNotes.length > 0) {
          // Single bass staff
          const bassVoice = new Voice({ num_beats: beats, beat_value: beatValue })
              .setMode(Voice.Mode.SOFT)
              .addTickables(bassNotes);

          new Formatter().format([bassVoice], measureWidth - 50);

          bassVoice.getTickables().forEach((tickable, idx) => {
              console.log(`Measure #${i + 1} (Bass Only) note #${idx} absolute x:`, tickable.getAbsoluteX());
          });

          bassVoice.draw(context, bassStave);
      }
  }
}

// Generate and render the staff.
function generate() {
  const timeSignature = document.getElementById("timeSignature").value;
  const beats = parseInt(timeSignature.split("/")[0]);
  const numMeasures = parseInt(document.getElementById("numMeasures").value);
  const measures = generateRandomMeasures(beats, numMeasures);

  // DEBUG: Log overall generation info
  console.log("Time Signature:", timeSignature, "Num Measures:", numMeasures);
  console.log("Generated measures:", measures);

  renderStaff(measures, timeSignature);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Vex !== 'undefined' && Vex.Flow) {
  try {
    generate();
  } catch (e) {
    console.warn('Initial render skipped in non-browser or missing VexFlow:', e);
  }
}

// Exports for tests (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pitchToMidi,
    getStemDirection,
    generateRandomMeasure,
    generateRandomMeasures,
    getAllowedPitches,
    getRandomPitch,
    renderStaff,
    generate
  };
}
