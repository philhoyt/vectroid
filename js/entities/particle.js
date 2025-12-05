// Particle system for visual effects

function createParticle(x, y, color = '#ffffff') {
    const angle = Math.random() * Math.PI * 2; // Random direction
    const speed = 1 + Math.random() * 3; // Random speed between 1-4
    return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0, // Start at full life (1.0 = 100%)
        decay: 0.02 + Math.random() * 0.03, // Random decay rate (0.02-0.05)
        size: 2 + Math.random() * 3, // Random size between 2-5
        color: color,
        active: true
    };
}

function createParticleBurst(x, y, count = 8, color = '#ffffff') {
    const particles = [];
    for (let i = 0; i < count; i++) {
        particles.push(createParticle(x, y, color));
    }
    return particles;
}

function updateParticle(particle, deltaTime) {
    if (!particle.active) return;
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Apply friction
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    
    // Decay life
    particle.life -= particle.decay;
    
    // Deactivate when life reaches 0
    if (particle.life <= 0) {
        particle.active = false;
    }
}

function renderParticle(ctx, particle, cameraX, cameraY) {
    if (!particle.active) return;
    
    // Convert world position to screen position
    const screenX = particle.x - cameraX;
    const screenY = particle.y - cameraY;
    
    // Only render if on screen
    if (screenX < -10 || screenX > canvas.width + 10 ||
        screenY < -10 || screenY > canvas.height + 10) {
        return;
    }
    
    ctx.save();
    
    // Fade out as life decreases
    const alpha = particle.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    
    // Draw particle as a small square (pixelated style)
    const size = particle.size * alpha; // Shrink as it fades
    ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
    
    ctx.restore();
}

