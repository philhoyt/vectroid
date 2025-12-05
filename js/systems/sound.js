// Sound system using Web Audio API for digitally synthesized sounds

const Sound = {
    audioContext: null,
    initialized: false,
    lastEnemySoundTime: 0, // Track last time enemy sound was played
    enemySoundCooldown: 50, // Minimum milliseconds between enemy sounds (50ms = 20 sounds/sec max)
    
    init() {
        // Don't create audio context yet - wait for user interaction
        // Set up listeners to create it on first user interaction
        this.setupUserInteractionResume();
    },
    
    // Set up event listeners to create audio context on first user interaction
    setupUserInteractionResume() {
        if (this.initialized) return;
        this.initialized = true;
        
        const createAudioContext = () => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('Web Audio API not supported');
                    return;
                }
            }
            
            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    // Remove listeners after first successful creation/resume
                    document.removeEventListener('click', createAudioContext);
                    document.removeEventListener('keydown', createAudioContext);
                    document.removeEventListener('touchstart', createAudioContext);
                }).catch(err => {
                    // Silently fail - will try again on next interaction
                });
            } else {
                // Already running, remove listeners
                document.removeEventListener('click', createAudioContext);
                document.removeEventListener('keydown', createAudioContext);
                document.removeEventListener('touchstart', createAudioContext);
            }
        };
        
        // Listen for user interactions
        document.addEventListener('click', createAudioContext, { once: false });
        document.addEventListener('keydown', createAudioContext, { once: false });
        document.addEventListener('touchstart', createAudioContext, { once: false });
    },
    
    // Ensure audio context is ready (create/resume if needed)
    ensureAudioContext() {
        if (!this.audioContext) {
            // Try to create on demand (may fail if no user interaction yet)
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                // Will be created on next user interaction
                return false;
            }
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {
                // Silently fail - will work after user interaction
            });
            return false; // Not ready yet
        }
        return this.audioContext && this.audioContext.state === 'running';
    },
    
    // Play a digital "pop" sound when enemy is destroyed
    playEnemyDestroy() {
        // Throttle sounds to prevent overlapping
        const currentTime = Date.now();
        if (currentTime - this.lastEnemySoundTime < this.enemySoundCooldown) {
            return; // Too soon since last sound, skip this one
        }
        this.lastEnemySoundTime = currentTime;
        
        // Only play if audio context is ready
        if (!this.ensureAudioContext()) {
            return; // Not ready yet, will work after user interaction
        }
        
        const now = this.audioContext.currentTime;
        
        // Create oscillator for the main tone
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set oscillator type to square wave for digital sound
        oscillator.type = 'square';
        
        // Frequency sweep: start high, drop quickly (classic "pop" sound)
        const startFreq = 400;
        const endFreq = 100;
        const duration = 0.1; // 100ms
        
        oscillator.frequency.setValueAtTime(startFreq, now);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
        
        // Envelope: quick attack, quick decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Quick decay
        
        // Start and stop
        oscillator.start(now);
        oscillator.stop(now + duration);
    },
    
    // Play a slightly different sound for boss destruction
    playBossDestroy() {
        // Only play if audio context is ready
        if (!this.ensureAudioContext()) {
            return; // Not ready yet, will work after user interaction
        }
        
        const now = this.audioContext.currentTime;
        
        // Create two oscillators for a richer sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Connect nodes
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set oscillator types
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        
        // Frequency sweep: lower frequencies for boss
        const startFreq1 = 200;
        const endFreq1 = 80;
        const startFreq2 = 150;
        const endFreq2 = 60;
        const duration = 0.2; // 200ms
        
        osc1.frequency.setValueAtTime(startFreq1, now);
        osc1.frequency.exponentialRampToValueAtTime(endFreq1, now + duration);
        osc2.frequency.setValueAtTime(startFreq2, now);
        osc2.frequency.exponentialRampToValueAtTime(endFreq2, now + duration);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Start and stop
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }
};

