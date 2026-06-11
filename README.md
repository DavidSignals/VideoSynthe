# 👁️ VideoSynthe 🎛️
**"See with your ears"**

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![Tone.js](https://img.shields.io/badge/audio-Tone.js-ff69b4.svg)
![Tailwind](https://img.shields.io/badge/style-TailwindCSS-38b2ac.svg)
![Status](https://img.shields.io/badge/status-Awesome-success.svg)

VideoSynthe is an immersive, cutting-edge web application that transforms your device's camera feed into a massive, highly reactive analog synthesizer. It uses real-time image processing and the Tone.js DSP (Digital Signal Processing) engine to translate visual dynamics into a beastly, Minimoog-style sound.

Created by **David Signals**.

---

## 🎹 Main Features

*   **Massive Monophonic Synth (FM Synth)**: A virtual analog architecture that produces "fat", aggressive, and harmonic-rich bass tones using a -24dB/oct Moog Ladder Filter and simulated tube distortion units.
*   **Extreme Motion Reactivity (Wobble)**: Optical motion detection modulates the frequency of a Low Frequency Oscillator (LFO) in real-time. Wave the camera for fast *Dubstep/Acid* style wobbles, or stay still for deep, atmospheric sub-bass.
*   **Color-Controlled Harmonics**: The dominant color (Hue) of your environment aggressively shifts the *Modulation Index* and wave harmonicity. 
*   **Illumination Overdrive**: Pointing the camera at light sources saturates the simulated analog circuit, breaking the sound with rich even and odd harmonics.
*   **WebRTC Capture & MP3 Export**: Record your audiovisual performance in 30-second buffers, save it, and download the sonic masterpiece directly in MP3 format (powered by LameJS).
*   **Futuristic Dark Mode**: A polished, immersive, borderless interface accented with audio-reactive neon light colors.

---

## 🎛️ Modulation Rules (Visual -> Audio)

| Visual Stimulus | Synthesizer Parameter | Sonic Result |
| :--- | :--- | :--- |
| **Movement Speed** | LFO Rate + Filter Cutoff | Rhythmic "Wobble Bass"; from 0.2Hz to 30Hz. |
| **Dominant Color (Hue)** | FM Harmonicity & Mod Index | Warm timbres vs. sharp, dissonant metallic harmonics. |
| **Average Brightness (Luma)**| Distortion / Analog Drive | Brighter light equals higher saturation and aggressive volume. |
| **Covering the Lens Quickly**| Scale Trigger / Portamento | Triggers random notes in a dark Phrygian scale with heavy echo. |

---

## 🛠️ Technical Architecture

VideoSynthe was built prioritizing execution on the *Main Thread* at 60 FPS without overloading the CPU:
*   **Frontend**: Vanilla JavaScript (ES6+). We avoided libraries like React for the render loop to prevent performance penalties from Virtual DOM updates.
*   **Styling**: TailwindCSS loaded via CDN.
*   **Audio DSP**: [Tone.js](https://tonejs.github.io/) v14.
*   **Visual Analysis**: `CanvasRenderingContext2D` API processing Frame Differencing on a scaled-down 64x64 matrix.
*   **MP3 Export**: [LameJS](https://github.com/zhuker/lamejs) encoding RAW memory buffers.

---

## ☕ Support the Project

If you love what you hear and see, consider supporting the creator:
[**Donate via PayPal**](https://www.paypal.com/paypalme/rabagocb) - `rabago.cb@gmail.com`

> *"The universe is music, we just need the right eyes to hear it."* - David Signals
