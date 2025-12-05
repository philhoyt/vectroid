// Orb Absorber entity - collects all XP orbs when player touches it

function createOrbAbsorber(x, y) {
    return {
        x,
        y,
        active: true,
        collected: false,
        isCollecting: false, // When true, orbs are being attracted to it
        collectionStartTime: 0, // When collection started
        pulseTime: 0,
        spawnTime: Date.now() // Track when it was spawned for lifespan
    };
}

function updateOrbAbsorber(absorber, deltaTime) {
    if (!absorber.active || absorber.collected) return;
    
    // Check lifespan (30 seconds)
    const lifespan = 30000; // 30 seconds in milliseconds
    if (Date.now() - absorber.spawnTime > lifespan) {
        absorber.active = false;
        return;
    }
    
    // Animate pulsing effect
    absorber.pulseTime += deltaTime;
}

function renderOrbAbsorber(ctx, absorber, cameraX, cameraY) {
    if (!absorber.active || absorber.collected) return;
    
    // Convert world position to screen position
    const screenX = absorber.x - cameraX;
    const screenY = absorber.y - cameraY;
    
    // Only render if on screen
    const size = 20;
    if (screenX < -size || screenX > canvas.width + size ||
        screenY < -size || screenY > canvas.height + size) {
        return;
    }
    
    ctx.save();
    
    // Pulsing effect
    const pulse = Math.sin(absorber.pulseTime / 200) * 0.3 + 0.7;
    const currentSize = size * pulse;
    
    // Outer glow
    ctx.globalAlpha = 0.2 * pulse;
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(screenX, screenY, currentSize + 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Main circle
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, currentSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner symbol (magnet/collect icon)
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Draw a simple "collect" symbol (circle with arrow)
    ctx.arc(screenX, screenY, currentSize * 0.5, 0, Math.PI * 2);
    ctx.moveTo(screenX + currentSize * 0.3, screenY);
    ctx.lineTo(screenX + currentSize * 0.6, screenY);
    ctx.moveTo(screenX + currentSize * 0.5, screenY - currentSize * 0.2);
    ctx.lineTo(screenX + currentSize * 0.6, screenY);
    ctx.lineTo(screenX + currentSize * 0.5, screenY + currentSize * 0.2);
    ctx.stroke();
    
    ctx.restore();
}

