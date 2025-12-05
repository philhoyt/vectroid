// Asteroid entity (environmental hazard)

function createAsteroid(x, y, targetX, targetY) {
    // Calculate direction toward target (player position when spawned)
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Random size variation (smaller)
    const size = CONFIG.ASTEROID_SIZE_MIN + Math.random() * (CONFIG.ASTEROID_SIZE_MAX - CONFIG.ASTEROID_SIZE_MIN);
    
    // Random HP (2-4 hits)
    const hp = CONFIG.ASTEROID_HP_MIN + Math.floor(Math.random() * (CONFIG.ASTEROID_HP_MAX - CONFIG.ASTEROID_HP_MIN + 1));
    
    // Generate shape points once (irregular polygon)
    const sides = 6; // Fewer sides for smaller asteroids
    const shapePoints = [];
    for (let i = 0; i < sides; i++) {
        const pointAngle = (i / sides) * Math.PI * 2;
        const radius = size * (0.7 + Math.random() * 0.3); // Vary radius for irregularity
        shapePoints.push({ x: Math.cos(pointAngle) * radius, y: Math.sin(pointAngle) * radius });
    }
    
    return {
        x,
        y,
        vx: Math.cos(angle) * CONFIG.ASTEROID_SPEED,
        vy: Math.sin(angle) * CONFIG.ASTEROID_SPEED,
        size: size,
        hp: hp,
        maxHp: hp,
        shapePoints: shapePoints, // Store shape points
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05, // Random rotation
        trail: [], // Trail points for comet effect
        active: true
    };
}

function updateAsteroid(asteroid, deltaTime) {
    if (!asteroid.active) return;
    
    // Add current position to trail
    const now = Date.now();
    asteroid.trail.push({ x: asteroid.x, y: asteroid.y, time: now });
    
    // Keep only recent trail points (last 200ms)
    asteroid.trail = asteroid.trail.filter(point => now - point.time < 200);
    
    // Move in straight line (no tracking)
    asteroid.x += asteroid.vx;
    asteroid.y += asteroid.vy;
    
    // Rotate
    asteroid.rotation += asteroid.rotationSpeed;
}

function renderAsteroid(ctx, asteroid, cameraX, cameraY) {
    if (!asteroid.active) return;
    
    // Convert world position to screen position
    const screenX = asteroid.x - cameraX;
    const screenY = asteroid.y - cameraY;
    
    // Only render if on screen (culling optimization)
    if (screenX < -asteroid.size * 3 || screenX > canvas.width + asteroid.size * 3 ||
        screenY < -asteroid.size * 3 || screenY > canvas.height + asteroid.size * 3) {
        return;
    }
    
    ctx.save();
    
    // Calculate direction of movement for streak
    const speed = Math.sqrt(asteroid.vx * asteroid.vx + asteroid.vy * asteroid.vy);
    const angle = Math.atan2(asteroid.vy, asteroid.vx);
    
    // Draw pixelated comet streak
    const now = Date.now();
    const streakLength = 30 + speed * 10; // Longer streak for faster movement
    const pixelSize = 2; // Size of each pixel in the streak
    
    // Draw trail from history (pixelated)
    if (asteroid.trail.length > 1) {
        for (let i = asteroid.trail.length - 1; i >= 0; i--) {
            const point = asteroid.trail[i];
            const age = now - point.time;
            const alpha = Math.max(0, 1 - (age / 200)); // Fade out over 200ms
            
            if (alpha <= 0) continue;
            
            const trailScreenX = point.x - cameraX;
            const trailScreenY = point.y - cameraY;
            
            // Draw pixelated squares for trail
            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = CONFIG.ASTEROID_COLOR;
            
            // Draw multiple pixels to create streak effect
            const pixelCount = Math.floor(3 - (age / 200) * 2); // Fewer pixels as it fades
            for (let p = 0; p < pixelCount; p++) {
                const offsetX = Math.cos(angle + Math.PI) * (p * pixelSize);
                const offsetY = Math.sin(angle + Math.PI) * (p * pixelSize);
                const px = Math.floor(trailScreenX + offsetX);
                const py = Math.floor(trailScreenY + offsetY);
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }
        }
    }
    
    // Draw main streak (pixelated line)
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = CONFIG.ASTEROID_COLOR;
    
    const streakSteps = Math.floor(streakLength / pixelSize);
    for (let i = 0; i < streakSteps; i++) {
        const t = i / streakSteps;
        const alpha = 0.3 + (1 - t) * 0.3; // Fade from head to tail
        ctx.globalAlpha = alpha;
        
        const offsetX = Math.cos(angle + Math.PI) * (i * pixelSize);
        const offsetY = Math.sin(angle + Math.PI) * (i * pixelSize);
        const px = Math.floor(screenX + offsetX);
        const py = Math.floor(screenY + offsetY);
        
        // Vary pixel size slightly for pixelated effect
        const size = pixelSize + (i % 2); // Alternate between 2 and 3 pixels
        ctx.fillRect(px, py, size, size);
    }
    
    // Draw bright comet head (larger, brighter pixel)
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = CONFIG.ASTEROID_COLOR;
    const headSize = Math.max(3, asteroid.size / 3);
    const headX = Math.floor(screenX);
    const headY = Math.floor(screenY);
    
    // Draw head as a cluster of bright pixels
    ctx.fillRect(headX, headY, headSize, headSize);
    ctx.fillRect(headX + 1, headY, headSize - 1, headSize - 1);
    ctx.fillRect(headX, headY + 1, headSize - 1, headSize - 1);
    
    ctx.restore();
}

