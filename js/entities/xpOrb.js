// XP Orb entity

function createXPOrb(x, y, xpAmount, size = 6) {
    return {
        x,
        y,
        xpAmount: xpAmount,
        size: size, // Size of the orb (bigger for boss orbs)
        active: true,
        collected: false
    };
}

function updateXPOrb(orb, playerPos, deltaTime) {
    if (!orb.active || orb.collected) return;
    
    // Move toward player if close enough (magnetic effect)
    const dx = playerPos.x - orb.x;
    const dy = playerPos.y - orb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const pickupRadius = CONFIG.XP_PICKUP_RADIUS;
    if (dist < pickupRadius) { // Magnetic range (scales with upgrade)
        const speed = 3 + (pickupRadius - dist) / 20; // Faster when closer
        if (dist > 0) {
            orb.x += (dx / dist) * speed;
            orb.y += (dy / dist) * speed;
        }
    }
}

function renderXPOrb(ctx, orb, cameraX, cameraY) {
    if (!orb.active || orb.collected) return;
    
    // Convert world position to screen position
    const screenX = orb.x - cameraX;
    const screenY = orb.y - cameraY;
    
    // Only render if on screen
    const size = orb.size || 6;
    if (screenX < -size || screenX > canvas.width + size ||
        screenY < -size || screenY > canvas.height + size) {
        return;
    }
    
    ctx.save();
    
    // Draw XP orb (small glowing circle)
    ctx.fillStyle = '#00ffff';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    
    // Outer glow
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size + 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Main orb
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

