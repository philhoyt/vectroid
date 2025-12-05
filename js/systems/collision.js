// Collision detection system

const Collision = {
    // Simple circle-circle collision
    checkCircleCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (r1 + r2);
    },
    
    checkBulletEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return false;
        return this.checkCircleCircle(
            bullet.x, bullet.y, CONFIG.BULLET_SIZE,
            enemy.x, enemy.y, enemy.size / 2
        );
    },
    
    checkBulletAsteroid(bullet, asteroid) {
        if (!bullet.active || !asteroid.active) return false;
        return this.checkCircleCircle(
            bullet.x, bullet.y, CONFIG.BULLET_SIZE,
            asteroid.x, asteroid.y, asteroid.size
        );
    },
    
    checkPlayerEnemy(player, enemy) {
        if (!player.alive || !enemy.active) return false;
        return this.checkCircleCircle(
            player.x, player.y, CONFIG.PLAYER_SIZE,
            enemy.x, enemy.y, enemy.size / 2
        );
    },
    
    checkPlayerXPOrb(player, orb) {
        if (!player.alive || !orb.active || orb.collected) return false;
        // Check if distance between player and orb is within pickup radius
        const dx = orb.x - player.x;
        const dy = orb.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < CONFIG.XP_PICKUP_RADIUS;
    },
    
    checkPlayerOrbAbsorber(player, absorber) {
        if (!player.alive || !absorber.active || absorber.collected) return false;
        const dx = absorber.x - player.x;
        const dy = absorber.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 25; // Collection radius for absorber
    },
    
    checkPlayerAsteroid(playerPos, asteroid) {
        if (!asteroid.active) return false;
        const dx = asteroid.x - playerPos.x;
        const dy = asteroid.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < CONFIG.PLAYER_SIZE + asteroid.size;
    },
    
    handleDashCollisions(enemies, player) {
        const killedEnemies = []; // Store positions of killed enemies
        
        // Only check dash collisions if player is dashing
        if (!player.isDashing) {
            return killedEnemies;
        }
        
        // Dash kills enemies on contact
        for (let enemy of enemies) {
            if (!enemy.active) continue;
            if (this.checkPlayerEnemy(player, enemy)) {
                // Store enemy position and color for XP orb drop and particles
                killedEnemies.push({ x: enemy.x, y: enemy.y, color: enemy.color });
                enemy.active = false;
            }
        }
        
        return killedEnemies;
    },
    
    handleCollisions(bullets, enemies, player, asteroids, bosses) {
        const killedEnemies = []; // Store positions of killed enemies
        
        // Dash vs Enemy (dash kills enemies, doesn't hurt player)
        if (player.isDashing) {
            const dashKills = this.handleDashCollisions(enemies, player);
            killedEnemies.push(...dashKills);
        }
        
        // Bullet vs Enemy
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet.active) continue;
            
            // Check bullet vs asteroids first
            let hitAsteroid = false;
            for (let j = asteroids.length - 1; j >= 0; j--) {
                const asteroid = asteroids[j];
                if (!asteroid.active) continue;
                
                if (this.checkBulletAsteroid(bullet, asteroid)) {
                    asteroid.hp -= 1;
                    if (asteroid.hp <= 0) {
                        asteroid.active = false;
                    }
                    
                    // Handle splitting bullets - create two new bullets that split off
                    if (bullet.canSplit && bullet.splitGeneration < 2) {
                        // Calculate the angle of the bullet's current direction
                        const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                        // Split angle (30 degrees spread)
                        const splitAngle = Math.PI / 6; // 30 degrees
                        
                        // Create two new bullets splitting off at angles
                        const newBullet1 = createBullet(
                            bullet.x, 
                            bullet.y, 
                            currentAngle - splitAngle, 
                            null, 
                            true, 
                            bullet.splitGeneration + 1
                        );
                        const newBullet2 = createBullet(
                            bullet.x, 
                            bullet.y, 
                            currentAngle + splitAngle, 
                            null, 
                            true, 
                            bullet.splitGeneration + 1
                        );
                        
                        bullets.push(newBullet1, newBullet2);
                    }
                    
                    // Destroy bullet on asteroid hit (no piercing through asteroids)
                    bullet.active = false;
                    hitAsteroid = true;
                    break;
                }
            }
            
            // Check bullet vs boss and satellites
            if (!hitAsteroid) {
                for (let j = bosses.length - 1; j >= 0; j--) {
                    const boss = bosses[j];
                    if (!boss.active) continue;
                    
                    // Check boss
                    if (this.checkBulletBoss(bullet, boss)) {
                        boss.hp -= 1;
                        if (boss.hp <= 0) {
                            // Boss killed - drop XP
                            killedEnemies.push({ x: boss.x, y: boss.y, isBoss: true, color: boss.color });
                            boss.active = false;
                        }
                        // Destroy bullet on boss hit (no piercing through boss)
                        bullet.active = false;
                        hitAsteroid = true;
                        break;
                    }
                    
                    // Check satellites
                    for (let k = boss.satellites.length - 1; k >= 0; k--) {
                        const satellite = boss.satellites[k];
                        if (!satellite.active) continue;
                        
                        if (this.checkBulletSatellite(bullet, satellite)) {
                            satellite.hp -= 1;
                            if (satellite.hp <= 0) {
                                // Satellite killed - drop XP
                                killedEnemies.push({ x: satellite.x, y: satellite.y, color: satellite.color });
                                satellite.active = false;
                            }
                            // Destroy bullet on satellite hit
                            bullet.active = false;
                            hitAsteroid = true;
                            break;
                        }
                    }
                    if (hitAsteroid) break;
                }
            }
            
            // Only check enemies if bullet didn't hit an asteroid or boss
            if (!hitAsteroid) {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (!enemy.active) continue;
                    
                    // Skip if bullet already hit this enemy (for piercing)
                    if (bullet.enemiesHit && bullet.enemiesHit.includes(enemy)) {
                        continue;
                    }
                    
                    if (this.checkBulletEnemy(bullet, enemy)) {
                        // Mark enemy as hit
                        if (!bullet.enemiesHit) {
                            bullet.enemiesHit = [];
                        }
                        bullet.enemiesHit.push(enemy);
                        
                        enemy.hp -= 1;
                        if (enemy.hp <= 0) {
                            // Store enemy position for XP orb drop
                            killedEnemies.push({ x: enemy.x, y: enemy.y, color: enemy.color });
                            enemy.active = false;
                        }
                        
                        // Handle splitting bullets - create two new bullets that split off
                        if (bullet.canSplit && bullet.splitGeneration < 2) {
                            // Calculate the angle of the bullet's current direction
                            const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                            // Split angle (30 degrees spread)
                            const splitAngle = Math.PI / 6; // 30 degrees
                            
                            // Create two new bullets splitting off at angles
                            const newBullet1 = createBullet(
                                bullet.x, 
                                bullet.y, 
                                currentAngle - splitAngle, 
                                null, 
                                true, 
                                bullet.splitGeneration + 1
                            );
                            const newBullet2 = createBullet(
                                bullet.x, 
                                bullet.y, 
                                currentAngle + splitAngle, 
                                null, 
                                true, 
                                bullet.splitGeneration + 1
                            );
                            
                            bullets.push(newBullet1, newBullet2);
                        }
                        
                        // Check if bullet should be destroyed
                        // If bullet split, always destroy it
                        // Otherwise, check piercing logic
                        if (bullet.canSplit) {
                            // Splitting bullets are always destroyed on hit
                            bullet.active = false;
                        } else if (bullet.pierceCount === 0 || bullet.enemiesHit.length > bullet.pierceCount) {
                            // Non-splitting bullets follow piercing logic
                            bullet.active = false;
                        }
                        break; // Only hit one enemy per frame
                    }
                }
            }
        }
        
        // Player vs Enemy (only check if NOT dashing - dash kills enemies instead)
        if (!player.isDashing) {
            for (let enemy of enemies) {
                if (!enemy.active) continue;
                if (this.checkPlayerEnemy(player, enemy)) {
                    player.alive = false;
                    break;
                }
            }
        }
        
        // Player vs Boss and Satellites
        if (!player.isDashing) {
            for (let boss of bosses) {
                if (!boss.active) continue;
                if (this.checkPlayerBoss(player, boss)) {
                    player.alive = false;
                    break;
                }
                
                // Check satellites
                for (let satellite of boss.satellites) {
                    if (!satellite.active) continue;
                    if (this.checkPlayerSatellite(player, satellite)) {
                        player.alive = false;
                        break;
                    }
                }
                if (!player.alive) break;
            }
        }
        
        return killedEnemies;
    },
    
    checkBulletBoss(bullet, boss) {
        if (!bullet.active || !boss.active) return false;
        return this.checkCircleCircle(
            bullet.x, bullet.y, CONFIG.BULLET_SIZE,
            boss.x, boss.y, boss.size
        );
    },
    
    checkBulletSatellite(bullet, satellite) {
        if (!bullet.active || !satellite.active) return false;
        return this.checkCircleCircle(
            bullet.x, bullet.y, CONFIG.BULLET_SIZE,
            satellite.x, satellite.y, satellite.size
        );
    },
    
    checkPlayerBoss(playerPos, boss) {
        if (!boss.active) return false;
        const dx = boss.x - playerPos.x;
        const dy = boss.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < CONFIG.PLAYER_SIZE + boss.size;
    },
    
    checkPlayerSatellite(playerPos, satellite) {
        if (!satellite.active) return false;
        const dx = satellite.x - playerPos.x;
        const dy = satellite.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < CONFIG.PLAYER_SIZE + satellite.size;
    },
    
    handleXPOrbCollection(xpOrbs, player) {
        let collectedXP = 0;
        
        for (let orb of xpOrbs) {
            if (!orb.active || orb.collected) continue;
            
            if (this.checkPlayerXPOrb(player, orb)) {
                orb.collected = true;
                orb.active = false;
                collectedXP += orb.xpAmount;
            }
        }
        
        return collectedXP;
    },
    
    handleOrbAbsorberCollection(orbAbsorbers, xpOrbs, player) {
        let totalCollectedXP = 0;
        
        for (let absorber of orbAbsorbers) {
            if (!absorber.active || absorber.collected) continue;
            
            if (this.checkPlayerOrbAbsorber(player, absorber)) {
                absorber.collected = true;
                absorber.active = false;
                
                // Collect XP orbs within radius around absorber
                for (let orb of xpOrbs) {
                    if (!orb.active || orb.collected) continue;
                    
                    // Check distance from absorber to orb
                    const dx = orb.x - absorber.x;
                    const dy = orb.y - absorber.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < CONFIG.ORB_ABSORBER_COLLECTION_RADIUS) {
                        orb.collected = true;
                        orb.active = false;
                        totalCollectedXP += orb.xpAmount;
                    }
                }
            }
        }
        
        return totalCollectedXP;
    }
};

