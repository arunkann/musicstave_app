// Updated main.js with automatic stem direction, clef display options, and a beta feature
// to toggle between aligned (same pattern) and fully random (independent) measures.

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

// Generate measures based on the "Fully random (beta)" checkbox state.
function generateRandomMeasures(beats, numMeasures) {
    const fullyRandom = document.getElementById("fullyRandom").checked; // Check if beta feature is enabled.
    let measures = [];

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

// Render the staff.
function renderStaff(measures, timeSignature) {
    const div = document.getElementById("staff");
    div.innerHTML = "";

    const { Renderer, Stave, StaveNote, Formatter } = Vex.Flow;
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

        // Draw notes for each clef.
        if (showTreble && trebleNotes.length > 0) {
            Formatter.FormatAndDraw(context, trebleStave, trebleNotes);
        }
        if (showBass && bassNotes.length > 0) {
            Formatter.FormatAndDraw(context, bassStave, bassNotes);
        }
    }
}

// Generate and render the staff.
function generate() {
    const timeSignature = document.getElementById("timeSignature").value;
    const beats = parseInt(timeSignature.split("/")[0]);
    const numMeasures = parseInt(document.getElementById("numMeasures").value);
    const measures = generateRandomMeasures(beats, numMeasures);
    renderStaff(measures, timeSignature);
}

generate();