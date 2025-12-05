// Post-processing effects system

const Effects = {
    // Apply vignette (darkened edges) effect
    applyVignette(ctx, width, height, intensity = 0.4, size = 0.6) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Create gradient for vignette
        const gradient = ctx.createRadialGradient(centerX, centerY, maxDist * size, centerX, centerY, maxDist);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    },
    
    // Apply edge distortion (barrel/pincushion effect)
    applyEdgeDistortion(sourceCanvas, targetCtx, strength = 2.0) {
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const sourceCtx = sourceCanvas.getContext('2d');
        const imageData = sourceCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const output = targetCtx.createImageData(width, height);
        const outputData = output.data;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Calculate distance from center (normalized 0-1)
                const dx = (x - centerX) / centerX;
                const dy = (y - centerY) / centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Apply barrel distortion (stronger at edges)
                const distortion = dist * dist * strength; // Quadratic falloff
                const newDx = dx * (1 + distortion);
                const newDy = dy * (1 + distortion);
                
                // Convert back to pixel coordinates
                const srcX = Math.round(centerX + newDx * centerX);
                const srcY = Math.round(centerY + newDy * centerY);
                
                // Clamp to valid range
                const clampedX = Math.max(0, Math.min(width - 1, srcX));
                const clampedY = Math.max(0, Math.min(height - 1, srcY));
                
                // Sample from source
                const srcIdx = (clampedY * width + clampedX) * 4;
                const dstIdx = (y * width + x) * 4;
                
                outputData[dstIdx] = data[srcIdx];
                outputData[dstIdx + 1] = data[srcIdx + 1];
                outputData[dstIdx + 2] = data[srcIdx + 2];
                outputData[dstIdx + 3] = data[srcIdx + 3];
            }
        }
        
        targetCtx.putImageData(output, 0, 0);
    },
    
    // Apply chromatic aberration effect to canvas
    applyChromaticAberration(sourceCanvas, targetCtx, strength = 1.5) {
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const sourceCtx = sourceCanvas.getContext('2d');
        const imageData = sourceCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const output = targetCtx.createImageData(width, height);
        const outputData = output.data;
        
        // Create separate channels with offset
        const redChannel = new Uint8ClampedArray(data.length);
        const greenChannel = new Uint8ClampedArray(data.length);
        const blueChannel = new Uint8ClampedArray(data.length);
        
        // Copy channels with horizontal offset
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Red channel - offset left
                const redX = Math.max(0, Math.min(width - 1, Math.floor(x - strength)));
                const redIdx = (y * width + redX) * 4;
                redChannel[idx] = data[redIdx];
                redChannel[idx + 1] = data[redIdx + 1];
                redChannel[idx + 2] = data[redIdx + 2];
                redChannel[idx + 3] = data[redIdx + 3];
                
                // Green channel - no offset (center)
                greenChannel[idx] = data[idx];
                greenChannel[idx + 1] = data[idx + 1];
                greenChannel[idx + 2] = data[idx + 2];
                greenChannel[idx + 3] = data[idx + 3];
                
                // Blue channel - offset right
                const blueX = Math.max(0, Math.min(width - 1, Math.floor(x + strength)));
                const blueIdx = (y * width + blueX) * 4;
                blueChannel[idx] = data[blueIdx];
                blueChannel[idx + 1] = data[blueIdx + 1];
                blueChannel[idx + 2] = data[blueIdx + 2];
                blueChannel[idx + 3] = data[blueIdx + 3];
            }
        }
        
        // Combine channels
        for (let i = 0; i < data.length; i += 4) {
            outputData[i] = redChannel[i];     // R
            outputData[i + 1] = greenChannel[i + 1]; // G
            outputData[i + 2] = blueChannel[i + 2];  // B
            outputData[i + 3] = data[i + 3];   // A (alpha)
        }
        
        targetCtx.putImageData(output, 0, 0);
    }
};

