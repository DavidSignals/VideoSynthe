// app.js
document.addEventListener("DOMContentLoaded", async () => {
    const videoEl = document.getElementById("camera-video");
    const canvasEl = document.getElementById("analysis-canvas");
    const oscCanvas = document.getElementById("osc-canvas");
    const oscCtx = oscCanvas.getContext("2d");
    
    // UI Elements
    const splashScreen = document.getElementById("splash-screen");
    const startBtn = document.getElementById("start-btn");
    const recordBtn = document.getElementById("record-btn");
    const progressCircle = document.getElementById("progress-circle");
    const statusText = document.getElementById("status-text");
    const recordInner = document.getElementById("record-inner");
    const downloadAudioBtn = document.getElementById("download-audio-btn");

    // HUD Elements
    const hudWobble = document.getElementById("hud-wobble");
    const hudMod = document.getElementById("hud-mod");
    const hudHarm = document.getElementById("hud-harm");
    const hudDrive = document.getElementById("hud-drive");
    const hudNote = document.getElementById("hud-note");

    // Fix Oscilloscope resolution
    oscCanvas.width = oscCanvas.parentElement.clientWidth;
    oscCanvas.height = oscCanvas.parentElement.clientHeight || 100;

    // Instances
    const capture = new VideoCapture(videoEl);
    const analyzer = new VideoAnalyzer(videoEl, canvasEl, 64);
    const audio = new AudioEngine();

    let animationId = null;
    let isAppActive = false;
    let recordingDuration = 30000; // 30 seconds
    let recordStartTime = 0;
    let audioDownloadUrl = null;

    // Resize oscilloscope on window resize
    window.addEventListener('resize', () => {
        oscCanvas.width = oscCanvas.parentElement.clientWidth;
    });

    // Main Loop
    function loop(timestamp) {
        if (!isAppActive) return;

        const data = analyzer.analyzeFrame();
        audio.updateParameters(data);

        // Update HUD
        const params = audio.getCurrentParams();
        if (params) {
            hudWobble.innerText = params.wobble.toFixed(2) + " Hz";
            hudMod.innerText = params.modIndex.toFixed(2);
            hudHarm.innerText = params.harmonicity.toFixed(2) + "x";
            hudDrive.innerText = params.drive.toFixed(2);
            hudNote.innerText = params.note.toFixed(2) + " Hz";
        }

        if (capture.isRecording) {
            let elapsed = Date.now() - recordStartTime;
            let progress = Math.min(elapsed / recordingDuration, 1.0);
            let offset = 289 - (progress * 289);
            progressCircle.style.strokeDashoffset = offset;
            
            if (progress >= 1.0) {
                progressCircle.style.strokeDashoffset = 0;
            }
        }

        drawOscilloscope();
        animationId = requestAnimationFrame(loop);
    }

    function drawOscilloscope() {
        const waveform = audio.getWaveformData();
        
        oscCtx.clearRect(0, 0, oscCanvas.width, oscCanvas.height);
        oscCtx.beginPath();
        
        const currentData = analyzer.currentData;
        oscCtx.shadowBlur = 10 + (currentData.luma * 20);
        
        const hueDegree = Math.floor(currentData.hue * 360);
        oscCtx.shadowColor = `hsl(${hueDegree}, 100%, 50%)`;
        oscCtx.strokeStyle = `hsl(${hueDegree}, 100%, 80%)`;
        oscCtx.lineWidth = 2;

        for (let i = 0; i < waveform.length; i++) {
            const x = (i / waveform.length) * oscCanvas.width;
            const y = (0.5 + waveform[i] * 0.5) * oscCanvas.height;
            if (i === 0) oscCtx.moveTo(x, y);
            else oscCtx.lineTo(x, y);
        }
        oscCtx.stroke();
    }

    // Store the raw blob for mp3 conversion
    let rawAudioBlob = null;

    // Capture Callback
    capture.onRecordingComplete = async (videoUrl) => {
        statusText.innerText = "Playing Buffer";
        statusText.classList.remove("text-neonSecondary");
        statusText.classList.add("text-neonPrimary");
        recordInner.classList.remove("recording-pulse");
        progressCircle.style.strokeDashoffset = 289;
        
        // Stop Audio Recording
        const audioBlob = await audio.stopRecording();
        if (audioBlob) {
            rawAudioBlob = audioBlob;
            downloadAudioBtn.classList.remove("hidden");
            downloadAudioBtn.innerText = "Download MP3";
            downloadAudioBtn.disabled = false;
        }

        capture.playBuffer(videoUrl);
    };

    // Initialize Camera immediately on load so it plays behind splash screen
    capture.initCamera().then(() => {
        // Optional: Do something when camera is ready
    });

    // Flip Camera Button
    const flipCameraBtn = document.getElementById("flip-camera-btn");
    if (flipCameraBtn) {
        flipCameraBtn.addEventListener("click", () => {
            flipCameraBtn.innerText = "FLIPPING...";
            flipCameraBtn.disabled = true;
            capture.toggleCamera().then(() => {
                flipCameraBtn.innerText = "FLIP CAM";
                flipCameraBtn.disabled = false;
            });
        });
    }

    // Splash Screen Start
    startBtn.addEventListener("click", async () => {
        try {
            startBtn.innerText = "INITIALIZING...";
            startBtn.disabled = true;

            await audio.init();
            
            isAppActive = true;
            audio.startSound();
            loop();
        } catch (e) {
            console.error("Initialization Error:", e);
            startBtn.innerText = "ERROR: " + e.message;
        } finally {
            if (isAppActive) {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                }, 500);
            } else {
                startBtn.disabled = false;
            }
        }
    });

    // UI Events
    recordBtn.addEventListener("click", () => {
        if (!isAppActive) return;

        if (capture.isRecording) {
            capture.stopRecording();
            statusText.innerText = "Analyzing...";
            recordInner.classList.remove("recording-pulse");
        } else if (videoEl.srcObject === null) {
            capture.resumeCamera();
            startRecordingUI();
        } else {
            startRecordingUI();
        }
    });

    // Download Audio as MP3
    downloadAudioBtn.addEventListener("click", async () => {
        if (!rawAudioBlob) return;

        downloadAudioBtn.innerText = "ENCODING MP3...";
        downloadAudioBtn.disabled = true;

        // Allow UI to update before heavy synchronous encoding
        setTimeout(async () => {
            try {
                const arrayBuffer = await rawAudioBlob.arrayBuffer();
                const audioCtx = new AudioContext();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                function floatTo16BitPCM(input) {
                    let output = new Int16Array(input.length);
                    for (let i = 0; i < input.length; i++) {
                        let s = Math.max(-1, Math.min(1, input[i]));
                        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    return output;
                }

                // Initialize LameJS Mp3Encoder (channels, sampleRate, kbps)
                const mp3encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 192);
                let mp3Data = [];
                const sampleBlockSize = 1152; 
                let left = floatTo16BitPCM(audioBuffer.getChannelData(0));
                let right = audioBuffer.numberOfChannels > 1 ? floatTo16BitPCM(audioBuffer.getChannelData(1)) : left;

                for (let i = 0; i < left.length; i += sampleBlockSize) {
                    let leftChunk = left.subarray(i, i + sampleBlockSize);
                    let rightChunk = right.subarray(i, i + sampleBlockSize);
                    let mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                    if (mp3buf.length > 0) mp3Data.push(mp3buf);
                }
                let mp3buf = mp3encoder.flush();
                if (mp3buf.length > 0) mp3Data.push(mp3buf);

                const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
                const mp3Url = URL.createObjectURL(mp3Blob);

                // Trigger download
                const a = document.createElement("a");
                a.href = mp3Url;
                a.download = `VideoSynthe_Audio_${Date.now()}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                downloadAudioBtn.innerText = "Download MP3";
                downloadAudioBtn.disabled = false;
            } catch (err) {
                console.error("MP3 Encoding Failed:", err);
                downloadAudioBtn.innerText = "ERROR ENCODING";
                setTimeout(() => {
                    downloadAudioBtn.innerText = "Download MP3";
                    downloadAudioBtn.disabled = false;
                }, 3000);
            }
        }, 100);
    });

    function startRecordingUI() {
        downloadAudioBtn.classList.add("hidden");
        
        capture.startRecording(recordingDuration);
        audio.startRecording();
        
        recordStartTime = Date.now();
        statusText.innerText = "Recording...";
        statusText.classList.remove("text-neonPrimary");
        statusText.classList.add("text-neonSecondary");
        
        recordInner.classList.add("recording-pulse");
        progressCircle.style.strokeDashoffset = 289;
    }
});
