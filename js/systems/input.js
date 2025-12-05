// Input handling system

const Input = {
    keys: {},
    keysPressed: {}, // tracks keys that were just pressed (not held)
    mouseX: 0,
    mouseY: 0,
    mouseClicked: false,
    gamepad: null,
    gamepadButtons: {},
    gamepadButtonsPressed: {},
    prevRightTrigger: 0, // Track previous right trigger state for "just pressed" detection
    
    init() {
        window.addEventListener('keydown', (e) => {
            // Handle special keys
            let normalizedKey;
            if (e.key === 'Shift' || e.key === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                normalizedKey = 'shift';
            } else if (e.key === ' ' || e.code === 'Space') {
                // Spacebar - e.key is " " (space character), e.code is "Space"
                normalizedKey = ' ';
            } else {
                normalizedKey = e.key.toLowerCase();
            }
            
            if (!this.keys[normalizedKey]) {
                this.keysPressed[normalizedKey] = true; // Mark as just pressed
            }
            this.keys[normalizedKey] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            // Handle special keys
            let normalizedKey;
            if (e.key === 'Shift' || e.key === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                normalizedKey = 'shift';
            } else if (e.key === ' ' || e.code === 'Space') {
                // Spacebar
                normalizedKey = ' ';
            } else {
                normalizedKey = e.key.toLowerCase();
            }
            this.keys[normalizedKey] = false;
        });
        
        // Track mouse position
        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        // Track mouse clicks
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                this.mouseClicked = true;
            }
        });
        
        // Gamepad support
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this.gamepad = navigator.getGamepads()[e.gamepad.index];
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected');
            this.gamepad = null;
        });
    },
    
    update() {
        // Clear pressed keys and mouse click after they've been checked
        // Note: updateGamepad() should be called before this to capture button states
        this.keysPressed = {};
        this.mouseClicked = false;
        this.gamepadButtonsPressed = {};
    },
    
    updateGamepad() {
        // Get connected gamepads
        const gamepads = navigator.getGamepads();
        if (gamepads.length > 0 && gamepads[0]) {
            // Store previous right trigger state BEFORE updating gamepad reference
            if (this.gamepad) {
                this.prevRightTrigger = this.getGamepadTrigger(1);
            } else {
                this.prevRightTrigger = 0;
            }
            
            this.gamepad = gamepads[0];
            
            // Store previous button states
            const prevButtons = { ...this.gamepadButtons };
            
            // Update button states
            for (let i = 0; i < this.gamepad.buttons.length; i++) {
                const button = this.gamepad.buttons[i];
                const wasPressed = this.gamepadButtons[i] || false;
                const isPressed = button.pressed;
                
                this.gamepadButtons[i] = isPressed;
                
                // Track just-pressed buttons
                if (isPressed && !wasPressed) {
                    this.gamepadButtonsPressed[i] = true;
                }
            }
        } else {
            this.gamepad = null;
            this.gamepadButtons = {};
            this.prevRightTrigger = 0;
        }
    },
    
    getGamepadAxis(axisIndex) {
        if (!this.gamepad || axisIndex >= this.gamepad.axes.length) return 0;
        const value = this.gamepad.axes[axisIndex];
        // Apply deadzone to prevent drift
        return Math.abs(value) > 0.15 ? value : 0;
    },
    
    getGamepadTrigger(triggerIndex) {
        // Triggers are typically on axes 4 (left) and 5 (right) or buttons 6 and 7
        if (!this.gamepad) return 0;
        
        // Check if triggers are on axes (common for Xbox controllers)
        if (this.gamepad.axes.length > triggerIndex + 4) {
            const axisValue = this.gamepad.axes[triggerIndex + 4]; // 4 = left, 5 = right
            // Triggers typically range from -1 to 1, but we want 0 to 1
            return Math.max(0, axisValue);
        }
        
        // Fallback to button check (button 6 = left trigger, button 7 = right trigger)
        const buttonIndex = triggerIndex === 0 ? 6 : 7;
        if (buttonIndex < this.gamepad.buttons.length) {
            return this.gamepad.buttons[buttonIndex].pressed ? 1 : 0;
        }
        
        return 0;
    },
    
    isGamepadButtonPressed(buttonIndex) {
        return this.gamepadButtons[buttonIndex] || false;
    },
    
    wasGamepadButtonJustPressed(buttonIndex) {
        return this.gamepadButtonsPressed[buttonIndex] || false;
    },
    
    isPressed(key) {
        return !!this.keys[key.toLowerCase()];
    },
    
    wasJustPressed(key) {
        return !!this.keysPressed[key.toLowerCase()];
    },
    
    getMouseAngle(playerX, playerY, cameraX, cameraY, currentAngle) {
        // Only use gamepad if it's connected and being used
        if (this.gamepad) {
            // Right stick has priority for look direction
            const rightStickX = this.getGamepadAxis(2); // Right stick X
            const rightStickY = this.getGamepadAxis(3); // Right stick Y
            
            if (Math.abs(rightStickX) > 0.15 || Math.abs(rightStickY) > 0.15) {
                return Math.atan2(rightStickY, rightStickX);
            }
            
            // If right stick not used, use left stick for look direction
            const leftStickX = this.getGamepadAxis(0); // Left stick X
            const leftStickY = this.getGamepadAxis(1); // Left stick Y
            
            if (Math.abs(leftStickX) > 0.15 || Math.abs(leftStickY) > 0.15) {
                return Math.atan2(leftStickY, leftStickX);
            }
            
            // If gamepad is connected but no stick input, maintain current angle
            return currentAngle !== undefined ? currentAngle : 0;
        }
        
        // No gamepad - use mouse for look direction
        const dx = this.mouseX - (CONFIG.CANVAS_WIDTH / 2);
        const dy = this.mouseY - (CONFIG.CANVAS_HEIGHT / 2);
        
        // Always use mouse angle when no gamepad (mouse overrides keyboard movement direction)
        return Math.atan2(dy, dx);
    },
    
    // Check if mouse is being actively used (moved from center)
    isMouseActive() {
        if (this.gamepad) return false; // Mouse disabled when gamepad is connected
        const dx = this.mouseX - (CONFIG.CANVAS_WIDTH / 2);
        const dy = this.mouseY - (CONFIG.CANVAS_HEIGHT / 2);
        return Math.abs(dx) > 1 || Math.abs(dy) > 1;
    },
    
    getMovementVector() {
        let forward = 0;
        let strafe = 0;
        let movementAngle = null; // For keyboard: angle of movement direction
        
        // Check for gamepad input first
        if (this.gamepad) {
            // Left stick for movement (direction and acceleration)
            const leftStickX = this.getGamepadAxis(0); // Left stick X
            const leftStickY = this.getGamepadAxis(1); // Left stick Y
            
            // D-pad as fallback
            const dpadX = this.isGamepadButtonPressed(15) ? 1 : (this.isGamepadButtonPressed(14) ? -1 : 0);
            const dpadY = this.isGamepadButtonPressed(13) ? -1 : (this.isGamepadButtonPressed(12) ? 1 : 0);
            
            // Use stick if moved - magnitude determines acceleration, direction determines facing
            if (Math.abs(leftStickX) > 0.15 || Math.abs(leftStickY) > 0.15) {
                // Calculate magnitude (how far stick is pushed)
                const magnitude = Math.sqrt(leftStickX * leftStickX + leftStickY * leftStickY);
                // Normalize and scale by magnitude for acceleration
                const normalizedX = leftStickX / magnitude;
                const normalizedY = leftStickY / magnitude;
                
                // Movement is in the direction of the stick, with magnitude as acceleration
                // For forward/backward: use the stick's Y component (inverted)
                // For strafe: use the stick's X component
                forward = -normalizedY * magnitude; // Invert Y axis, scale by magnitude
                strafe = normalizedX * magnitude; // Scale by magnitude
            } else if (dpadX !== 0 || dpadY !== 0) {
                strafe = dpadX;
                forward = dpadY;
            }
        }
        
        // Keyboard input (WASD works like left stick - movement direction determines facing)
        // Check if any WASD keys are pressed
        const hasKeyboardInput = this.isPressed('w') || this.isPressed('s') || 
                                 this.isPressed('a') || this.isPressed('d');
        
        if (hasKeyboardInput && !this.gamepad) {
            // WASD movement: combine inputs to get direction
            let moveX = 0;
            let moveY = 0;
            
            if (this.isPressed('w')) moveY -= 1; // Forward (up)
            if (this.isPressed('s')) moveY += 1; // Backward (down)
            if (this.isPressed('a')) moveX -= 1; // Left
            if (this.isPressed('d')) moveX += 1; // Right
            
            // Normalize diagonal movement
            if (moveX !== 0 || moveY !== 0) {
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                moveX /= length;
                moveY /= length;
                
                // Calculate movement angle (this will be used to set facing direction)
                movementAngle = Math.atan2(moveY, moveX);
                
                // Set forward/strafe for movement (magnitude of 1 for keyboard)
                forward = moveY;
                strafe = moveX;
            }
        }
        
        return { forward, strafe, movementAngle };
    },
    
    // Get turn angle from Q/E keys (45 degrees)
    getTurnAngle() {
        if (this.gamepad) return 0; // No keyboard turning when gamepad is active
        
        if (this.wasJustPressed('q')) {
            return -Math.PI / 4; // -45 degrees
        }
        if (this.wasJustPressed('e')) {
            return Math.PI / 4; // +45 degrees
        }
        return 0;
    },
    
    isShootPressed() {
        // Check gamepad trigger or button for shooting
        if (this.gamepad) {
            // Right trigger (axis 5 or button 7) - check if pressed
            const rightTrigger = this.getGamepadTrigger(1); // 1 = right trigger
            if (rightTrigger > 0.3) return true; // Trigger threshold
            
            // Also check buttons as fallback
            return this.isGamepadButtonPressed(7) || 
                   this.isGamepadButtonPressed(0) || 
                   this.isGamepadButtonPressed(1);
        }
        return false;
    },
    
    wasShootJustPressed() {
        // Check gamepad trigger or button for shooting (just pressed)
        if (this.gamepad) {
            // Check right trigger (axis 5 or button 7)
            const rightTrigger = this.getGamepadTrigger(1); // 1 = right trigger
            const prevRightTrigger = this.prevRightTrigger || 0;
            this.prevRightTrigger = rightTrigger;
            
            // Trigger just pressed if it went from below threshold to above
            if (rightTrigger > 0.3 && prevRightTrigger <= 0.3) {
                return true;
            }
            
            // Also check buttons as fallback
            return this.wasGamepadButtonJustPressed(7) || 
                   this.wasGamepadButtonJustPressed(0) || 
                   this.wasGamepadButtonJustPressed(1);
        }
        return false;
    },
    
    isDashPressed() {
        // Check gamepad right trigger for dash
        if (this.gamepad) {
            const rightTrigger = this.getGamepadTrigger(1); // 1 = right trigger
            // Check if trigger was just pressed (went from below threshold to above)
            const wasBelow = this.prevRightTrigger <= 0.3;
            const isAbove = rightTrigger > 0.3;
            return wasBelow && isAbove;
        }
        return false;
    }
};

