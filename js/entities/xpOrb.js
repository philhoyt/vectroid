// XP Orb entity

function createXPOrb(x, y, xpAmount, size = 6) {
    return {
        x,
        y,
        xpAmount: xpAmount,
        size: size, // Size of the orb (bigger for boss orbs)
        active: true,
        collected: false,
        attractedToAbsorber: null // Reference to absorber this orb is moving towards
    };
}

function updateXPOrb(orb, playerPos, deltaTime, orbAbsorbers = []) {
    if (!orb.active || orb.collected) return;
    
    // Check if there's a collecting absorber nearby (priority over player)
    let attractedToAbsorber = null;
    let minAbsorberDist = Infinity;
    
    for (let absorber of orbAbsorbers) {
        if (!absorber.active || !absorber.isCollecting) continue;
        
        const dx = absorber.x - orb.x;
        const dy = absorber.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < CONFIG.ORB_ABSORBER_COLLECTION_RADIUS && dist < minAbsorberDist) {
            minAbsorberDist = dist;
            attractedToAbsorber = absorber;
        }
    }
    
    // Move towards absorber if one is collecting nearby
    if (attractedToAbsorber) {
        orb.attractedToAbsorber = attractedToAbsorber;
        const dx = attractedToAbsorber.x - orb.x;
        const dy = attractedToAbsorber.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            // Move towards absorber (faster than player attraction)
            const speed = 8 + (CONFIG.ORB_ABSORBER_COLLECTION_RADIUS - dist) / 30;
            orb.x += (dx / dist) * speed;
            orb.y += (dy / dist) * speed;
            
            // Collect orb if it reaches the absorber
            if (dist < 15) {
                orb.collected = true;
                orb.active = false;
            }
        }
    } else {
        // No absorber attracting - move toward player if within attraction radius
        orb.attractedToAbsorber = null;
        const dx = playerPos.x - orb.x;
        const dy = playerPos.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const attractionRadius = CONFIG.XP_ATTRACTION_RADIUS;
        if (dist < attractionRadius && dist > 0) {
            // Speed increases as orb gets closer to player (similar to absorber)
            const speed = 4 + (attractionRadius - dist) / 30;
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

