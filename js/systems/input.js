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
            const key = e.key.toLowerCase();
            // Handle Shift key specifically (can be "Shift" or "shift")
            const normalizedKey = (key === 'shift' || e.key === 'Shift') ? 'shift' : key;
            if (!this.keys[normalizedKey]) {
                this.keysPressed[normalizedKey] = true; // Mark as just pressed
            }
            this.keys[normalizedKey] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const normalizedKey = (key === 'shift' || e.key === 'Shift') ? 'shift' : key;
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
        // Check for gamepad sticks (right stick has priority, then left stick)
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
        }
        
        // No input - return current angle to maintain direction (mouse control removed)
        return currentAngle !== undefined ? currentAngle : 0;
    },
    
    getMovementVector() {
        let forward = 0;
        let strafe = 0;
        
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
        
        // Keyboard input (overrides gamepad if pressed)
        if (this.isPressed('w') || this.isPressed('ArrowUp')) forward = 1;
        if (this.isPressed('s') || this.isPressed('ArrowDown')) forward = -1;
        if (this.isPressed('a') || this.isPressed('ArrowLeft')) strafe = -1;
        if (this.isPressed('d') || this.isPressed('ArrowRight')) strafe = 1;
        
        return { forward, strafe };
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

