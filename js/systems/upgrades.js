// Upgrade system

const Upgrades = {
    // Base values (stored at game start)
    baseValues: {
        bulletCount: 32,
        fireRate: 800,
        playerSpeed: 5,
        bulletSize: 4,
        xpPickupRadius: CONFIG.XP_PICKUP_RADIUS,
    },
    
    // Current upgrade levels
    levels: {
        bulletCount: 0,
        fireRate: 0,
        playerSpeed: 0,
        bulletSize: 0,
        directionalPulse: 0, // 0 = not unlocked, 1+ = unlocked with levels
        piercing: 0, // 0 = not unlocked, 1+ = pierce count
        xpPickupRadius: 0,
        explosiveBullets: 0, // 0 = not unlocked, 1+ = unlocked
        dashDuration: 0, // Dash duration upgrade
        dashCooldown: 0, // Dash cooldown reduction upgrade
        dashSpeed: 0, // Dash speed multiplier upgrade
        homingBurstBullets: 0, // 0 = not unlocked, 1+ = unlocked
    },
    
    // Available upgrade options
    options: [
        {
            id: 'bulletCount',
            name: 'More Bullets',
            multiplier: 0.12, // 12% increase per level (buffed from 8%)
            getDescription: (level) => {
                // Show what you'll get after selecting (next level)
                const nextLevel = level + 1;
                const totalMultiplier = (1 + 0.12) ** nextLevel;
                const totalPercent = ((totalMultiplier - 1) * 100).toFixed(1);
                return `+${totalPercent}% bullets (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.bulletCount++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'fireRate',
            name: 'Rapid Fire',
            multiplier: 0.06, // 6% faster (reduces interval by 6%, reduced from 8% to slow scaling)
            getDescription: (level) => {
                // Show what you'll get after selecting (next level)
                const nextLevel = level + 1;
                const totalMultiplier = (1 - 0.08) ** nextLevel;
                const totalPercent = ((1 - totalMultiplier) * 100).toFixed(1);
                return `+${totalPercent}% fire rate (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.fireRate++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'playerSpeed',
            name: 'Move Faster',
            multiplier: 0.025, // 2.5% increase per level
            getDescription: (level) => {
                // Show what you'll get after selecting (next level)
                const nextLevel = level + 1;
                const totalMultiplier = (1 + 0.025) ** nextLevel;
                const totalPercent = ((totalMultiplier - 1) * 100).toFixed(1);
                return `+${totalPercent}% movement speed (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.playerSpeed++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'bulletSize',
            name: 'Bigger Bullets',
            multiplier: 0.15, // 15% increase per level (reduced from 20% to slow scaling)
            getDescription: (level) => {
                // Show what you'll get after selecting (next level)
                const nextLevel = level + 1;
                const totalMultiplier = (1 + 0.20) ** nextLevel;
                const totalPercent = ((totalMultiplier - 1) * 100).toFixed(1);
                return `+${totalPercent}% bullet size (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.bulletSize++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'directionalPulse',
            name: 'Directional Pulse',
            multiplier: 0.05, // 5% more bullets per level
            getDescription: (level) => {
                if (level === 0) {
                    return 'Unlock forward-facing pulse attack';
                }
                const bulletCount = 8 + (level * 2);
                return `${bulletCount} bullets in forward cone (x${level + 1})`;
            },
            apply: () => {
                Upgrades.levels.directionalPulse++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'piercing',
            name: 'Piercing Bullets',
            isRare: true, // Mark as rare upgrade
            getDescription: (level) => {
                if (level === 0) {
                    return 'Bullets pierce through 2 enemies';
                }
                const pierceCount = 2 + level;
                return `Bullets pierce through ${pierceCount} enemies (x${level + 1})`;
            },
            apply: () => {
                Upgrades.levels.piercing++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'xpPickupRadius',
            name: 'XP Magnet',
            multiplier: 0.20, // 20% increase per level
            getDescription: (level) => {
                // Show what you'll get after selecting (next level)
                const nextLevel = level + 1;
                const totalMultiplier = (1 + 0.20) ** nextLevel;
                const totalPercent = ((totalMultiplier - 1) * 100).toFixed(0);
                return `+${totalPercent}% XP pickup radius (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.xpPickupRadius++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'explosiveBullets',
            name: 'Explosive Bullets',
            isRare: true, // Mark as rare upgrade
            multiplier: 0, // Not used for this upgrade, but needed for consistency
            getDescription: (level) => {
                if (level === 0) {
                    return 'Unlock: Bullets split into 2 on hit';
                }
                // Show multiplier like other upgrades
                const nextLevel = level + 1;
                return `Bullets split into 2 on hit (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.explosiveBullets++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'dashDuration',
            name: 'Dash Duration',
            isRare: true, // Make dash upgrades rare
            multiplier: 0.15, // 15% longer duration per level
            getDescription: (level) => {
                const nextLevel = level + 1;
                const totalMultiplier = (1 + 0.15) ** nextLevel;
                const totalPercent = ((totalMultiplier - 1) * 100).toFixed(1);
                return `+${totalPercent}% dash duration (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.dashDuration++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'dashCooldown',
            name: 'Dash Cooldown',
            multiplier: 0.10, // 10% faster cooldown per level (reduces cooldown)
            getDescription: (level) => {
                const nextLevel = level + 1;
                const totalMultiplier = (1 - 0.10) ** nextLevel;
                const totalPercent = ((1 - totalMultiplier) * 100).toFixed(1);
                return `-${totalPercent}% dash cooldown (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.dashCooldown++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'dashSpeed',
            name: 'Dash Speed',
            isRare: true, // Make dash upgrades rare
            multiplier: 0.10, // 10% faster dash per level
            getDescription: (level) => {
                const nextLevel = level + 1;
                const totalMultiplier = (1 + 0.10) ** nextLevel;
                const totalPercent = ((totalMultiplier - 1) * 100).toFixed(1);
                return `+${totalPercent}% dash speed (x${nextLevel})`;
            },
            apply: () => {
                Upgrades.levels.dashSpeed++;
                Upgrades.recalculateStats();
            }
        },
        {
            id: 'homingBurstBullets',
            name: 'Homing Burst',
            multiplier: 0, // Not a multiplier upgrade, just unlocks the feature
            isRare: true, // Make it a rare upgrade
            getDescription: (level) => {
                if (level === 0) {
                    return 'Burst bullets home in on enemies';
                }
                return 'Burst bullets home in on enemies (x' + (level + 1) + ')';
            },
            apply: () => {
                Upgrades.levels.homingBurstBullets++;
                // No stat recalculation needed, just a flag
            }
        },
    ],
    
    init() {
        // Store base values
        this.baseValues = {
            bulletCount: CONFIG.BULLET_COUNT,
            burstBulletCount: CONFIG.BURST_BULLET_COUNT,
            fireRate: CONFIG.BULLET_PULSE_INTERVAL,
            playerSpeed: CONFIG.PLAYER_SPEED,
            bulletSize: CONFIG.BULLET_SIZE,
            xpPickupRadius: CONFIG.XP_PICKUP_RADIUS,
            dashDuration: CONFIG.DASH_DURATION,
            dashCooldown: CONFIG.DASH_COOLDOWN,
            dashSpeed: CONFIG.DASH_SPEED_MULTIPLIER,
        };
        
        // Reset all upgrade levels
        this.levels = {
            bulletCount: 0,
            fireRate: 0,
            playerSpeed: 0,
            bulletSize: 0,
            directionalPulse: 0,
            piercing: 0,
            xpPickupRadius: 0,
            explosiveBullets: 0,
            dashDuration: 0,
            dashCooldown: 0,
            dashSpeed: 0,
            homingBurstBullets: 0,
        };
        
        // Recalculate stats from base
        this.recalculateStats();
    },
    
    recalculateStats() {
        // Bullet Count: 5% multiplicative increase per level
        const bulletCountUpgrade = this.options.find(o => o.id === 'bulletCount');
        const bulletMultiplier = (1 + bulletCountUpgrade.multiplier) ** this.levels.bulletCount;
        CONFIG.BULLET_COUNT = Math.floor(this.baseValues.bulletCount * bulletMultiplier);
        // Burst bullets: percentage increase + 1 bullet per level
        CONFIG.BURST_BULLET_COUNT = Math.floor(this.baseValues.burstBulletCount * bulletMultiplier) + this.levels.bulletCount;
        
        // Fire Rate: 8% faster per level (reduces interval)
        const fireRateUpgrade = this.options.find(o => o.id === 'fireRate');
        const fireRateMultiplier = (1 - fireRateUpgrade.multiplier) ** this.levels.fireRate;
        CONFIG.BULLET_PULSE_INTERVAL = Math.max(100, this.baseValues.fireRate * fireRateMultiplier);
        
        // Player Speed: 2.5% multiplicative increase per level
        const playerSpeedUpgrade = this.options.find(o => o.id === 'playerSpeed');
        const playerSpeedMultiplier = (1 + playerSpeedUpgrade.multiplier) ** this.levels.playerSpeed;
        CONFIG.PLAYER_SPEED = this.baseValues.playerSpeed * playerSpeedMultiplier;
        
        // Bullet Size: 20% multiplicative increase per level
        const bulletSizeUpgrade = this.options.find(o => o.id === 'bulletSize');
        const bulletSizeMultiplier = (1 + bulletSizeUpgrade.multiplier) ** this.levels.bulletSize;
        CONFIG.BULLET_SIZE = this.baseValues.bulletSize * bulletSizeMultiplier;
        
        // XP Pickup Radius: 20% multiplicative increase per level
        const xpPickupRadiusUpgrade = this.options.find(o => o.id === 'xpPickupRadius');
        const xpPickupRadiusMultiplier = (1 + xpPickupRadiusUpgrade.multiplier) ** this.levels.xpPickupRadius;
        CONFIG.XP_PICKUP_RADIUS = this.baseValues.xpPickupRadius * xpPickupRadiusMultiplier;
        
        // Dash Duration: 15% longer duration per level
        const dashDurationUpgrade = this.options.find(o => o.id === 'dashDuration');
        const dashDurationMultiplier = (1 + dashDurationUpgrade.multiplier) ** this.levels.dashDuration;
        CONFIG.DASH_DURATION = Math.floor(this.baseValues.dashDuration * dashDurationMultiplier);
        
        // Dash Cooldown: 10% faster cooldown per level (reduces cooldown)
        const dashCooldownUpgrade = this.options.find(o => o.id === 'dashCooldown');
        const dashCooldownMultiplier = (1 - dashCooldownUpgrade.multiplier) ** this.levels.dashCooldown;
        CONFIG.DASH_COOLDOWN = Math.max(500, Math.floor(this.baseValues.dashCooldown * dashCooldownMultiplier));
        
        // Dash Speed: 10% faster dash per level
        const dashSpeedUpgrade = this.options.find(o => o.id === 'dashSpeed');
        const dashSpeedMultiplier = (1 + dashSpeedUpgrade.multiplier) ** this.levels.dashSpeed;
        CONFIG.DASH_SPEED_MULTIPLIER = this.baseValues.dashSpeed * dashSpeedMultiplier;
    },
    
    getRandomUpgrades(count = 3) {
        // Separate rare and common upgrades
        const commonUpgrades = this.options.filter(u => !u.isRare);
        const rareUpgrades = this.options.filter(u => u.isRare);
        
        // Always include at least one rare upgrade if available and not already maxed
        const availableRare = rareUpgrades.filter(u => this.levels[u.id] === 0 || (u.id === 'piercing' && this.levels[u.id] < 5));
        const availableCommon = commonUpgrades;
        
        let selected = [];
        
        // 10% chance to include a rare upgrade if available
        if (availableRare.length > 0 && Math.random() < 0.1) {
            const rare = availableRare[Math.floor(Math.random() * availableRare.length)];
            selected.push(rare);
        }
        
        // Fill remaining slots with common upgrades
        const shuffled = [...availableCommon].sort(() => Math.random() - 0.5);
        while (selected.length < count && shuffled.length > 0) {
            selected.push(shuffled.shift());
        }
        
        // Shuffle final selection
        selected = selected.sort(() => Math.random() - 0.5);
        
        return selected.slice(0, count).map(upgrade => ({
            ...upgrade,
            level: this.levels[upgrade.id],
            description: upgrade.getDescription(this.levels[upgrade.id])
        }));
    },
    
    applyUpgrade(upgradeId) {
        const upgrade = this.options.find(u => u.id === upgradeId);
        if (upgrade) {
            upgrade.apply();
        }
    },
    
    getUpgradeSummary() {
        const summary = [];
        for (const [id, level] of Object.entries(this.levels)) {
            if (level > 0) {
                const upgrade = this.options.find(u => u.id === id);
                if (upgrade) {
                    summary.push({
                        name: upgrade.name,
                        level: level
                    });
                }
            }
        }
        return summary;
    }
};

