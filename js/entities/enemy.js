// Enemy entity

function createEnemy(x, y, type = 'basic') {
    const enemyType = CONFIG.ENEMY_TYPES[type] || CONFIG.ENEMY_TYPES.basic;
    return {
        x,
        y,
        type: type,
        hp: enemyType.hp,
        maxHp: enemyType.hp,
        size: enemyType.size,
        speed: enemyType.speed,
        color: enemyType.color,
        active: true,
        // Squiggly movement properties
        squiggleTime: 0,
        squiggleAngle: Math.random() * Math.PI * 2
    };
}

function updateEnemy(enemy, playerPos, deltaTime) {
    if (!enemy.active) return;
    
    const enemyType = CONFIG.ENEMY_TYPES[enemy.type] || CONFIG.ENEMY_TYPES.basic;
    
    // Calculate direction to player
    const dx = playerPos.x - enemy.x;
    const dy = playerPos.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
        let moveX = (dx / dist) * enemy.speed;
        let moveY = (dy / dist) * enemy.speed;
        
        // Squiggly movement pattern
        if (enemy.type === 'squiggly' && enemyType.squiggleAmplitude) {
            enemy.squiggleTime += deltaTime * enemyType.squiggleFrequency;
            
            // Perpendicular direction for squiggle
            const perpX = -dy / dist;
            const perpY = dx / dist;
            
            // Add squiggle offset
            const squiggleOffset = Math.sin(enemy.squiggleTime) * enemyType.squiggleAmplitude * (deltaTime / 16.67);
            moveX += perpX * squiggleOffset;
            moveY += perpY * squiggleOffset;
        }
        
        enemy.x += moveX;
        enemy.y += moveY;
    }
}

function renderEnemy(ctx, enemy, cameraX, cameraY) {
    if (!enemy.active) return;
    
    // Convert world position to screen position
    const screenX = enemy.x - cameraX;
    const screenY = enemy.y - cameraY;
    
    // Only render if on screen (culling optimization)
    const size = enemy.size;
    if (screenX < -size || screenX > canvas.width + size ||
        screenY < -size || screenY > canvas.height + size) {
        return;
    }
    
    ctx.save();
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = CONFIG.ENEMY_LINE_WIDTH;
    
    // Draw enemy based on type
    if (enemy.type === 'tank') {
        // Draw larger square with double border for tanks
        ctx.strokeRect(
            screenX - size / 2,
            screenY - size / 2,
            size,
            size
        );
        ctx.strokeRect(
            screenX - size / 2 + 2,
            screenY - size / 2 + 2,
            size - 4,
            size - 4
        );
    } else {
        // Draw standard square
        ctx.strokeRect(
            screenX - size / 2,
            screenY - size / 2,
            size,
            size
        );
    }
    
    // Add a small crosshair in the center
    ctx.beginPath();
    ctx.moveTo(screenX - size * 0.3, screenY);
    ctx.lineTo(screenX + size * 0.3, screenY);
    ctx.moveTo(screenX, screenY - size * 0.3);
    ctx.lineTo(screenX, screenY + size * 0.3);
    ctx.stroke();
    
    ctx.restore();
}

