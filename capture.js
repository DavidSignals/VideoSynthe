// capture.js
class VideoCapture {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.onRecordingComplete = null;
        this.facingMode = 'environment'; // default to rear camera if available
    }

    async initCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 },
                    facingMode: this.facingMode
                }, 
                audio: false 
            });
            this.videoElement.srcObject = this.stream;
            this.videoElement.play().catch(e => console.warn("Auto-play prevented", e));
            return true;
        } catch (err) {
            console.warn("Camera with specific facingMode failed, falling back to any camera", err);
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
                    audio: false 
                });
                this.videoElement.srcObject = this.stream;
                this.videoElement.play().catch(e => console.warn("Auto-play prevented", e));
                return true;
            } catch (fallbackErr) {
                console.error("Camera access totally denied or unavailable", fallbackErr);
                return false;
            }
        }
    }

    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        return await this.initCamera();
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
