// Main game loop and orchestration

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Create offscreen canvas for post-processing effects
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

// Set canvas size to full window (max 1280×800 for performance)
function resizeCanvas() {
    const maxWidth = 1280;
    const maxHeight = 800;
    canvas.width = Math.min(window.innerWidth, maxWidth);
    canvas.height = Math.min(window.innerHeight, maxHeight);
    // Update config to match actual canvas size
    CONFIG.CANVAS_WIDTH = canvas.width;
    CONFIG.CANVAS_HEIGHT = canvas.height;
    // Resize offscreen canvas
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener('resize', resizeCanvas);

// Game state
let bullets = [];
let enemies = [];
let xpOrbs = [];
let orbAbsorbers = [];
let asteroids = [];
let bosses = [];
let particles = []; // Particle effects
let lastTime = 0;
let gameState = 'playing'; // 'playing', 'gameOver', 'upgrade', 'paused'
let score = 0;
let xp = 0;
let level = 1;
let lives = 3; // Start with 3 lives
let respawnTimer = 0; // Timer for auto-respawn
let availableUpgrades = [];
let selectedUpgradeIndex = 0; // Currently selected upgrade index for controller navigation
let upgradeScrollOffset = 0; // Scroll offset for upgrade menu

// Screen shake state
let screenShake = {
    intensity: 0,
    duration: 0,
    startTime: 0
};

// Calculate XP required for a specific level (exponential)
function getXPForLevel(targetLevel) {
    if (targetLevel <= 1) return CONFIG.XP_BASE;
    return Math.floor(CONFIG.XP_BASE * Math.pow(CONFIG.XP_MULTIPLIER, targetLevel - 1));
}

// Calculate total XP needed to reach a specific level (cumulative)
function getTotalXPForLevel(targetLevel) {
    let total = 0;
    for (let i = 1; i < targetLevel; i++) {
        total += getXPForLevel(i);
    }
    return total;
}

// Get current level based on total XP
function getLevelFromXP(totalXP) {
    let currentLevel = 1;
    let xpNeeded = 0;
    while (xpNeeded <= totalXP) {
        xpNeeded += getXPForLevel(currentLevel);
        if (xpNeeded <= totalXP) {
            currentLevel++;
        }
    }
    return currentLevel;
}

// Initialize systems
Input.init();
Player.init(canvas);
Spawn.init();
Upgrades.init();
Sound.init();
score = 0;
xp = 0;
level = 1;
availableUpgrades = [];

    // Reset spawn system on game start
function resetGame() {
    score = 0;
    xp = 0;
    level = 1;
    lives = 3; // Reset to 3 lives
    respawnTimer = 0; // Reset respawn timer
    availableUpgrades = [];
    selectedUpgradeIndex = 0;
    upgradeScrollOffset = 0;
    bullets = [];
    enemies = [];
    xpOrbs = [];
    orbAbsorbers = [];
    asteroids = [];
    bosses = [];
    particles = []; // Reset particles
    gameState = 'playing';
    
    // Reset screen shake
    screenShake.duration = 0;
    screenShake.intensity = 0;
    screenShake.startTime = 0;
    
    // Reset all systems
    Player.init(canvas);
    Spawn.init();
    Upgrades.init();
    Sound.init();
}

// Respawn player after death (if lives remaining)
function respawnPlayer() {
    // Clear nearby enemies and bullets for safety
    const playerPos = Player.getPosition();
    enemies = enemies.filter(enemy => {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist > 200; // Clear enemies within 200 pixels
    });
    bullets = bullets.filter(bullet => {
        const dx = bullet.x - playerPos.x;
        const dy = bullet.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist > 200; // Clear bullets within 200 pixels
    });
    
    // Reset player
    Player.alive = true;
    Player.x = 0;
    Player.y = 0;
    Player.vx = 0;
    Player.vy = 0;
    Player.isDashing = false;
    Player.dashCooldown = 0;
    Player.dashTrail = [];
}

function update(deltaTime) {
    // Update gamepad state first (before checking buttons)
    // This needs to happen before we check button states
    if (Input.gamepad || navigator.getGamepads().length > 0) {
        Input.updateGamepad();
    }
    
    // Check for pause/unpause (Escape key or Start button when playing/paused)
    const startButtonPressed = Input.gamepad && Input.wasGamepadButtonJustPressed(9);
    if (Input.wasJustPressed('Escape')) {
        if (gameState === 'playing') {
            gameState = 'paused';
        } else if (gameState === 'paused') {
            gameState = 'playing';
        }
    }
    
    // Start button: pause/unpause when playing/paused, restart when gameOver
    if (startButtonPressed) {
        if (gameState === 'playing') {
            gameState = 'paused';
        } else if (gameState === 'paused') {
            gameState = 'playing';
        } else if (gameState === 'gameOver') {
            resetGame();
        }
    }
    
    // Check for restart (R key works from any state)
    if (Input.wasJustPressed('r') || Input.wasJustPressed('R')) {
        resetGame();
    }
    
    if (gameState === 'paused') {
        // Clear input after checking
        Input.update();
        return;
    }
    
    if (gameState === 'upgrade') {
        // Reset selected index when entering upgrade screen
        if (selectedUpgradeIndex >= availableUpgrades.length) {
            selectedUpgradeIndex = 0;
        }
        
        // Calculate how many upgrades can fit on screen
        const optionHeight = 80;
        const startY = 220;
        const visibleUpgrades = Math.floor((canvas.height - startY - 100) / optionHeight);
        
        // Handle controller navigation (D-pad up/down)
        if (Input.gamepad) {
            // D-pad up (button 12)
            if (Input.wasGamepadButtonJustPressed(12)) {
                selectedUpgradeIndex = Math.max(0, selectedUpgradeIndex - 1);
                // Scroll if selected item is above visible area
                if (selectedUpgradeIndex < upgradeScrollOffset) {
                    upgradeScrollOffset = selectedUpgradeIndex;
                }
            }
            // D-pad down (button 13)
            if (Input.wasGamepadButtonJustPressed(13)) {
                selectedUpgradeIndex = Math.min(availableUpgrades.length - 1, selectedUpgradeIndex + 1);
                // Scroll if selected item is below visible area
                if (selectedUpgradeIndex >= upgradeScrollOffset + visibleUpgrades) {
                    upgradeScrollOffset = selectedUpgradeIndex - visibleUpgrades + 1;
                }
            }
            
            // A button (button 0) or X button (button 2) to select
            if (Input.wasGamepadButtonJustPressed(0) || Input.wasGamepadButtonJustPressed(2)) {
                if (availableUpgrades[selectedUpgradeIndex]) {
                    Upgrades.applyUpgrade(availableUpgrades[selectedUpgradeIndex].id);
                    gameState = 'playing';
                    availableUpgrades = [];
                    selectedUpgradeIndex = 0;
                    upgradeScrollOffset = 0;
                }
            }
        }
        
        // Handle upgrade selection with number keys (only for first 9 upgrades)
        for (let i = 0; i < Math.min(9, availableUpgrades.length); i++) {
            const key = String(i + 1);
            if (Input.isPressed(key) && availableUpgrades[i]) {
                Upgrades.applyUpgrade(availableUpgrades[i].id);
                gameState = 'playing';
                availableUpgrades = [];
                selectedUpgradeIndex = 0;
                upgradeScrollOffset = 0;
                break;
            }
        }
        
        // Handle mouse clicks on upgrade boxes
        if (Input.mouseClicked) {
            const mouseX = Input.mouseX;
            const mouseY = Input.mouseY;
            
            // Calculate upgrade box positions (same as render code)
            const startY = 220;
            const optionHeight = 80;
            const boxWidth = 600;
            const boxX = (canvas.width - boxWidth) / 2;
            const visibleUpgrades = Math.floor((canvas.height - startY - 100) / optionHeight);
            
            // Check which upgrade box was clicked (only visible ones)
            for (let i = upgradeScrollOffset; i < Math.min(upgradeScrollOffset + visibleUpgrades, availableUpgrades.length); i++) {
                const y = startY + (i - upgradeScrollOffset) * optionHeight;
                if (mouseX >= boxX && mouseX <= boxX + boxWidth &&
                    mouseY >= y && mouseY <= y + (optionHeight - 10)) {
                    // Clicked on this upgrade
                    Upgrades.applyUpgrade(availableUpgrades[i].id);
                    gameState = 'playing';
                    availableUpgrades = [];
                    selectedUpgradeIndex = 0;
                    upgradeScrollOffset = 0;
                    break;
                }
            }
        }
        
        // Clear input after checking
        Input.update();
        return;
    }
    
    if (gameState !== 'playing') {
        Input.update();
        return;
    }
    
    // Calculate camera offset for mouse angle calculation
    const playerPos = Player.getPosition();
    const cameraX = playerPos.x - canvas.width / 2;
    const cameraY = playerPos.y - canvas.height / 2;
    
    // Automatic burst fire every 15 seconds
    if (Player.shouldFireBurst()) {
        Player.fireBurst(bullets);
    }
    
    // Debug: Spawn boss with 'b' key
    if (Input.wasJustPressed('b')) {
        Spawn.spawnBoss(bosses, playerPos);
    }
    
    // Debug: Show all upgrades menu with 'v' key
    if (Input.wasJustPressed('v')) {
        // Show all available upgrades with their current levels
        availableUpgrades = Upgrades.options.map(upgrade => ({
            ...upgrade,
            level: Upgrades.levels[upgrade.id] || 0,
            description: upgrade.getDescription(Upgrades.levels[upgrade.id] || 0)
        }));
        selectedUpgradeIndex = 0;
        upgradeScrollOffset = 0; // Reset scroll
        gameState = 'upgrade';
    }
    
    // Update player (pass camera for mouse angle calculation)
    const wasDashing = Player.isDashing;
    Player.update(deltaTime, cameraX, cameraY);
    // Check if dash just started
    if (!wasDashing && Player.isDashing) {
        // Small screen shake on dash for impact
        triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY * 0.4, CONFIG.SCREEN_SHAKE_DURATION * 0.3);
    }
    
    // Clear input after all checks are done
    Input.update();
    
    // Update bullets
    for (let bullet of bullets) {
        updateBullet(bullet, deltaTime, playerPos, enemies);
    }
    bullets = bullets.filter(b => b.active);
    
    // Update particles
    for (let particle of particles) {
        updateParticle(particle, deltaTime);
    }
    particles = particles.filter(p => p.active);
    
    // Update enemies
    for (let enemy of enemies) {
        updateEnemy(enemy, playerPos, deltaTime);
    }
    enemies = enemies.filter(e => e.active);
    
    // Spawn systems
    Spawn.updateEnemies(enemies, playerPos);
    Spawn.updateBullets(bullets, playerPos, Player.angle);
    Spawn.updateOrbAbsorbers(orbAbsorbers, playerPos);
    Spawn.updateAsteroids(asteroids, playerPos);
    Spawn.updateBosses(bosses, playerPos);
    
    // Check if player is standing still (using velocity to account for momentum drift)
    Spawn.checkStandingStill(playerPos, Player, enemies);
    
    // Collisions
    const killedEnemies = Collision.handleCollisions(bullets, enemies, Player, asteroids, bosses);
    
    // Handle player-asteroid collisions (asteroids kill player on contact, but don't grant XP)
    if (!Player.isDashing && Player.alive) {
        for (let asteroid of asteroids) {
            if (!asteroid.active) continue;
            if (Collision.checkPlayerAsteroid(playerPos, asteroid)) {
                Player.alive = false;
                break;
            }
        }
    }
    
    // Drop XP orbs from killed enemies
    let regularEnemyKills = 0;
    for (const killed of killedEnemies) {
        if (killed.isBoss) {
            // Boss gives more XP and score, and drops a bigger orb
            score += CONFIG.SCORE_PER_KILL * 10;
            xpOrbs.push(createXPOrb(killed.x, killed.y, CONFIG.XP_PER_KILL * 20, 12)); // Bigger orb (12 instead of 6) with 20x XP
            // Create more particles for boss death, using boss color
            const particleColor = killed.color || '#ff00ff'; // Fallback to magenta if no color
            particles.push(...createParticleBurst(killed.x, killed.y, 20, particleColor));
            // Screen shake on boss kill
            triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY * 2, CONFIG.SCREEN_SHAKE_DURATION * 2);
            Sound.playBossDestroy();
        } else {
            regularEnemyKills++;
            score += CONFIG.SCORE_PER_KILL;
            xpOrbs.push(createXPOrb(killed.x, killed.y, CONFIG.XP_PER_KILL));
            // Create particle burst on enemy death, using enemy color
            const particleColor = killed.color || '#ff0000'; // Fallback to red if no color
            particles.push(...createParticleBurst(killed.x, killed.y, 8, particleColor));
            Sound.playEnemyDestroy();
        }
    }
    
    // Screen shake for multi-kills (only once per frame, intensity scales with kill count)
    if (regularEnemyKills > 1) {
        const multiKillIntensity = Math.min(CONFIG.SCREEN_SHAKE_INTENSITY * 0.5, CONFIG.SCREEN_SHAKE_INTENSITY * 0.2 * regularEnemyKills);
        triggerScreenShake(multiKillIntensity, CONFIG.SCREEN_SHAKE_DURATION * 0.5);
    }
    
    // Update XP orbs
    for (let orb of xpOrbs) {
        updateXPOrb(orb, playerPos, deltaTime, orbAbsorbers);
    }
    xpOrbs = xpOrbs.filter(o => o.active);
    
    // Update orb absorbers
    for (let absorber of orbAbsorbers) {
        updateOrbAbsorber(absorber, deltaTime);
    }
    orbAbsorbers = orbAbsorbers.filter(a => a.active);
    
    // Update asteroids
    for (let asteroid of asteroids) {
        updateAsteroid(asteroid, deltaTime);
    }
    // Despawn asteroids that are too far from player
    asteroids = asteroids.filter(a => {
        if (!a.active) return false;
        const dx = a.x - playerPos.x;
        const dy = a.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < Math.max(canvas.width, canvas.height) * 2; // Keep within reasonable distance
    });
    
    // Update bosses
    for (let boss of bosses) {
        updateBoss(boss, playerPos, deltaTime);
    }
    bosses = bosses.filter(b => b.active);
    
    // Check for orb absorber collection (collects all orbs)
    const absorberXP = Collision.handleOrbAbsorberCollection(orbAbsorbers, xpOrbs, Player);
    if (absorberXP > 0) {
        // Screen shake when collecting orb absorber (collects many orbs at once)
        triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY * 1.5, CONFIG.SCREEN_SHAKE_DURATION * 1.5);
        xp += absorberXP;
    }
    
    // Collect XP orbs normally
    const collectedXP = Collision.handleXPOrbCollection(xpOrbs, Player);
    xp += collectedXP;
    
    // Check for level up (exponential XP requirements)
    const newLevel = getLevelFromXP(xp);
    if (newLevel > level) {
        const oldLevel = level;
        level = newLevel;
        // Screen shake on level up
        triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY, CONFIG.SCREEN_SHAKE_DURATION);
        
        // Earn a life every 5 levels
        if (level % 5 === 0 && level > oldLevel) {
            lives++;
            // Extra screen shake for earning a life
            triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY * 1.5, CONFIG.SCREEN_SHAKE_DURATION * 1.5);
        }
        
        availableUpgrades = Upgrades.getRandomUpgrades(CONFIG.UPGRADE_OPTIONS_COUNT);
        selectedUpgradeIndex = 0; // Reset selection when showing new upgrades
        upgradeScrollOffset = 0; // Reset scroll
        gameState = 'upgrade';
    }
    
    // Check for player death
    if (!Player.alive && gameState === 'playing' && respawnTimer === 0) {
        lives--;
        if (lives > 0) {
            // Start respawn timer (2 seconds)
            respawnTimer = 2000; // 2 seconds in milliseconds
            // Create particle burst at player death location
            const playerPos = Player.getPosition();
            particles.push(...createParticleBurst(playerPos.x, playerPos.y, 30, '#ffffff'));
            // Screen shake on death
            triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY * 2, CONFIG.SCREEN_SHAKE_DURATION * 2);
        } else {
            // No lives left - game over
            gameState = 'gameOver';
            // Create particle burst at player death location
            const playerPos = Player.getPosition();
            particles.push(...createParticleBurst(playerPos.x, playerPos.y, 30, '#ffffff'));
            // Screen shake on death
            triggerScreenShake(CONFIG.SCREEN_SHAKE_INTENSITY * 2, CONFIG.SCREEN_SHAKE_DURATION * 2);
        }
    }
    
    // Handle auto-respawn timer
    if (respawnTimer > 0) {
        respawnTimer -= deltaTime;
        if (respawnTimer <= 0) {
            respawnPlayer();
            respawnTimer = 0;
        }
    }
}

