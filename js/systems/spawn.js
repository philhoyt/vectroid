// Spawn system for enemies and bullets

const Spawn = {
    lastEnemySpawn: 0,
    lastBulletFire: 0,
    lastOrbAbsorberSpawn: 0,
    lastAsteroidSpawn: 0,
    lastBossSpawn: 0,
    currentSpawnInterval: CONFIG.ENEMY_SPAWN_INTERVAL,
    lastDifficultyUpdate: 0,
    gameStartTime: 0,
    playerMovementHistory: [], // Track recent player positions to detect direction
    lastPlayerPosition: null, // Track last position for standing still detection
    standingStillStartTime: null, // When player started standing still
    lastSwarmSpawn: 0, // Track last swarm spawn time for cooldown
    
    init() {
        this.lastEnemySpawn = Date.now();
        this.lastBulletFire = Date.now();
        this.lastOrbAbsorberSpawn = Date.now();
        this.lastAsteroidSpawn = Date.now();
        this.lastBossSpawn = Date.now();
        this.currentSpawnInterval = CONFIG.ENEMY_SPAWN_INTERVAL;
        this.lastDifficultyUpdate = Date.now();
        this.gameStartTime = Date.now();
        this.playerMovementHistory = [];
        this.lastPlayerPosition = null;
        this.standingStillStartTime = null;
        this.lastSwarmSpawn = 0;
    },
    
    updateMovementHistory(playerPos) {
        const now = Date.now();
        // Add current position with timestamp
        this.playerMovementHistory.push({ x: playerPos.x, y: playerPos.y, time: now });
        
        // Keep only recent history (within threshold time)
        const threshold = CONFIG.MOVEMENT_DIRECTION_THRESHOLD;
        this.playerMovementHistory = this.playerMovementHistory.filter(
            entry => now - entry.time <= threshold
        );
    },
    
    getPlayerMovementDirection() {
        if (this.playerMovementHistory.length < 2) return null;
        
        // Get first and last positions in history
        const first = this.playerMovementHistory[0];
        const last = this.playerMovementHistory[this.playerMovementHistory.length - 1];
        
        // Calculate overall direction
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Need minimum movement to consider it a direction
        if (distance < 50) return null;
        
        const angle = Math.atan2(dy, dx);
        
        // Check if movement is consistent (all recent movements are in similar direction)
        const tolerance = CONFIG.MOVEMENT_DIRECTION_ANGLE_TOLERANCE;
        let consistentCount = 0;
        
        for (let i = 1; i < this.playerMovementHistory.length; i++) {
            const prev = this.playerMovementHistory[i - 1];
            const curr = this.playerMovementHistory[i];
            const segDx = curr.x - prev.x;
            const segDy = curr.y - prev.y;
            const segDist = Math.sqrt(segDx * segDx + segDy * segDy);
            
            // Only check segments with meaningful movement
            if (segDist > 10) {
                const segAngle = Math.atan2(segDy, segDx);
                // Check if angle difference is within tolerance
                let angleDiff = Math.abs(segAngle - angle);
                // Normalize to [-PI, PI]
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                if (angleDiff <= tolerance) {
                    consistentCount++;
                }
            }
        }
        
        // If most segments are consistent, return the direction
        const minConsistent = Math.max(2, this.playerMovementHistory.length * 0.6);
        if (consistentCount >= minConsistent) {
            return angle;
        }
        
        return null;
    },
    
    updateEnemies(enemies, playerPos) {
        const now = Date.now();
        
        // Update movement history
        this.updateMovementHistory(playerPos);
        
        
        // Update difficulty scaling over time
        if (now - this.lastDifficultyUpdate >= CONFIG.DIFFICULTY_UPDATE_INTERVAL) {
            // Decrease spawn interval (faster spawns) over time
            this.currentSpawnInterval *= CONFIG.DIFFICULTY_SCALE_RATE;
            // Cap at minimum interval
            this.currentSpawnInterval = Math.max(
                CONFIG.ENEMY_SPAWN_INTERVAL_MIN,
                this.currentSpawnInterval
            );
            this.lastDifficultyUpdate = now;
        }
        
        // Spawn enemies in clusters
        if (now - this.lastEnemySpawn >= this.currentSpawnInterval) {
            this.spawnEnemyCluster(enemies, playerPos);
            this.lastEnemySpawn = now;
        }
    },
    
    checkStandingStill(playerPos, player, enemies) {
        const now = Date.now();
        const gameTime = now - this.gameStartTime;
        
        // Only allow swarms after difficulty has increased (minimum game time)
        if (gameTime < CONFIG.SWARM_MIN_GAME_TIME) {
            return;
        }
        
        // Check cooldown - don't spawn swarms too frequently
        if (now - this.lastSwarmSpawn < CONFIG.SWARM_COOLDOWN) {
            return;
        }
        
        // Check player velocity instead of position changes (accounts for momentum drift)
        const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        const speedThreshold = 0.5; // Consider "barely moving" if speed is below this
        
        // Check if player is barely moving (accounting for momentum drift)
        if (speed > speedThreshold) {
            // Player is moving, reset standing still timer
            this.standingStillStartTime = null;
        } else {
            // Player is barely moving or not moving at all
            if (this.standingStillStartTime === null) {
                this.standingStillStartTime = now;
            }
            
            // Check if they've been still long enough to trigger swarm
            const timeStandingStill = now - this.standingStillStartTime;
            if (timeStandingStill >= CONFIG.STANDING_STILL_THRESHOLD) {
                // Spawn swarm!
                this.spawnSwarm(enemies, playerPos);
                // Reset timer and cooldown
                this.standingStillStartTime = null;
                this.lastSwarmSpawn = now;
            }
        }
    },
    
    spawnSwarm(enemies, playerPos) {
        // Spawn enemies in a circle around the player, off-screen
        const enemyType = this.getEnemyTypeForSpawn();
        const spawnDistance = Math.max(canvas.width, canvas.height) * 0.6; // Spawn off-screen like regular enemies
        const angleStep = (Math.PI * 2) / CONFIG.SWARM_SIZE;
        
        for (let i = 0; i < CONFIG.SWARM_SIZE; i++) {
            const angle = i * angleStep;
            const x = playerPos.x + Math.cos(angle) * spawnDistance;
            const y = playerPos.y + Math.sin(angle) * spawnDistance;
            
            enemies.push(createEnemy(x, y, enemyType));
        }
    },
    
    updateOrbAbsorbers(orbAbsorbers, playerPos) {
        const now = Date.now();
        
        // Check if there are any active absorbers
        const hasActiveAbsorber = orbAbsorbers.some(absorber => absorber.active && !absorber.collected);
        
        // Only spawn if no active absorbers exist and enough time has passed
        if (!hasActiveAbsorber && now - this.lastOrbAbsorberSpawn >= CONFIG.ORB_ABSORBER_SPAWN_INTERVAL) {
            this.spawnOrbAbsorber(orbAbsorbers, playerPos);
            this.lastOrbAbsorberSpawn = now;
        }
    },
    
    updateAsteroids(asteroids, playerPos) {
        const now = Date.now();
        
        // Spawn asteroid field periodically
        if (now - this.lastAsteroidSpawn >= CONFIG.ASTEROID_SPAWN_INTERVAL) {
            this.spawnAsteroidField(asteroids, playerPos);
            this.lastAsteroidSpawn = now;
        }
    },
    
    updateBosses(bosses, playerPos) {
        const now = Date.now();
        
        // Spawn boss periodically (only if no boss currently exists)
        if (bosses.length === 0 && now - this.lastBossSpawn >= CONFIG.BOSS_SPAWN_INTERVAL) {
            this.spawnBoss(bosses, playerPos);
            this.lastBossSpawn = now;
        }
    },
    
    spawnBoss(bosses, playerPos) {
        // Spawn boss at a distance from player
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.BOSS_SPAWN_DISTANCE;
        const x = playerPos.x + Math.cos(angle) * distance;
        const y = playerPos.y + Math.sin(angle) * distance;
        
        const boss = createBoss(x, y);
        
        // Create satellite enemies that orbit the boss
        const satelliteAngleStep = (Math.PI * 2) / CONFIG.BOSS_SATELLITE_COUNT;
        for (let i = 0; i < CONFIG.BOSS_SATELLITE_COUNT; i++) {
            const satelliteAngle = i * satelliteAngleStep;
            const satellite = createSatellite(boss.x, boss.y, satelliteAngle, CONFIG.BOSS_SATELLITE_DISTANCE);
            boss.satellites.push(satellite);
        }
        
        bosses.push(boss);
    },
    
    spawnAsteroidField(asteroids, playerPos) {
        // Spawn asteroid clusters in a circle around the player
        const spawnDistance = CONFIG.ASTEROID_SPAWN_DISTANCE;
        const angleStep = (Math.PI * 2) / CONFIG.ASTEROID_FIELD_SIZE;
        
        for (let i = 0; i < CONFIG.ASTEROID_FIELD_SIZE; i++) {
            // Spawn cluster center in a circle
            const angle = i * angleStep + (Math.random() - 0.5) * 0.5; // Add some randomness
            const clusterCenterX = playerPos.x + Math.cos(angle) * spawnDistance;
            const clusterCenterY = playerPos.y + Math.sin(angle) * spawnDistance;
            
            // Spawn multiple asteroids clustered around this center
            for (let j = 0; j < CONFIG.ASTEROID_CLUSTER_SIZE; j++) {
                const clusterAngle = Math.random() * Math.PI * 2;
                const clusterDist = Math.random() * CONFIG.ASTEROID_CLUSTER_RADIUS;
                const x = clusterCenterX + Math.cos(clusterAngle) * clusterDist;
                const y = clusterCenterY + Math.sin(clusterAngle) * clusterDist;
                
                // All asteroids move toward player position (but won't track after spawn)
                asteroids.push(createAsteroid(x, y, playerPos.x, playerPos.y));
            }
        }
    },
    
    spawnOrbAbsorber(orbAbsorbers, playerPos) {
        // Spawn absorber at random position near player (but not too close)
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.ORB_ABSORBER_SPAWN_DISTANCE + Math.random() * 100;
        const x = playerPos.x + Math.cos(angle) * distance;
        const y = playerPos.y + Math.sin(angle) * distance;
        
        orbAbsorbers.push(createOrbAbsorber(x, y));
    },
    
    getEnemyTypeForSpawn() {
        const gameTime = (Date.now() - this.gameStartTime) / 1000; // seconds
        const availableTypes = [];
        
        // Collect available enemy types based on game time
        for (const [typeKey, typeData] of Object.entries(CONFIG.ENEMY_TYPES)) {
            if (gameTime >= typeData.spawnAfter) {
                availableTypes.push({ key: typeKey, ...typeData });
            }
        }
        
        if (availableTypes.length === 0) {
            return 'basic';
        }
        
        // Weighted random selection
        const totalWeight = availableTypes.reduce((sum, type) => sum + type.spawnChance, 0);
        let random = Math.random() * totalWeight;
        
        for (const type of availableTypes) {
            random -= type.spawnChance;
            if (random <= 0) {
                return type.key;
            }
        }
        
        // Fallback to last type
        return availableTypes[availableTypes.length - 1].key;
    },
    
    isValidSpawnPosition(x, y, enemies, minDistance) {
        // Check if position is far enough from all existing enemies
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            const dx = x - enemy.x;
            const dy = y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
                return false;
            }
        }
        return true;
    },
    
    spawnEnemyCluster(enemies, playerPos) {
        const movementDirection = this.getPlayerMovementDirection();
        const spawnDistance = Math.max(canvas.width, canvas.height) * 0.6; // Spawn off-screen
        let clusterCenterX, clusterCenterY;
        
        // If player has been moving in one direction, spawn more enemies in that direction
        if (movementDirection !== null) {
            // Spawn in the direction player is moving (ahead of them)
            clusterCenterX = playerPos.x + Math.cos(movementDirection) * spawnDistance;
            clusterCenterY = playerPos.y + Math.sin(movementDirection) * spawnDistance;
            
            // Add some spread perpendicular to movement direction
            const perpAngle = movementDirection + Math.PI / 2;
            const spread = (Math.random() - 0.5) * canvas.width * 0.8;
            clusterCenterX += Math.cos(perpAngle) * spread;
            clusterCenterY += Math.sin(perpAngle) * spread;
        } else {
            // Normal random spawning from all sides
            const side = Math.floor(Math.random() * 4);
            
            // Determine cluster center position
            switch (side) {
                case 0: // top
                    clusterCenterX = playerPos.x + (Math.random() - 0.5) * canvas.width;
                    clusterCenterY = playerPos.y - spawnDistance;
                    break;
                case 1: // right
                    clusterCenterX = playerPos.x + spawnDistance;
                    clusterCenterY = playerPos.y + (Math.random() - 0.5) * canvas.height;
                    break;
                case 2: // bottom
                    clusterCenterX = playerPos.x + (Math.random() - 0.5) * canvas.width;
                    clusterCenterY = playerPos.y + spawnDistance;
                    break;
                case 3: // left
                    clusterCenterX = playerPos.x - spawnDistance;
                    clusterCenterY = playerPos.y + (Math.random() - 0.5) * canvas.height;
                    break;
            }
        }
        
        // Determine enemy type based on game time
        const enemyType = this.getEnemyTypeForSpawn();
        
        // Calculate how many enemies to spawn
        const gameTime = (Date.now() - this.gameStartTime) / 1000; // seconds
        const timeBasedClusterBonus = Math.floor(gameTime / 30); // +1 enemy every 30 seconds
        let clusterSize = CONFIG.ENEMY_CLUSTER_SIZE + timeBasedClusterBonus;
        
        if (movementDirection !== null) {
            // Spawn more enemies when player is moving in one direction
            clusterSize = Math.floor(clusterSize * CONFIG.DIRECTIONAL_SPAWN_MULTIPLIER);
        }
        
        // Spawn multiple enemies clustered around the center
        for (let i = 0; i < clusterSize; i++) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 20; // Prevent infinite loops
            
            // Try to find a valid spawn position
            do {
                // Random position within cluster radius
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * CONFIG.ENEMY_CLUSTER_RADIUS;
                x = clusterCenterX + Math.cos(angle) * distance;
                y = clusterCenterY + Math.sin(angle) * distance;
                attempts++;
            } while (!this.isValidSpawnPosition(x, y, enemies, CONFIG.ENEMY_MIN_SPAWN_DISTANCE) && attempts < maxAttempts);
            
            // Spawn enemy even if we couldn't find perfect position (to avoid blocking spawns)
            enemies.push(createEnemy(x, y, enemyType));
        }
    },
    
    updateBullets(bullets, playerPos, playerAngle) {
        const now = Date.now();
        if (now - this.lastBulletFire >= CONFIG.BULLET_PULSE_INTERVAL) {
            // Always fire radial pulse
            this.fireRadialBullets(bullets, playerPos);
            
            // Fire directional pulse if unlocked
            if (Upgrades.levels.directionalPulse > 0) {
                this.fireDirectionalBullets(bullets, playerPos, playerAngle);
            }
            
            this.lastBulletFire = now;
        }
    },
    
    fireRadialBullets(bullets, playerPos) {
        // Fire bullets in a pulse that radiates outward in all directions
        const bulletCount = CONFIG.BULLET_COUNT;
        const angleStep = (Math.PI * 2) / bulletCount; // full circle divided by bullet count
        const canSplit = Upgrades.levels.explosiveBullets > 0;
        
        for (let i = 0; i < bulletCount; i++) {
            // Evenly spaced bullets in a full 360-degree circle
            const angle = i * angleStep;
            bullets.push(createBullet(playerPos.x, playerPos.y, angle, null, canSplit, 0));
        }
    },
    
    fireDirectionalBullets(bullets, playerPos, playerAngle) {
        // Fire bullets in a forward-facing cone
        const level = Upgrades.levels.directionalPulse;
        const bulletCount = CONFIG.DIRECTIONAL_PULSE_BASE_COUNT + (level * 2);
        const spread = CONFIG.DIRECTIONAL_PULSE_SPREAD;
        
        // Calculate spread angles
        const angleStep = spread / (bulletCount - 1);
        const startAngle = playerAngle - spread / 2;
        
        const canSplit = Upgrades.levels.explosiveBullets > 0;
        for (let i = 0; i < bulletCount; i++) {
            // Bullets spread in a cone in front of player
            const angle = startAngle + (i * angleStep);
            bullets.push(createBullet(playerPos.x, playerPos.y, angle, null, canSplit, 0));
        }
    }
};

