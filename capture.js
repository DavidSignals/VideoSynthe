// capture.js
class VideoCapture {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.onRecordingComplete = null;
    }

    async initCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false
            });
            this.videoElement.srcObject = this.stream;
            this.videoElement.play().catch(e => console.warn("Auto-play prevented", e));
            return true;
        } catch (err) {
            console.error("Camera access denied or unavailable", err);
            return false;
        }
    }

    startRecording(durationMs = 30000) {
        if (!this.stream) return;
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            if (this.onRecordingComplete) {
                this.onRecordingComplete(url);
            }
        };

        this.mediaRecorder.start();
        this.isRecording = true;

        // Auto-stop after duration
        this.recordTimeout = setTimeout(() => {
            if (this.isRecording) {
                this.stopRecording();
            }
        }, durationMs);
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearTimeout(this.recordTimeout);
        }
    }

    playBuffer(videoUrl) {
        this.videoElement.srcObject = null;
        this.videoElement.src = videoUrl;
        this.videoElement.loop = true;
        this.videoElement.play();
    }

    resumeCamera() {
        this.videoElement.src = "";
        this.videoElement.srcObject = this.stream;
        this.videoElement.loop = false;
        this.videoElement.play();
    }
}
