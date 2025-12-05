// Bullet entity

function createBullet(x, y, angle, speed = null, canSplit = false, splitGeneration = 0, isHoming = false) {
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
        splitGeneration: splitGeneration, // Track how many times this bullet has split (prevent infinite splitting)
        isHoming: isHoming, // Whether this bullet homes in on enemies
        targetEnemy: null // Current target enemy for homing bullets
    };
}

function updateBullet(bullet, deltaTime, playerPos, enemies = []) {
    if (!bullet.active) return;
    
    // Homing logic for burst bullets
    if (bullet.isHoming && enemies.length > 0) {
        // Find nearest enemy
        let nearestEnemy = null;
        let nearestDist = Infinity;
        
        for (let enemy of enemies) {
            if (!enemy.active) continue;
            
            const dx = enemy.x - bullet.x;
            const dy = enemy.y - bullet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < nearestDist && dist < 400) { // Only home within 400 pixels
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }
        
        // If we have a target, adjust velocity to home in
        if (nearestEnemy) {
            bullet.targetEnemy = nearestEnemy;
            const dx = nearestEnemy.x - bullet.x;
            const dy = nearestEnemy.y - bullet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Calculate desired direction
                const targetAngle = Math.atan2(dy, dx);
                const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                
                // Smoothly rotate towards target (turn rate)
                let angleDiff = targetAngle - currentAngle;
                // Normalize angle difference to [-PI, PI]
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Turn rate: 0.15 radians per frame
                const turnRate = 0.15;
                const turnAmount = Math.max(-turnRate, Math.min(turnRate, angleDiff));
                const newAngle = currentAngle + turnAmount;
                
                // Update velocity while maintaining speed
                const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                bullet.vx = Math.cos(newAngle) * speed;
                bullet.vy = Math.sin(newAngle) * speed;
            }
        }
    }
    
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
    if (bullet.isHoming) {
        ctx.fillStyle = '#ffff00'; // Yellow for homing bullets
        ctx.strokeStyle = '#ffff00';
    } else if (bullet.canSplit) {
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

