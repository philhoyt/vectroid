// Bullet entity

function createBullet(x, y, angle, speed = null, canSplit = false, splitGeneration = 0) {
    const pierceCount = Upgrades.levels.piercing > 0 ? (2 + Upgrades.levels.piercing - 1) : 0;
    const bulletSpeed = speed !== null ? speed : CONFIG.BULLET_SPEED;
    return {
        x,
        y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        spawnTime: Date.now(),
        active: true,
        pierceCount: pierceCount, // How many enemies this bullet can pierce through
        enemiesHit: [], // Track which enemies this bullet has already hit
        canSplit: canSplit, // Whether this bullet can split on hit
        splitGeneration: splitGeneration // Track how many times this bullet has split (prevent infinite splitting)
    };
}

function updateBullet(bullet, deltaTime, playerPos) {
    if (!bullet.active) return;
    
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    
    // Check lifetime
    const age = Date.now() - bullet.spawnTime;
    if (age > CONFIG.BULLET_LIFETIME) {
        bullet.active = false;
        return;
    }
    
    // Check bounds - despawn if too far from player (world space)
    const dx = bullet.x - playerPos.x;
    const dy = bullet.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Math.max(canvas.width, canvas.height) * 1.5) {
        bullet.active = false;
    }
}

function renderBullet(ctx, bullet, cameraX, cameraY) {
    if (!bullet.active) return;
    
    // Convert world position to screen position
    const screenX = bullet.x - cameraX;
    const screenY = bullet.y - cameraY;
    
    // Only render if on screen (culling optimization)
    if (screenX < -CONFIG.BULLET_SIZE || screenX > canvas.width + CONFIG.BULLET_SIZE ||
        screenY < -CONFIG.BULLET_SIZE || screenY > canvas.height + CONFIG.BULLET_SIZE) {
        return;
    }
    
    ctx.save();
    
    // Change color based on bullet type
    if (bullet.canSplit) {
        ctx.fillStyle = '#ff6600'; // Orange for splitting bullets
        ctx.strokeStyle = '#ff6600';
    } else if (bullet.pierceCount > 0) {
        ctx.fillStyle = '#00ff00'; // Green for piercing bullets
        ctx.strokeStyle = '#00ff00';
    } else {
        ctx.fillStyle = CONFIG.BULLET_COLOR;
        ctx.strokeStyle = CONFIG.BULLET_COLOR;
    }
    
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, CONFIG.BULLET_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

