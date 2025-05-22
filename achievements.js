class AchievementSystem {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.achievements = [
            {
                id: 'first_flight',
                name: 'First Flight',
                description: 'Complete your first day',
                perk: 'None',
                unlocked: false,
                icon: '🦅'
            },
            {
                id: 'high_flyer',
                name: 'High Flyer',
                description: 'Reach 15,000 feet in height',
                perk: '+5% Flight Speed',
                unlocked: false,
                icon: '🚀'
            },
            {
                id: 'rich_pigeon',
                name: 'Rich Pigeon',
                description: 'Collect 1000 money in a single day',
                perk: '+10% Money Collection',
                unlocked: false,
                icon: '💰'
            },
            {
                id: 'cloud_surfer',
                name: 'Cloud Surfer',
                description: 'Stay in clouds for 30 seconds',
                perk: '+5% Energy Regeneration',
                unlocked: false,
                icon: '☁️'
            },
            {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Use boost power-up 5 times in one day',
                perk: '+10% Boost Duration',
                unlocked: false,
                icon: '⚡'
            },
            {
                id: 'lucky_shield',
                name: 'Lucky Shield',
                description: 'Collect 3 shield power-ups in one day',
                perk: '+5% Shield Duration',
                unlocked: false,
                icon: '🛡️'
            },
            {
                id: 'endurance_master',
                name: 'Endurance Master',
                description: 'Travel 10,000 distance in one day',
                perk: '+10% Max Energy',
                unlocked: false,
                icon: '🏃'
            },
            {
                id: 'star_gazer',
                name: 'Star Gazer',
                description: 'Reach 25,000 feet in height',
                perk: '+15% Sight Range',
                unlocked: false,
                icon: '⭐'
            },
            {
                id: 'money_magnet',
                name: 'Money Magnet',
                description: 'Collect 5000 total money',
                perk: '+20% Money Collection',
                unlocked: false,
                icon: '💎'
            },
            {
                id: 'cloud_king',
                name: 'Cloud King',
                description: 'Stay in clouds for 2 minutes',
                perk: '+15% Energy Regeneration',
                unlocked: false,
                icon: '👑'
            },
            {
                id: 'boost_master',
                name: 'Boost Master',
                description: 'Use boost power-up 10 times in one day',
                perk: '+20% Boost Duration',
                unlocked: false,
                icon: '🚀'
            },
            {
                id: 'shield_expert',
                name: 'Shield Expert',
                description: 'Collect 5 shield power-ups in one day',
                perk: '+10% Shield Duration',
                unlocked: false,
                icon: '🛡️'
            },
            {
                id: 'marathon_runner',
                name: 'Marathon Runner',
                description: 'Travel 20,000 distance in one day',
                perk: '+20% Max Energy',
                unlocked: false,
                icon: '🏃'
            },
            {
                id: 'cosmic_explorer',
                name: 'Cosmic Explorer',
                description: 'Reach 35,000 feet in height',
                perk: '+25% Sight Range',
                unlocked: false,
                icon: '🌌'
            },
            {
                id: 'millionaire',
                name: 'Millionaire',
                description: 'Collect 10,000 total money',
                perk: '+30% Money Collection',
                unlocked: false,
                icon: '💎'
            },
            {
                id: 'cloud_emperor',
                name: 'Cloud Emperor',
                description: 'Stay in clouds for 5 minutes',
                perk: '+25% Energy Regeneration',
                unlocked: false,
                icon: '👑'
            }
        ];

        this.createAchievementUI();
    }

    createAchievementUI() {
        // Create achievement button in shop screen
        const shopScreen = document.getElementById('gameOverScreen');
        if (shopScreen && !document.getElementById('achievementButton')) {
            const achievementButton = document.createElement('button');
            achievementButton.id = 'achievementButton';
            achievementButton.textContent = 'View Achievements';
            achievementButton.className = 'shop-button';
            achievementButton.onclick = () => this.showAchievementScreen();
            shopScreen.insertBefore(achievementButton, shopScreen.firstChild);
        }

        // Create achievement screen
        if (!document.getElementById('achievementScreen')) {
            const achievementScreen = document.createElement('div');
            achievementScreen.id = 'achievementScreen';
            achievementScreen.className = 'screen hidden';
            achievementScreen.innerHTML = `
                <h1>Achievements</h1>
                <div id="achievementGrid"></div>
                <button id="closeAchievements">Close</button>
            `;
            document.body.appendChild(achievementScreen);

            // Add close button functionality
            document.getElementById('closeAchievements').onclick = () => {
                achievementScreen.classList.add('hidden');
                document.getElementById('gameOverScreen').classList.remove('hidden');
            };

            // Add styles
            const style = document.getElementById('game-styles');
            if (style) {
                style.textContent += `
                    #achievementButton {
                        background-color: #FFD700;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        color: #000;
                        font-weight: bold;
                        cursor: pointer;
                        margin-bottom: 20px;
                        transition: all 0.2s ease;
                    }
                    #achievementButton:hover {
                        background-color: #FFC000;
                        transform: scale(1.05);
                    }
                    #achievementGrid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 20px;
                        padding: 20px;
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .achievement-box {
                        background: rgba(30, 30, 30, 0.8);
                        border: 2px solid #4169E1;
                        border-radius: 8px;
                        padding: 15px;
                        text-align: center;
                        cursor: pointer;
                        position: relative;
                        transition: all 0.2s ease;
                    }
                    .achievement-box:hover {
                        transform: scale(1.05);
                        border-color: #FFD700;
                    }
                    .achievement-box.locked {
                        opacity: 0.5;
                        border-color: #666;
                    }
                    .achievement-box.unlocked {
                        border-color: #FFD700;
                        background: rgba(30, 30, 30, 0.9);
                    }
                    .achievement-icon {
                        font-size: 32px;
                        margin-bottom: 10px;
                    }
                    .achievement-name {
                        font-weight: bold;
                        color: #B4D6FF;
                        margin-bottom: 5px;
                    }
                    .achievement-description {
                        font-size: 14px;
                        color: #ccc;
                        margin-bottom: 5px;
                    }
                    .achievement-perk {
                        display: none;
                        position: absolute;
                        bottom: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.9);
                        padding: 10px;
                        border-radius: 5px;
                        color: #FFD700;
                        font-weight: bold;
                        white-space: nowrap;
                        margin-bottom: 10px;
                        z-index: 1000;
                    }
                    .achievement-box:hover .achievement-perk {
                        display: block;
                    }
                    #closeAchievements {
                        margin-top: 20px;
                        padding: 10px 20px;
                        font-size: 18px;
                        background: #4169E1;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    #closeAchievements:hover {
                        background: #3457b2;
                        transform: scale(1.05);
                    }
                `;
            }
        }

        this.updateAchievementGrid();
    }

    showAchievementScreen() {
        document.getElementById('achievementScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
    }

    updateAchievementGrid() {
        const grid = document.getElementById('achievementGrid');
        if (!grid) return;

        grid.innerHTML = '';
        this.achievements.forEach(achievement => {
            const box = document.createElement('div');
            box.className = `achievement-box ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            box.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="achievement-perk">${achievement.perk}</div>
            `;
            grid.appendChild(box);
        });
    }

    checkAchievements(gameState) {
        let achievementsUnlocked = false;

        // Check each achievement
        this.achievements.forEach(achievement => {
            if (achievement.unlocked) return;

            let shouldUnlock = false;
            switch (achievement.id) {
                case 'first_flight':
                    shouldUnlock = gameState.currentDay > 1;
                    break;
                case 'high_flyer':
                    shouldUnlock = gameState.maxHeight >= 15000;
                    break;
                case 'rich_pigeon':
                    shouldUnlock = gameState.powerPointsCollected >= 1000;
                    break;
                case 'cloud_surfer':
                    shouldUnlock = gameState.cloudTime >= 30;
                    break;
                case 'speed_demon':
                    shouldUnlock = gameState.boostCount >= 5;
                    break;
                case 'lucky_shield':
                    shouldUnlock = gameState.shieldCount >= 3;
                    break;
                case 'endurance_master':
                    shouldUnlock = gameState.distanceTraveled >= 10000;
                    break;
                case 'star_gazer':
                    shouldUnlock = gameState.maxHeight >= 25000;
                    break;
                case 'money_magnet':
                    shouldUnlock = gameState.totalMoney >= 5000;
                    break;
                case 'cloud_king':
                    shouldUnlock = gameState.cloudTime >= 120;
                    break;
                case 'boost_master':
                    shouldUnlock = gameState.boostCount >= 10;
                    break;
                case 'shield_expert':
                    shouldUnlock = gameState.shieldCount >= 5;
                    break;
                case 'marathon_runner':
                    shouldUnlock = gameState.distanceTraveled >= 20000;
                    break;
                case 'cosmic_explorer':
                    shouldUnlock = gameState.maxHeight >= 35000;
                    break;
                case 'millionaire':
                    shouldUnlock = gameState.totalMoney >= 10000;
                    break;
                case 'cloud_emperor':
                    shouldUnlock = gameState.cloudTime >= 300;
                    break;
            }

            if (shouldUnlock) {
                achievement.unlocked = true;
                achievementsUnlocked = true;
                this.applyAchievementPerk(achievement);
            }
        });

        if (achievementsUnlocked) {
            this.updateAchievementGrid();
            this.showAchievementUnlockNotification();
        }
    }

    applyAchievementPerk(achievement) {
        // Apply the perk based on the achievement
        switch (achievement.id) {
            case 'high_flyer':
                this.game.gameSpeed *= 1.05;
                break;
            case 'rich_pigeon':
                this.game.moneyMultiplier = 1.1;
                break;
            case 'cloud_surfer':
                this.game.energy.regenRate *= 1.05;
                break;
            case 'speed_demon':
                this.game.player.boostDuration *= 1.1;
                break;
            case 'lucky_shield':
                this.game.powerUpDuration *= 1.05;
                break;
            case 'endurance_master':
                this.game.energy.max *= 1.1;
                break;
            case 'star_gazer':
                this.game.camera.sightBonus += 0.15;
                break;
            case 'money_magnet':
                this.game.moneyMultiplier = 1.2;
                break;
            case 'cloud_king':
                this.game.energy.regenRate *= 1.15;
                break;
            case 'boost_master':
                this.game.player.boostDuration *= 1.2;
                break;
            case 'shield_expert':
                this.game.powerUpDuration *= 1.1;
                break;
            case 'marathon_runner':
                this.game.energy.max *= 1.2;
                break;
            case 'cosmic_explorer':
                this.game.camera.sightBonus += 0.25;
                break;
            case 'millionaire':
                this.game.moneyMultiplier = 1.3;
                break;
            case 'cloud_emperor':
                this.game.energy.regenRate *= 1.25;
                break;
        }
    }

    showAchievementUnlockNotification() {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('achievementNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'achievementNotification';
            document.body.appendChild(notification);
            
            // Add style for the notification
            const style = document.getElementById('game-styles');
            if (style) {
                style.textContent += `
                    #achievementNotification {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(255, 215, 0, 0.8);
                        color: #000;
                        padding: 15px 30px;
                        border-radius: 8px;
                        font-family: Arial, sans-serif;
                        font-size: 24px;
                        font-weight: bold;
                        z-index: 1000;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        text-align: center;
                        pointer-events: none;
                    }
                    #achievementNotification.visible {
                        opacity: 1;
                    }
                `;
            }
        }
        
        // Set message and show notification
        notification.textContent = 'Achievement Unlocked!';
        notification.classList.add('visible');
        
        // Hide notification after 2 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
        }, 2000);
    }
} 