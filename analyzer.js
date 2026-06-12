// analyzer.js
class VideoAnalyzer {
    constructor(videoElement, canvasElement, resolution = 64) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.resolution = resolution;
        this.canvas.width = resolution;
        this.canvas.height = resolution;
        
        this.prevLuma = new Uint8Array(resolution * resolution);
        this.currentData = {
            hue: 0,
            saturation: 0,
            luma: 0,
            motion: 0,
            sceneChange: false
        };
    }

    // Helper: Convert RGB to HSL
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    analyzeFrame() {
        // Guarantee loop continuity, but ensure video has data
        if (this.video.readyState < 2) return this.currentData; // HAVE_CURRENT_DATA or better

        try {
            // Draw current video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, this.resolution, this.resolution);
        } catch (e) {
            // If drawImage fails (e.g. empty video), return old data
            return this.currentData;
        }
        let frame = this.ctx.getImageData(0, 0, this.resolution, this.resolution);
        let data = frame.data;

        let totalH = 0, totalS = 0, totalL = 0;
        let totalMotion = 0;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i+1];
            let b = data[i+2];

            // Convert to HSL
            let [h, s, l] = this.rgbToHsl(r, g, b);
            
            totalH += h;
            totalS += s;
            totalL += l;

            // Pixel index for 1D array
            let pxIndex = i / 4;
            
            // Calculate Luma (approximate brightness) for motion detection
            let luma8 = Math.floor(l * 255);
            let diff = Math.abs(luma8 - this.prevLuma[pxIndex]);
            totalMotion += diff;
            
            // Save current luma for next frame
            this.prevLuma[pxIndex] = luma8;
        }

        let numPixels = this.resolution * this.resolution;
        
        // Averages
        let avgH = totalH / numPixels; // 0 to 1
        let avgS = totalS / numPixels; // 0 to 1
        let avgL = totalL / numPixels; // 0 to 1
        
        // Normalize motion.
        // We lowered the threshold from 50 to 15 to make it EXTREMELY reactive
        let avgMotion = totalMotion / numPixels; 
        let normalizedMotion = Math.min(avgMotion / 15, 1.0); // 0 to 1

        // Detect Scene Change: massive spike in motion
        let sceneChange = false;
        if (normalizedMotion > 0.8 && this.currentData.motion < 0.3) {
            sceneChange = true;
        }

        this.currentData = {
            hue: avgH,
            saturation: avgS,
            luma: avgL,
            motion: normalizedMotion,
            sceneChange: sceneChange
        };

        return this.currentData;
    }
}
