// Player entity

const Player = {
    x: 0,
    y: 0,
    vx: 0, // velocity x
    vy: 0, // velocity y
    angle: 0,
    alive: true,
    isDashing: false,
    dashCooldown: 0,
    dashStartTime: 0,
    dashTrail: [], // for visual effect
    lastBurstFire: 0, // timestamp of last burst fire
    
    init(canvas) {
        // Start at world origin (player will be centered on screen via camera)
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.alive = true;
        this.isDashing = false;
        this.dashCooldown = 0;
        this.dashStartTime = 0;
        this.dashTrail = [];
        this.lastBurstFire = 0; // Start at 0 so first burst fires immediately
    },
    
    update(deltaTime, cameraX, cameraY) {
        if (!this.alive) return;
        
        const now = Date.now();
        
        // Handle Q/E turning (45 degree increments)
        const turnAngle = Input.getTurnAngle();
        if (turnAngle !== 0) {
            this.angle += turnAngle;
        }
        
        // Update angle to face mouse/gamepad (only if there's input, otherwise keep current angle)
        const movement = Input.getMovementVector();
        const isGamepadActive = Input.gamepad && (Math.abs(Input.getGamepadAxis(0)) > 0.15 || Math.abs(Input.getGamepadAxis(1)) > 0.15 || 
                                                   Math.abs(Input.getGamepadAxis(2)) > 0.15 || Math.abs(Input.getGamepadAxis(3)) > 0.15);
        
        // Priority: Mouse (if no gamepad) > Gamepad > Keyboard movement direction
        if (isGamepadActive) {
            // Gamepad active - use gamepad for look direction
            const newAngle = Input.getMouseAngle(this.x, this.y, cameraX, cameraY, this.angle);
            if (newAngle !== undefined) {
                this.angle = newAngle;
            }
        } else if (Input.isMouseActive()) {
            // No gamepad and mouse is active - mouse overrides keyboard movement direction
            const mouseAngle = Input.getMouseAngle(this.x, this.y, cameraX, cameraY, this.angle);
            if (mouseAngle !== undefined) {
                this.angle = mouseAngle;
            }
        } else if (movement.movementAngle !== null) {
            // No gamepad and no mouse input - use keyboard movement direction for facing
            this.angle = movement.movementAngle;
        }
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
        
        
        // Check for dash input (keyboard Spacebar or gamepad right trigger)
        const dashInput = Input.wasJustPressed(' ') || Input.wasJustPressed('space') || Input.isDashPressed();
        if (dashInput && !this.isDashing && this.dashCooldown <= 0) {
            this.startDash();
        }
        
        // Normal movement with momentum - forward/backward and strafe
        // Check if using gamepad left stick for movement
        const isGamepadMovement = Input.gamepad && (Math.abs(Input.getGamepadAxis(0)) > 0.15 || Math.abs(Input.getGamepadAxis(1)) > 0.15);
        
        if (isGamepadMovement) {
            // Gamepad: left stick controls movement direction and acceleration
            // Right stick (handled in getMouseAngle) controls facing direction independently
            const leftStickX = Input.getGamepadAxis(0);
            const leftStickY = Input.getGamepadAxis(1);
            const magnitude = Math.sqrt(leftStickX * leftStickX + leftStickY * leftStickY);
            
            if (magnitude > 0.15) {
                // Calculate angle from stick direction
                const stickAngle = Math.atan2(leftStickY, leftStickX);
                // Accelerate in the direction of the stick, magnitude determines acceleration amount
                this.vx += Math.cos(stickAngle) * magnitude * CONFIG.PLAYER_ACCELERATION;
                this.vy += Math.sin(stickAngle) * magnitude * CONFIG.PLAYER_ACCELERATION;
            }
        } else {
            // Keyboard: WASD works like left stick - movement direction determines facing
            // Movement angle is already set above, now apply movement
            if (movement.movementAngle !== null) {
                // Move in the direction of the movement angle
                const moveMagnitude = Math.sqrt(movement.forward * movement.forward + movement.strafe * movement.strafe);
                if (moveMagnitude > 0) {
                    this.vx += Math.cos(movement.movementAngle) * moveMagnitude * CONFIG.PLAYER_ACCELERATION;
                    this.vy += Math.sin(movement.movementAngle) * moveMagnitude * CONFIG.PLAYER_ACCELERATION;
                }
            }
        }
        
        // Calculate current speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        
        // Apply dash speed multiplier if dashing
        let maxSpeed = CONFIG.PLAYER_MAX_SPEED;
        if (this.isDashing) {
            maxSpeed *= CONFIG.DASH_SPEED_MULTIPLIER;
        }
        
        // Cap maximum speed
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
        
        // Apply friction/damping (speed-dependent: faster = less friction effect, more drift)
        // At higher speeds, friction is less effective, creating more drift
        const speedFactor = Math.min(1, speed / CONFIG.PLAYER_MAX_SPEED); // 0 to 1 based on speed
        const effectiveFriction = CONFIG.PLAYER_FRICTION + (1 - CONFIG.PLAYER_FRICTION) * (1 - speedFactor * 0.3);
        // At max speed, friction is reduced by 30%, allowing more drift
        this.vx *= effectiveFriction;
        this.vy *= effectiveFriction;
        
        // Apply velocity to position
        this.x += this.vx;
        this.y += this.vy;
        
        // Handle dash duration and trail
        if (this.isDashing) {
            const dashElapsed = now - this.dashStartTime;
            const dashProgress = Math.min(1, dashElapsed / CONFIG.DASH_DURATION);
            
            // Add trail point
            this.dashTrail.push({ x: this.x, y: this.y, time: now });
            // Keep only recent trail points
            this.dashTrail = this.dashTrail.filter(point => now - point.time < 200);
            
            // End dash after duration
            if (dashProgress >= 1) {
                this.isDashing = false;
                this.dashCooldown = CONFIG.DASH_COOLDOWN;
                this.dashTrail = [];
            }
        }
    },
    
    startDash() {
        this.isDashing = true;
        this.dashStartTime = Date.now();
        this.dashTrail = [];
    },
    
    render(ctx, cameraX, cameraY) {
        if (!this.alive) return;
        
        // Render player at screen center (world position - camera offset = screen center)
        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;
        
        // Render dash trail
        if (this.dashTrail.length > 1) {
            ctx.save();
            ctx.strokeStyle = CONFIG.DASH_COLOR;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            for (let i = 0; i < this.dashTrail.length; i++) {
                const point = this.dashTrail[i];
                const trailX = point.x - cameraX;
                const trailY = point.y - cameraY;
                if (i === 0) {
                    ctx.moveTo(trailX, trailY);
                } else {
                    ctx.lineTo(trailX, trailY);
                }
            }
            ctx.stroke();
            ctx.restore();
        }
        
        // Draw dash cooldown indicator (circular progress around player)
        if (this.dashCooldown > 0) {
            ctx.save();
            const cooldownProgress = 1 - (this.dashCooldown / CONFIG.DASH_COOLDOWN);
            const indicatorRadius = CONFIG.PLAYER_SIZE + 8;
            
            // Draw background circle
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, indicatorRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw filled progress arc
            ctx.strokeStyle = CONFIG.DASH_COLOR;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, indicatorRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownProgress));
            ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);
        
        // Change color during dash or while on cooldown - stay white until recharged
        const isOnCooldown = this.dashCooldown > 0;
        const shouldBeWhite = this.isDashing || isOnCooldown;
        ctx.strokeStyle = shouldBeWhite ? CONFIG.DASH_COLOR : CONFIG.PLAYER_COLOR;
        ctx.lineWidth = this.isDashing ? CONFIG.PLAYER_LINE_WIDTH + 1 : CONFIG.PLAYER_LINE_WIDTH;
        ctx.beginPath();
        
        // Draw a simple triangle ship (Asteroids style)
        const size = CONFIG.PLAYER_SIZE;
        ctx.moveTo(size, 0); // nose
        ctx.lineTo(-size * 0.6, -size * 0.8); // top back
        ctx.lineTo(-size * 0.3, 0); // center back
        ctx.lineTo(-size * 0.6, size * 0.8); // bottom back
        ctx.closePath();
        ctx.stroke();
        
        // Fill triangle based on dash cooldown (when ready, fill is brighter)
        if (!this.isDashing) {
            const cooldownProgress = this.dashCooldown > 0 ? (1 - (this.dashCooldown / CONFIG.DASH_COOLDOWN)) : 1;
            if (isOnCooldown) {
                // While on cooldown, fill with white that gets brighter as it recharges
                ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + cooldownProgress * 0.3})`;
            } else {
                // When ready, fill with cyan
                ctx.fillStyle = `rgba(0, 255, 255, ${0.2 + cooldownProgress * 0.3})`;
            }
            ctx.fill();
        }
        
        ctx.restore();
    },
    
    getPosition() {
        return { x: this.x, y: this.y };
    },
    
    fireBurst(bullets) {
        // Fire burst in a straight line in the direction player is facing
        // Bullet count is already updated by upgrades in CONFIG.BURST_BULLET_COUNT
        const bulletCount = CONFIG.BURST_BULLET_COUNT;
        
        const spacing = 15; // spacing between bullets in the line (increased from 8)
        
        // Spawn bullets in a line, starting from player position
        const canSplit = Upgrades.levels.explosiveBullets > 0;
        for (let i = 0; i < bulletCount; i++) {
            const spawnOffset = CONFIG.PLAYER_SIZE + 5 + (i * spacing);
            const spawnX = this.x + Math.cos(this.angle) * spawnOffset;
            const spawnY = this.y + Math.sin(this.angle) * spawnOffset;
            
            // All bullets fire in the same direction (player's facing angle) with faster speed
            bullets.push(createBullet(spawnX, spawnY, this.angle, CONFIG.BURST_BULLET_SPEED, canSplit, 0));
        }
        
        // Update last fire time
        this.lastBurstFire = Date.now();
    },
    
    shouldFireBurst() {
        // Check if enough time has passed since last burst
        const now = Date.now();
        // If lastBurstFire is 0, fire immediately (first burst)
        if (this.lastBurstFire === 0) {
            return true;
        }
        
        // Calculate burst interval affected by fire rate upgrades
        let burstInterval = CONFIG.BURST_INTERVAL_BASE;
        if (Upgrades.levels.fireRate > 0) {
            // Apply fire rate multiplier (same as regular bullets - 8% reduction per level)
            const fireRateUpgrade = Upgrades.options.find(o => o.id === 'fireRate');
            const fireRateMultiplier = Math.pow(1 - fireRateUpgrade.multiplier, Upgrades.levels.fireRate);
            burstInterval = CONFIG.BURST_INTERVAL_BASE * fireRateMultiplier;
            // Ensure minimum interval
            burstInterval = Math.max(500, burstInterval);
        }
        
        return (now - this.lastBurstFire) >= burstInterval;
    }
};

