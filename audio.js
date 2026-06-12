// audio.js
class AudioEngine {
    constructor() {
        this.initialized = false;
        
        // Modules
        this.synth = null;
        this.filter = null;
        this.lfo = null;
        this.reverb = null;
        this.delay = null;
        this.distortion = null;
        this.waveform = null;
        this.recorder = null;
        
        // State
        this.isPlaying = false;
        this.baseFreq = 55; // A1 (Deep Bass)
    }

    async init() {
        if (this.initialized) return;
        await Tone.start();

        // 1. Effects
        this.reverb = new Tone.Reverb({ decay: 3, wet: 0.2 });
        this.delay = new Tone.FeedbackDelay("8n", 0.4);
        this.delay.wet.value = 0.1;
        
        // Analog Drive/Saturation
        this.distortion = new Tone.Distortion(0.8);
        this.distortion.wet.value = 0.5;

        // 2. Filter (Moog-style Lowpass Ladder)
        this.filter = new Tone.Filter({
            type: "lowpass",
            frequency: 400,
            rolloff: -24,
            Q: 5 // High resonance for squelchy acid sound
        });

        // 3. LFO (The Wobble)
        this.lfo = new Tone.LFO({
            type: "sine",
            min: 50,
            max: 5000,
            frequency: 1
        }).start();
        this.lfo.connect(this.filter.frequency);

        // 4. Synth: Monophonic FMSynth for rich harmonics
        this.synth = new Tone.FMSynth({
            harmonicity: 1,
            modulationIndex: 10,
            oscillator: { type: "sawtooth" },
            modulation: { type: "square" },
            envelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 1.0,
                release: 1.0
            },
            modulationEnvelope: {
                attack: 0.05,
                decay: 0.5,
                sustain: 1.0,
                release: 1.0
            }
        });

        // 5. Visualizer & Recorder
        this.waveform = new Tone.Waveform(512);
        this.recorder = new Tone.Recorder();
        this.masterVol = new Tone.Volume(-6);

        // Routing
        // Synth -> Distortion -> Filter -> Delay -> Reverb -> Master
        this.synth.connect(this.distortion);
        this.distortion.connect(this.filter);
        this.filter.connect(this.delay);
        this.delay.connect(this.reverb);
        
        // Master Bus Split (Parallel connection to avoid 'no outputs' error)
        this.reverb.connect(this.masterVol);
        this.masterVol.connect(Tone.Destination);
        this.masterVol.connect(this.waveform);
        this.masterVol.connect(this.recorder);

        this.initialized = true;
    }

    startSound() {
        if (!this.initialized) return;
        this.isPlaying = true;
        this.synth.triggerAttack(this.baseFreq);
    }

    stopSound() {
        if (!this.initialized) return;
        this.isPlaying = false;
        this.synth.triggerRelease();
    }

    updateParameters(data) {
        if (!this.initialized || !this.isPlaying) return;

        const { hue, saturation, luma, motion, sceneChange } = data;

        // 1. Motion -> Filter LFO Wobble (Extreme Reactivity!)
        // Motion ranges 0-1 (now much easier to reach 1.0 due to sensitivity tweak).
        // 0 = slow sweeping pad (0.2 Hz). 1 = frantic acid wobble (30 Hz)
        const wobbleRate = 0.2 + (motion * 29.8); 
        this.lfo.frequency.rampTo(wobbleRate, 0.05); // Fast ramp
        
        // Motion opens the filter max drastically (up to 12000Hz)
        this.lfo.max = 500 + (motion * 11500);

        // 2. Color (Hue/Saturation) -> FM Timbre & Detune
        // Hue determines the base character of the synth
        const harmonics = [0.25, 0.5, 1, 1.5, 2, 3.5, 5, 7];
        const hIndex = Math.floor(hue * (harmonics.length - 1));
        this.synth.harmonicity.rampTo(harmonics[hIndex], 0.1);
        
        // Aggressive Modulation Index. High saturation = screeching FM tones
        this.synth.modulationIndex.rampTo(2 + (hue * 50) + (saturation * 50), 0.1);

        // 3. Brightness (Luma) -> Drive/Distortion & Volume
        // Luma controls analog overdrive amount directly
        this.distortion.wet.rampTo(luma, 0.1);
        this.distortion.distortion = 0.1 + (luma * 1.5); // Push it past 1.0 for crunch

        const volOffset = (luma - 0.5) * 12; // -6 to +6 dB
        this.masterVol.volume.rampTo(-6 + volOffset, 0.1);

        // 4. Scene Change -> Note Change & Delay Spike
        if (sceneChange) {
            const scale = [55, 58.27, 65.41, 73.42, 82.41, 87.31, 98.00, 110]; // Phrygian Dominant
            this.baseFreq = scale[Math.floor(Math.random() * scale.length)];
            
            // Violent Portamento
            this.synth.setNote(this.baseFreq, "+0", 0.1);

            // Spike delay
            this.delay.wet.rampTo(0.8, 0.05);
            setTimeout(() => {
                this.delay.wet.rampTo(0.1, 1.0);
            }, 400);
        }

        // Store for UI HUD
        this.currentParams = {
            wobble: wobbleRate,
            harmonicity: harmonics[hIndex],
            modIndex: 2 + (hue * 50) + (saturation * 50),
            drive: 0.1 + (luma * 1.5),
            note: this.baseFreq
        };
    }

    getCurrentParams() {
        return this.currentParams || {
            wobble: 0,
            harmonicity: 0,
            modIndex: 0,
            drive: 0,
            note: 0
        };
    }

    startRecording() {
        if (!this.initialized) return;
        this.recorder.start();
    }

    async stopRecording() {
        if (!this.initialized) return null;
        try {
            return await this.recorder.stop();
        } catch (e) {
            console.error("Error stopping recording:", e);
            return null;
        }
    }

    getWaveformData() {
        if (!this.initialized || !this.waveform) return new Float32Array(512);
        return this.waveform.getValue();
    }
}
