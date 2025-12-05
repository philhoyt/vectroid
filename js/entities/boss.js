// Boss enemy entity with satellite enemies

function createBoss(x, y) {
    return {
        x,
        y,
        hp: CONFIG.BOSS_HP, // Boss HP from config
        maxHp: CONFIG.BOSS_HP,
        size: 40, // Larger than normal enemies
        speed: CONFIG.BOSS_SPEED, // Use config value
        color: '#ff00ff', // Distinct color (magenta)
        active: true,
        satellites: [], // Array of satellite enemies
        satelliteAngle: 0, // Current rotation angle for satellites
        spawnTime: Date.now(),
        // Dash state
        isDashing: false,
        dashStartTime: 0,
        dashDirection: { x: 0, y: 0 },
        lastDashTime: 0
    };
}

function createSatellite(bossX, bossY, angle, distance) {
    return {
        x: bossX + Math.cos(angle) * distance,
        y: bossY + Math.sin(angle) * distance,
        angle: angle, // Angle around boss
        distance: distance, // Distance from boss
        hp: CONFIG.BOSS_SATELLITE_HP, // Satellites take 3 hits to kill
        maxHp: CONFIG.BOSS_SATELLITE_HP,
        size: 12, // Smaller than boss
        speed: 0.02, // Rotation speed
        color: '#ff88ff', // Lighter magenta
        active: true,
        isSatellite: true // Flag to identify as satellite
    };
}

function updateBoss(boss, playerPos, deltaTime) {
    if (!boss.active) return;
    
    const now = Date.now();
    
    // Check if we should start a dash
    if (!boss.isDashing && now - boss.lastDashTime >= CONFIG.BOSS_DASH_COOLDOWN) {
        const dx = playerPos.x - boss.x;
        const dy = playerPos.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Only dash if player is far enough away
        if (dist > 100) {
            boss.isDashing = true;
            boss.dashStartTime = now;
            // Store dash direction
            if (dist > 0) {
                boss.dashDirection.x = dx / dist;
                boss.dashDirection.y = dy / dist;
            }
        }
    }
    
    // Handle dash movement
    if (boss.isDashing) {
        const dashElapsed = now - boss.dashStartTime;
        if (dashElapsed < CONFIG.BOSS_DASH_DURATION) {
            // Continuously target the player during dash
            const dx = playerPos.x - boss.x;
            const dy = playerPos.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Normalize direction and move at dash speed
                const dirX = dx / dist;
                const dirY = dy / dist;
                boss.x += dirX * CONFIG.BOSS_DASH_SPEED;
                boss.y += dirY * CONFIG.BOSS_DASH_SPEED;
            }
        } else {
            // Dash finished
            boss.isDashing = false;
            boss.lastDashTime = now;
        }
    } else {
        // Normal movement towards player
        const dx = playerPos.x - boss.x;
        const dy = playerPos.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            const moveX = (dx / dist) * boss.speed;
            const moveY = (dy / dist) * boss.speed;
            boss.x += moveX;
            boss.y += moveY;
        }
    }
    
    // Update satellite rotation angle
    boss.satelliteAngle += 0.02; // Rotation speed
    
    // Update satellite positions (orbit around boss)
    for (let satellite of boss.satellites) {
        if (!satellite.active) continue;
        
        // Update angle
        satellite.angle += satellite.speed;
        
        // Update position based on angle and distance from boss
        satellite.x = boss.x + Math.cos(satellite.angle) * satellite.distance;
        satellite.y = boss.y + Math.sin(satellite.angle) * satellite.distance;
    }
    
    // Remove inactive satellites
    boss.satellites = boss.satellites.filter(s => s.active);
}

function renderBoss(ctx, boss, cameraX, cameraY) {
    if (!boss.active) return;
    
    // Convert world position to screen position
    const screenX = boss.x - cameraX;
    const screenY = boss.y - cameraY;
    
    // Only render if on screen
    if (screenX < -boss.size || screenX > canvas.width + boss.size ||
        screenY < -boss.size || screenY > canvas.height + boss.size) {
        return;
    }
    
    ctx.save();
    
    // Draw boss as a diamond shape (outline only, not filled)
    // Change color during dash
    ctx.strokeStyle = boss.isDashing ? '#ffffff' : boss.color;
    ctx.lineWidth = boss.isDashing ? 4 : 3; // Thicker line during dash
    
    ctx.beginPath();
    // Diamond shape: top, right, bottom, left points
    ctx.moveTo(screenX, screenY - boss.size); // top
    ctx.lineTo(screenX + boss.size, screenY); // right
    ctx.lineTo(screenX, screenY + boss.size); // bottom
    ctx.lineTo(screenX - boss.size, screenY); // left
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
    
    // Render satellites
    for (let satellite of boss.satellites) {
        if (!satellite.active) continue;
        renderSatellite(ctx, satellite, cameraX, cameraY);
    }
}

function renderSatellite(ctx, satellite, cameraX, cameraY) {
    if (!satellite.active) return;
    
    // Convert world position to screen position
    const screenX = satellite.x - cameraX;
    const screenY = satellite.y - cameraY;
    
    // Only render if on screen
    if (screenX < -satellite.size || screenX > canvas.width + satellite.size ||
        screenY < -satellite.size || screenY > canvas.height + satellite.size) {
        return;
    }
    
    ctx.save();
    
    // Draw satellite (smaller circle, outline only, not filled)
    ctx.strokeStyle = satellite.color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, satellite.size, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

