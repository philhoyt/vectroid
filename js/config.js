// Game configuration - all tunable constants live here

const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 768,
    
    // Visual Effects
    CHROMATIC_ABERRATION_ENABLED: true,
    CHROMATIC_ABERRATION_STRENGTH: 1.5, // Pixel offset for color separation
    
    // Edge Warping/Vignette
    VIGNETTE_ENABLED: true,
    VIGNETTE_INTENSITY: 0.15, // How dark the edges get (0-1, reduced from 0.4)
    VIGNETTE_SIZE: 0.6, // How far from center the vignette starts (0-1, lower = larger dark area)
    EDGE_DISTORTION_ENABLED: false,
    EDGE_DISTORTION_STRENGTH: 0.05, // Pixel distortion at edges (reduced from 2.0)
    
    // Screen Shake
    SCREEN_SHAKE_DURATION: 200, // Duration of shake in milliseconds
    SCREEN_SHAKE_INTENSITY: 5, // Maximum pixel offset for shake
    
    // Grid
    GRID_SIZE: 50, // spacing between grid lines
    GRID_COLOR: '#1a1a1a', // subtle dark color
    GRID_LINE_WIDTH: 1,
    
    // Player
    PLAYER_SPEED: 5,
    PLAYER_ACCELERATION: 0.18, // acceleration when moving (reduced for less momentum)
    PLAYER_FRICTION: 0.97, // friction/damping (0.97 = 3% slowdown per frame, more friction = less drift)
    PLAYER_MAX_SPEED: 4.5, // maximum velocity (reduced starting speed)
    PLAYER_SIZE: 20,
    PLAYER_COLOR: '#00ffff',
    PLAYER_LINE_WIDTH: 2,
    
    // Dash (speed boost)
    DASH_SPEED_MULTIPLIER: 2.0, // speed multiplier during dash
    DASH_DURATION: 1000, // milliseconds (how long the speed boost lasts)
    DASH_COOLDOWN: 2000, // milliseconds between dashes
    DASH_COLOR: '#ffffff', // color during dash
    
    // Bullets
    BULLET_SPEED: 4,
    BULLET_LIFETIME: 2000, // milliseconds
    BULLET_SIZE: 3, // Reduced from 4 to 3
    BULLET_COLOR: '#ffff00',
    BULLET_COUNT: 12, // Reduced further to slow early power (number of bullets per pulse)
    BULLET_PULSE_INTERVAL: 900, // milliseconds between pulses (slower firing to start)
    
    // Directional Pulse
    DIRECTIONAL_PULSE_BASE_COUNT: 8, // base bullets in directional pulse
    DIRECTIONAL_PULSE_SPREAD: 0.8, // spread angle in radians (cone width)
    
    // Burst Fire (automatic)
    BURST_BULLET_COUNT: 3, // Base number of bullets per burst
    BURST_SPREAD: 0.3, // spread angle in radians (cone width)
    BURST_INTERVAL_BASE: 2000, // base milliseconds between automatic bursts (2 seconds)
    BURST_BULLET_SPEED: 8, // speed of burst bullets (faster than regular bullets)
    
    // Enemies
    ENEMY_SPAWN_INTERVAL: 2500, // milliseconds (base spawn interval, increased to slow early game)
    ENEMY_SPAWN_INTERVAL_MIN: 400, // minimum spawn interval (caps difficulty, slightly lower for more challenge late game)
    ENEMY_SPEED: 2,
    ENEMY_SIZE: 15,
    ENEMY_HP: 1,
    ENEMY_COLOR: '#ff0000',
    ENEMY_LINE_WIDTH: 2,
    
    // Enemy types
    ENEMY_TYPES: {
        basic: {
            name: 'Basic',
            size: 15,
            hp: 1,
            speed: 2,
            color: '#ff0000',
            spawnAfter: 0, // seconds
            spawnChance: 1.0
        },
        tank: {
            name: 'Tank',
            size: 25,
            hp: 2,
            speed: 1.5,
            color: '#ff6600',
            spawnAfter: 10, // seconds
            spawnChance: 0.3
        },
        squiggly: {
            name: 'Squiggly',
            size: 12,
            hp: 1,
            speed: 4.0,
            color: '#ff00ff',
            spawnAfter: 20, // seconds
            spawnChance: 0.4,
            squiggleAmplitude: 30, // how much it squiggles
            squiggleFrequency: 0.1 // how fast it squiggles
        }
    },
    
    // Difficulty scaling
    DIFFICULTY_SCALE_RATE: 0.995, // spawn interval multiplier per update (closer to 1.0 = slower ramp, was 0.99)
    DIFFICULTY_UPDATE_INTERVAL: 2000, // update difficulty every 2 seconds (slower difficulty increases)
    
    // Enemy clustering
    ENEMY_CLUSTER_SIZE: 3, // number of enemies per cluster
    ENEMY_CLUSTER_RADIUS: 50, // radius around cluster center to spawn enemies
    ENEMY_MIN_SPAWN_DISTANCE: 30, // minimum distance between spawned enemies
    
    // Directional enemy spawning (when player moves in one direction)
    MOVEMENT_DIRECTION_THRESHOLD: 1500, // milliseconds of consistent movement (reduced to trigger faster)
    MOVEMENT_DIRECTION_ANGLE_TOLERANCE: 0.6, // radians (how similar directions need to be) (increased tolerance)
    DIRECTIONAL_SPAWN_MULTIPLIER: 3, // how many more enemies to spawn in direction (increased from 2)
    
    // Swarm spawning (when player stands still)
    STANDING_STILL_THRESHOLD: 5000, // milliseconds of standing still before swarm spawns (increased)
    STANDING_STILL_DISTANCE: 15, // pixels - if player moves less than this, considered "still" (reduced)
    SWARM_SIZE: 8, // number of enemies in the swarm
    SWARM_MIN_GAME_TIME: 20000, // milliseconds - swarms only spawn after this much game time
    SWARM_COOLDOWN: 10000, // milliseconds between swarm spawns (prevent too frequent spawning)
    
    // Orb Absorbers
    ORB_ABSORBER_SPAWN_INTERVAL: 30000, // milliseconds between absorber spawns
    ORB_ABSORBER_SPAWN_DISTANCE: 200, // distance from player to spawn absorber
    ORB_ABSORBER_COLLECTION_RADIUS: 1200, // radius around absorber to collect orbs
    
    // Boss Enemy
    BOSS_SPAWN_INTERVAL: 60000, // milliseconds between boss spawns (60 seconds)
    BOSS_SPAWN_DISTANCE: 500, // distance from player to spawn boss
    BOSS_HP: 15, // Boss health (takes 15 hits to kill, increased difficulty)
    BOSS_SIZE: 40, // Boss size
    BOSS_SPEED: 1.2, // Boss movement speed (increased for more challenge)
    BOSS_DASH_SPEED: 4.0, // Boss dash speed (much faster than normal)
    BOSS_DASH_DURATION: 8000, // How long the dash lasts (milliseconds, increased from 500)
    BOSS_DASH_COOLDOWN: 3000, // Time between dashes (milliseconds)
    BOSS_SATELLITE_COUNT: 5, // Number of satellite enemies (increased from 4)
    BOSS_SATELLITE_DISTANCE: 60, // Distance satellites orbit from boss
    BOSS_SATELLITE_HP: 3, // Satellite health (takes 3 hits to kill)
    
    // Asteroids (environmental hazards)
    ASTEROID_SPAWN_INTERVAL: 8000, // milliseconds between asteroid field spawns
    ASTEROID_FIELD_SIZE: 3, // number of asteroid clusters per field
    ASTEROID_CLUSTER_SIZE: 4, // number of asteroids per cluster
    ASTEROID_CLUSTER_RADIUS: 40, // radius around cluster center to spawn asteroids
    ASTEROID_SPAWN_DISTANCE: 600, // distance from player to spawn asteroids
    ASTEROID_SPEED: 1.5, // speed of asteroids
    ASTEROID_COLOR: '#ffffff', // color of asteroids (white)
    ASTEROID_SIZE_MIN: 8, // minimum asteroid size
    ASTEROID_SIZE_MAX: 15, // maximum asteroid size
    ASTEROID_HP_MIN: 2, // minimum hits to destroy
    ASTEROID_HP_MAX: 4, // maximum hits to destroy
    
    // Score
    SCORE_PER_KILL: 10, // points awarded per enemy kill
    
    // XP
    XP_PER_KILL: 35, // XP awarded per enemy kill (reduced to slow progression)
    XP_BASE: 600, // base XP required for level 1 (increased to slow early progression)
    XP_MULTIPLIER: 1.25, // exponential multiplier for each level (1.25 = 25% increase per level, steeper curve)
    XP_ORB_SIZE: 6, // size of XP orbs
    XP_ORB_COLOR: '#00ffff', // color of XP orbs
    XP_PICKUP_RADIUS: 100, // base pickup radius for XP orbs (magnetic + collection range)
    
    // Upgrades
    UPGRADE_OPTIONS_COUNT: 3, // number of upgrade options to show per level
};