function render() {
    // Use offscreen canvas for rendering if chromatic aberration is enabled
    // Only apply to playing state for performance
    const useOffscreen = CONFIG.CHROMATIC_ABERRATION_ENABLED && gameState === 'playing';
    const renderCtx = useOffscreen ? offscreenCtx : ctx;
    
    // Clear canvas (always clear main canvas first)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (useOffscreen) {
        // Also clear offscreen canvas if using it
        renderCtx.fillStyle = '#0a0a0a';
        renderCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    if (gameState === 'playing') {
        // Calculate camera offset to keep player centered
        const playerPos = Player.getPosition();
        let cameraX = playerPos.x - canvas.width / 2;
        let cameraY = playerPos.y - canvas.height / 2;
        
        // Apply screen shake
        if (screenShake.duration > 0) {
            const elapsed = Date.now() - screenShake.startTime;
            if (elapsed < screenShake.duration) {
                // Calculate shake intensity (decay over time)
                const progress = elapsed / screenShake.duration;
                const currentIntensity = screenShake.intensity * (1 - progress);
                
                // Add random offset
                const shakeX = (Math.random() - 0.5) * 2 * currentIntensity;
                const shakeY = (Math.random() - 0.5) * 2 * currentIntensity;
                
                cameraX += shakeX;
                cameraY += shakeY;
            } else {
                // Shake finished
                screenShake.duration = 0;
                screenShake.intensity = 0;
            }
        }
        
        // Render grid
        renderGrid(renderCtx, cameraX, cameraY);
        
        // Render orb absorbers
        for (let absorber of orbAbsorbers) {
            renderOrbAbsorber(renderCtx, absorber, cameraX, cameraY);
        }
        
        // Render XP orbs
        for (let orb of xpOrbs) {
            renderXPOrb(renderCtx, orb, cameraX, cameraY);
        }
        
        // Render particles (behind bullets for layering)
        for (let particle of particles) {
            renderParticle(renderCtx, particle, cameraX, cameraY);
        }
        
        // Render bullets
        for (let bullet of bullets) {
            renderBullet(renderCtx, bullet, cameraX, cameraY);
        }
        
        // Render enemies
        for (let enemy of enemies) {
            renderEnemy(renderCtx, enemy, cameraX, cameraY);
        }
        
        // Render asteroids
        for (let asteroid of asteroids) {
            renderAsteroid(renderCtx, asteroid, cameraX, cameraY);
        }
        
        // Render bosses (includes satellites)
        for (let boss of bosses) {
            renderBoss(renderCtx, boss, cameraX, cameraY);
        }
        
        // Render player (always at screen center)
        Player.render(renderCtx, cameraX, cameraY);
        
        // Render UI (screen space, not affected by camera)
        renderCtx.fillStyle = '#ffffff';
        renderCtx.font = '20px Courier New';
        renderCtx.textAlign = 'left';
        renderCtx.textBaseline = 'top';
        renderCtx.fillText(`Score: ${score}`, 10, 10);
        renderCtx.fillText(`Level: ${level}`, 10, 35);
        renderCtx.fillText(`Lives: ${lives}`, 10, 60);
        
        // Render upgrade summary (Risk of Rain style)
        const upgrades = Upgrades.getUpgradeSummary();
        if (upgrades.length > 0) {
            renderCtx.font = '14px Courier New';
            let upgradeY = canvas.height - 20 - (upgrades.length * 18);
            upgrades.forEach(upgrade => {
                // Color rare upgrades purple
                const upgradeOption = Upgrades.options.find(o => o.id === upgrade.id);
                renderCtx.fillStyle = (upgradeOption && upgradeOption.isRare) ? '#ff00ff' : '#00ffff';
                renderCtx.fillText(`${upgrade.name} x${upgrade.level}`, 10, upgradeY);
                upgradeY += 18;
            });
        }
        
        // Render XP bar (Warcraft style) - at bottom of screen
        const xpBarWidth = canvas.width - 40; // Full width minus padding
        const xpBarHeight = 20;
        const xpBarX = 20;
        const xpBarY = canvas.height - 40; // Near bottom of screen
        
        // Calculate XP progress for current level (exponential)
        const xpForCurrentLevel = getXPForLevel(level);
        const totalXPForCurrentLevel = getTotalXPForLevel(level);
        const xpInCurrentLevel = xp - totalXPForCurrentLevel;
        const xpProgress = Math.max(0, Math.min(1, xpInCurrentLevel / xpForCurrentLevel));
        const fillWidth = xpBarWidth * xpProgress;
        
        // Draw XP bar background
        renderCtx.fillStyle = '#333333';
        renderCtx.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);
        
        // Draw XP bar fill
        renderCtx.fillStyle = '#00ff00';
        renderCtx.fillRect(xpBarX, xpBarY, fillWidth, xpBarHeight);
        
        // Draw XP bar border
        renderCtx.strokeStyle = '#ffffff';
        renderCtx.lineWidth = 2;
        renderCtx.strokeRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);
        
        // Draw XP text on bar
        renderCtx.fillStyle = '#ffffff';
        renderCtx.font = '14px Courier New';
        renderCtx.textAlign = 'center';
        renderCtx.fillText(`${Math.floor(xpInCurrentLevel)} / ${xpForCurrentLevel}`, xpBarX + xpBarWidth / 2, xpBarY + 2);
    } else if (gameState === 'upgrade') {
        // Render game in background (paused)
        const playerPos = Player.getPosition();
        const cameraX = playerPos.x - canvas.width / 2;
        const cameraY = playerPos.y - canvas.height / 2;
        
        // Render grid
        renderGrid(ctx, cameraX, cameraY);
        
        // Render orb absorbers
        for (let absorber of orbAbsorbers) {
            renderOrbAbsorber(ctx, absorber, cameraX, cameraY);
        }
        
        // Render XP orbs
        for (let orb of xpOrbs) {
            renderXPOrb(ctx, orb, cameraX, cameraY);
        }
        
        // Render bullets
        for (let bullet of bullets) {
            renderBullet(ctx, bullet, cameraX, cameraY);
        }
        
        // Render enemies
        for (let enemy of enemies) {
            renderEnemy(ctx, enemy, cameraX, cameraY);
        }
        
        // Render asteroids
        for (let asteroid of asteroids) {
            renderAsteroid(ctx, asteroid, cameraX, cameraY);
        }
        
        // Render bosses (includes satellites)
        for (let boss of bosses) {
            renderBoss(ctx, boss, cameraX, cameraY);
        }
        
        // Render player
        Player.render(ctx, cameraX, cameraY);
        
        // Render dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render upgrade selection screen
        ctx.fillStyle = '#ffffff';
        ctx.font = '36px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('LEVEL UP!', canvas.width / 2, 100);
        ctx.font = '24px Courier New';
        ctx.fillText('Choose an upgrade:', canvas.width / 2, 160);
        
        // Render upgrade options with scrolling
        const startY = 220;
        const optionHeight = 80;
        const boxWidth = 600;
        const boxX = (canvas.width - boxWidth) / 2;
        const visibleUpgrades = Math.floor((canvas.height - startY - 100) / optionHeight);
        
        // Only render visible upgrades
        const endIndex = Math.min(upgradeScrollOffset + visibleUpgrades, availableUpgrades.length);
        for (let i = upgradeScrollOffset; i < endIndex; i++) {
            const upgrade = availableUpgrades[i];
            const index = i;
            const y = startY + (index - upgradeScrollOffset) * optionHeight;
            const isSelected = (Input.gamepad && index === selectedUpgradeIndex);
            
            // Draw option box (highlight if selected with controller)
            // Color rare upgrades purple
            const isRare = upgrade.isRare || false;
            ctx.strokeStyle = isRare ? (isSelected ? '#ff00ff' : '#ff00ff') : (isSelected ? '#00ffff' : '#ffffff');
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.strokeRect(boxX, y, boxWidth, optionHeight - 10);
            
            // Highlight background if selected
            if (isSelected) {
                ctx.fillStyle = isRare ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect(boxX, y, boxWidth, optionHeight - 10);
            }
        
        // Draw option text - color rare upgrades purple
        
        ctx.fillStyle = isRare ? (isSelected ? '#ff88ff' : '#ff00ff') : (isSelected ? '#00ffff' : '#ffffff');
        ctx.font = '20px Courier New';
        ctx.textAlign = 'left';
        const levelText = upgrade.level > 0 ? ` (Lv.${upgrade.level + 1})` : '';
        ctx.fillText(`${index + 1}. ${upgrade.name}${levelText}`, boxX + 20, y + 15);
        ctx.font = '16px Courier New';
        ctx.fillStyle = isRare ? (isSelected ? '#ffaaff' : '#ff88ff') : (isSelected ? '#88ffff' : '#cccccc');
        ctx.fillText(upgrade.description, boxX + 20, y + 45);
        }
        
        // Show scroll indicator if there are more upgrades
        if (availableUpgrades.length > visibleUpgrades) {
            ctx.fillStyle = '#888888';
            ctx.font = '14px Courier New';
            ctx.textAlign = 'center';
            if (upgradeScrollOffset > 0) {
                ctx.fillText('↑ More above', canvas.width / 2, startY - 20);
            }
            if (upgradeScrollOffset + visibleUpgrades < availableUpgrades.length) {
                ctx.fillText('↓ More below', canvas.width / 2, canvas.height - 30);
            }
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Courier New';
        ctx.textAlign = 'center';
        if (Input.gamepad) {
            ctx.fillText('Use D-pad to navigate, A/X to select', canvas.width / 2, canvas.height - 50);
        } else {
            ctx.fillText('Press 1, 2, or 3 to select, or click an upgrade', canvas.width / 2, canvas.height - 50);
        }
    } else if (gameState === 'gameOver') {
        // Game over screen
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '32px Courier New';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(`Reached Level: ${level}`, canvas.width / 2, canvas.height / 2 + 60);
        ctx.font = '24px Courier New';
        ctx.fillText('Press R or Start to restart', canvas.width / 2, canvas.height / 2 + 100);
    } else if (gameState === 'paused') {
        // Render game in background (paused)
        const playerPos = Player.getPosition();
        const cameraX = playerPos.x - canvas.width / 2;
        const cameraY = playerPos.y - canvas.height / 2;
        
        // Render grid
        renderGrid(ctx, cameraX, cameraY);
        
        // Render orb absorbers
        for (let absorber of orbAbsorbers) {
            renderOrbAbsorber(ctx, absorber, cameraX, cameraY);
        }
        
        // Render XP orbs
        for (let orb of xpOrbs) {
            renderXPOrb(ctx, orb, cameraX, cameraY);
        }
        
        // Render particles
        for (let particle of particles) {
            renderParticle(ctx, particle, cameraX, cameraY);
        }
        
        // Render bullets
        for (let bullet of bullets) {
            renderBullet(ctx, bullet, cameraX, cameraY);
        }
        
        // Render enemies
        for (let enemy of enemies) {
            renderEnemy(ctx, enemy, cameraX, cameraY);
        }
        
        // Render asteroids
        for (let asteroid of asteroids) {
            renderAsteroid(ctx, asteroid, cameraX, cameraY);
        }
        
        // Render bosses (includes satellites)
        for (let boss of bosses) {
            renderBoss(ctx, boss, cameraX, cameraY);
        }
        
        // Render player
        Player.render(ctx, cameraX, cameraY);
        
        // Render UI (score, level, etc.)
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Courier New';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${score}`, 10, 10);
        ctx.fillText(`Level: ${level}`, 10, 35);
        ctx.fillText(`Lives: ${lives}`, 10, 60);
        
        // Render upgrade summary
        const upgrades = Upgrades.getUpgradeSummary();
        if (upgrades.length > 0) {
            ctx.font = '14px Courier New';
            let upgradeY = canvas.height - 20 - (upgrades.length * 18);
            upgrades.forEach(upgrade => {
                // Color rare upgrades purple
                const upgradeOption = Upgrades.options.find(o => o.id === upgrade.id);
                ctx.fillStyle = (upgradeOption && upgradeOption.isRare) ? '#ff00ff' : '#00ffff';
                ctx.fillText(`${upgrade.name} x${upgrade.level}`, 10, upgradeY);
                upgradeY += 18;
            });
        }
        
        // Render dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render pause text
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Courier New';
        ctx.fillText('Press Escape or Start to resume', canvas.width / 2, canvas.height / 2 + 50);
        return; // Exit early, don't apply post-processing
    }
    
    // Apply post-processing effects if enabled
    if (useOffscreen) {
        // Apply edge distortion first (if enabled)
        if (CONFIG.EDGE_DISTORTION_ENABLED) {
            const distortionCanvas = document.createElement('canvas');
            distortionCanvas.width = canvas.width;
            distortionCanvas.height = canvas.height;
            const distortionCtx = distortionCanvas.getContext('2d');
            Effects.applyEdgeDistortion(offscreenCanvas, distortionCtx, CONFIG.EDGE_DISTORTION_STRENGTH);
            // Apply chromatic aberration to distorted canvas
            if (CONFIG.CHROMATIC_ABERRATION_ENABLED) {
                Effects.applyChromaticAberration(distortionCanvas, ctx, CONFIG.CHROMATIC_ABERRATION_STRENGTH);
            } else {
                ctx.drawImage(distortionCanvas, 0, 0);
            }
        } else {
            // Apply chromatic aberration directly
            if (CONFIG.CHROMATIC_ABERRATION_ENABLED) {
                Effects.applyChromaticAberration(offscreenCanvas, ctx, CONFIG.CHROMATIC_ABERRATION_STRENGTH);
            } else {
                ctx.drawImage(offscreenCanvas, 0, 0);
            }
        }
        
        // Apply vignette on top (always on main canvas)
        if (CONFIG.VIGNETTE_ENABLED) {
            Effects.applyVignette(ctx, canvas.width, canvas.height, CONFIG.VIGNETTE_INTENSITY, CONFIG.VIGNETTE_SIZE);
        }
    } else {
        // Apply vignette even if other effects are disabled
        if (CONFIG.VIGNETTE_ENABLED) {
            Effects.applyVignette(ctx, canvas.width, canvas.height, CONFIG.VIGNETTE_INTENSITY, CONFIG.VIGNETTE_SIZE);
        }
    }
}

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

// Screen shake function
function triggerScreenShake(intensity, duration) {
    screenShake.intensity = intensity;
    screenShake.duration = duration;
    screenShake.startTime = Date.now();
}

// Grid rendering function
function renderGrid(ctx, cameraX, cameraY) {
    ctx.save();
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = CONFIG.GRID_LINE_WIDTH;
    
    const gridSize = CONFIG.GRID_SIZE;
    
    // Calculate grid bounds (world coordinates)
    const startX = Math.floor(cameraX / gridSize) * gridSize;
    const endX = Math.ceil((cameraX + canvas.width) / gridSize) * gridSize;
    const startY = Math.floor(cameraY / gridSize) * gridSize;
    const endY = Math.ceil((cameraY + canvas.height) / gridSize) * gridSize;
    
    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
        const screenX = x - cameraX;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
        const screenY = y - cameraY;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Start game loop
requestAnimationFrame(gameLoop);

