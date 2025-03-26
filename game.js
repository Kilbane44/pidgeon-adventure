class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Load game images
        this.images = {
            playerFrames: []  // Will hold all animation frames
        };

        // Remove the visible GIF element since we now have frame images
        let loadedFrames = 0;
        
        // Just use the two frames we have available
        const numFrames = 2; // Only using bird0.png and bird1.png
        
        // Load the two bird frames
        for (let i = 0; i < numFrames; i++) {
            const frameImg = new Image();
            // Use preload function to ensure all frames are loaded
            frameImg.onload = () => {
                loadedFrames++;
                if (loadedFrames >= numFrames) {
                    this.initGame();
                }
            };
            frameImg.src = `assets/bird${i}.png`;
            this.images.playerFrames.push(frameImg);
        }
    }
    
    initGame() {
        // Make canvas full window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
        
        // Position ground even lower on the screen (9/10 of the screen height from the top)
        const groundPosition = this.canvas.height;
        
        // Camera properties
        this.camera = {
            scale: 1,
            baseScale: 1,
            minScale: 0.5,     // Minimum scale (most zoomed out) at high altitudes
            maxScale: 1.2,     // Maximum scale (most zoomed in) at ground level
            targetScale: 1,
            zoomSpeed: 0.02,
            groundY: groundPosition,
            x: 0,
            y: 0,
            maxHeight: this.canvas.height * 10  // Allow flying much higher
        };
        
        // Generate stars once at initialization
        this.stars = this.generateStars(300);
        
        // Add cloud system - BUT DON'T GENERATE CLOUDS UNTIL GAME STARTS
        this.clouds = [];
        this.cloudParticles = [];  // For exit effect particles
        
        // Energy system
        this.energy = {
            current: 100,       // Start with full energy
            max: 100,           // Maximum energy
            drainRate: 0.0625,  // Energy drain when flying up (reduced from 0.5)
            groundDrainRate: 0.03125, // Energy drain when on ground (reduced from 0.25)
            regenRate: 0.02,     // Energy regen when falling
            isEmpty: false,     // Flag for when energy is depleted
            barWidth: 200,      // Width of energy bar in pixels
            barHeight: 20,      // Height of energy bar in pixels
            barBorderWidth: 3,  // Border width of energy bar
            barPadding: 5       // Padding inside bar border
        };
        
        this.player = {
            x: 100,
            y: groundPosition - 150, // Positioned higher above the lowered ground
            width: 64,  // Adjusted for sprite size
            height: 64, // Adjusted for sprite size
            velocity: 0,
            gravity: 0.15,
            maxVelocity: 6,
            hasShield: false,
            isShrunk: false,
            originalWidth: 64,  // Adjusted for sprite size
            originalHeight: 64, // Adjusted for sprite size
            isHolding: false,
            swoopForce: -0.5,
            swoopAngle: 0,
            frameIndex: 0,          // Current animation frame
            frameTimer: 0,          // Timer for frame animation
            frameDuration: 125,     // Each frame lasts 125ms (250ms for complete 2-frame cycle)
            numberOfFrames: 2,      // Total number of frames (just 2 frames)
            startY: groundPosition - 150, // Store starting Y relative to ground
            
            // Boost power-up properties - reduced speeds to prevent camera issues
            isBoosting: false,
            boostSpeed: 0,
            boostMaxSpeed: 8,       // Reduced from 15 to prevent objects vanishing
            boostUpForce: -10,       // Increased upward force for more vertical boost
            boostDuration: 3000,    // 3 seconds of boost
            boostTimer: 0,
            cometTrail: [],          // Array to store comet trail particles
            isInCloud: false, // Track if player is inside a cloud
            
            // Energy-related properties
            isExhausted: false      // Flag for when bird is out of energy
        };
        
        this.obstacles = [];
        this.powerPoints = [];
        this.score = 0;
        this.powerPointsCollected = 0;
        this.gameSpeed = 2;
        this.isGameOver = false;
        this.isGameStarted = false;
        this.lastObstacleX = 0;
        this.powerUpDuration = 5000; // 5 seconds for power-ups
        this.powerUpTimer = null;
        
        this.distanceTraveled = 0;
        this.maxHeight = 0;
        
        // Ground obstacle tracking
        this.lastGroundObstacleDistance = 0;  // Track when the last ground obstacle was spawned
        this.groundObstacleInterval = 3000;   // Spawn ground obstacles every 3000 units
        
        this.setupEventListeners();
        this.showStartScreen();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scrolling with space
                if (!this.isGameStarted) {
                    this.startGame();
                } else if (!this.isGameOver) {
                    this.player.isHolding = true;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scrolling with space
                if (!this.isGameOver) {
                    this.player.isHolding = false;
                }
            }
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    showStartScreen() {
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
    }
    
    startGame() {
        this.isGameStarted = true;
        document.getElementById('startScreen').classList.add('hidden');
        
        // Now that the game has started, generate initial clouds
        this.generateClouds(15);
        
        this.gameLoop();
    }
    
    resetGame() {
        this.player.y = this.player.startY;
        this.player.velocity = 0;
        this.player.hasShield = false;
        this.player.isShrunk = false;
        this.player.width = this.player.originalWidth;
        this.player.height = this.player.originalHeight;
        this.player.isHolding = false;
        this.player.swoopAngle = 0;
        this.camera.scale = 1;
        this.camera.targetScale = 1;
        this.obstacles = [];
        this.powerPoints = [];
        this.clouds = [];          // Clear clouds on reset
        this.cloudParticles = [];  // Clear cloud particles on reset
        this.generateClouds(15);   // Generate new clouds on reset
        this.player.isInCloud = false;
        this.score = 0;
        this.powerPointsCollected = 0;
        this.gameSpeed = 2;
        this.isGameOver = false;
        this.isGameStarted = true;
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.updateScore();
        this.camera.groundY = this.canvas.height * 9/10;
        this.camera.x = 0;
        this.camera.y = 0;
        this.distanceTraveled = 0;
        this.maxHeight = 0;
        this.gameLoop();
        
        // Reset energy as well
        this.energy.current = this.energy.max;
        this.energy.isEmpty = false;
        this.player.isExhausted = false;
        
        // Reset ground obstacle tracking
        this.lastGroundObstacleDistance = 0;
    }
    
    gameLoop() {
        if (this.isGameOver) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateCamera() {
        // Calculate distance from ground
        const distanceFromGround = this.camera.groundY - this.player.y;
        const maxDistance = this.camera.maxHeight;
        
        // Calculate normalized distance (0 = at ground, 1 = at max height)
        const normalizedDistance = Math.min(distanceFromGround / maxDistance, 1);
        
        // Calculate target scale - more zoomed in (higher scale) when closer to ground
        // Linear interpolation between maxScale (at ground) and minScale (at maxHeight)
        this.camera.targetScale = this.camera.maxScale - normalizedDistance * (this.camera.maxScale - this.camera.minScale);
        
        // Smoothly interpolate current scale to target scale
        this.camera.scale += (this.camera.targetScale - this.camera.scale) * this.camera.zoomSpeed;
        
        // Update camera position to center on player horizontally
        // Apply smoother camera transition during boost with lerp
        const targetX = this.player.x - (this.canvas.width / 2);
        
        if (this.player.isBoosting) {
            // Smoother camera follow during boost (lerp)
            this.camera.x += (targetX - this.camera.x) * 0.1;
        } else {
            this.camera.x = targetX;
        }
        
        // Position camera vertically to keep player visible
        // Adjust vertical offset based on distance from ground to show more sky as player ascends
        // Reduced ground offset to show just a sliver of ground at the bottom
        const groundOffset = this.canvas.height / 10 * (1 + normalizedDistance * 2);
        this.camera.y = this.player.y - (this.canvas.height / 2) - groundOffset;
    }
    
    update() {
        // Update camera first
        this.updateCamera();
        
        // Update player animation using time-based animation
        const now = Date.now();
        if (!this.player.lastFrameTime) {
            this.player.lastFrameTime = now;
        }
        
        // Check if it's time to advance to the next frame
        if (now - this.player.lastFrameTime > this.player.frameDuration) {
            this.player.frameIndex = (this.player.frameIndex + 1) % this.player.numberOfFrames;
            this.player.lastFrameTime = now;
        }
        
        // Handle boost effect if active
        if (this.player.isBoosting) {
            // Calculate boost remaining time
            const boostElapsed = now - this.player.boostTimer;
            const boostProgress = Math.min(boostElapsed / this.player.boostDuration, 1);
            
            // Gradually decrease boost speed
            this.player.boostSpeed = this.player.boostMaxSpeed * (1 - boostProgress);
            
            // Advance player position based on boost
            this.player.x += this.player.boostSpeed;
            
            // Create trail particles
            if (Math.random() < 0.3) {
                this.player.cometTrail.push({
                    x: this.player.x + this.player.width / 2 - Math.random() * 20,
                    y: this.player.y + this.player.height / 2 + (Math.random() * 10 - 5),
                    size: 5 + Math.random() * 10,
                    opacity: 0.8,
                    life: 30,
                    // Add random velocities for more dynamic particles
                    vx: -Math.random() * 2 - 1,
                    vy: (Math.random() - 0.5) * 2
                });
            }
            
            // Update and remove old trail particles
            this.player.cometTrail.forEach(particle => {
                particle.opacity -= 0.02;
                particle.opacity = Math.max(particle.opacity, 0); // Ensure opacity doesn't go negative
                
                particle.size -= 0.3;
                particle.size = Math.max(particle.size, 0.1); // Ensure size doesn't go below 0.1
                
                particle.life--;
                // Move particles according to their velocities
                particle.x += particle.vx;
                particle.y += particle.vy;
            });
            
            // Remove dead particles (either by life or size)
            this.player.cometTrail = this.player.cometTrail.filter(particle => 
                particle.life > 0 && particle.size > 0.1 && particle.opacity > 0
            );
        }
        
        // Update energy based on player state
        this.updateEnergy();
        
        // Handle player movement with energy system
        if (this.player.isHolding && !this.player.isExhausted) {
            this.player.velocity += this.player.swoopForce;
            this.player.velocity = Math.max(this.player.velocity, -this.player.maxVelocity);
            this.player.swoopAngle = Math.min(this.player.swoopAngle + 0.1, 0.3);
        } else {
            this.player.velocity += this.player.gravity;
            this.player.velocity = Math.min(this.player.velocity, this.player.maxVelocity);
            this.player.swoopAngle = Math.max(this.player.swoopAngle - 0.1, -0.3);
        }
        
        this.player.y += this.player.velocity;
        
        // Check if player is on the ground
        const isOnGround = this.player.y + this.player.height >= this.camera.groundY;
        
        // Only check bottom boundary, allow unlimited upward flight
        if (isOnGround) {
            this.player.y = this.camera.groundY - this.player.height;
            this.player.velocity = 0;
            this.player.swoopAngle = 0;
        }
        
        // Generate obstacles more frequently based on need and visibility
        if (this.obstacles.length === 0 || 
            this.player.x + this.canvas.width - this.lastObstacleX > 500) {
            this.generateObstacle();
            
            // Sometimes generate multiple obstacles to fill space
            if (this.player.isBoosting && Math.random() < 0.5) {
                setTimeout(() => this.generateObstacle(), 100);
            }
        }
        
        // Check if it's time to spawn a ground obstacle
        if (this.distanceTraveled - this.lastGroundObstacleDistance >= this.groundObstacleInterval) {
            this.generateGroundObstacle();
            this.lastGroundObstacleDistance = this.distanceTraveled;
        }
        
        // Generate power points more aggressively during boost
        if (Math.random() < (this.player.isBoosting ? 0.05 : 0.03)) {
            this.generatePowerPoint();
        }
        
        // Keep filtering objects only when they're actually off-screen
        // Calculate viewport bounds based on camera position and canvas size
        const viewportLeft = this.camera.x - this.canvas.width / 2;
        const viewportRight = this.camera.x + this.canvas.width * 1.5; // Extra margin
        const viewportTop = this.camera.y - this.canvas.height / 2;
        const viewportBottom = this.camera.y + this.canvas.height * 1.5; // Extra margin
        
        // Filter obstacles only when they're well outside the viewport
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            return obstacle.x + obstacle.width > viewportLeft - 500 && 
                   obstacle.x < viewportRight + 500 &&
                   obstacle.y + obstacle.height > viewportTop - 500 &&
                   obstacle.y < viewportBottom + 500;
        });
        
        // Filter power points only when they're well outside the viewport
        this.powerPoints = this.powerPoints.filter(powerPoint => {
            powerPoint.x -= this.gameSpeed;
            return powerPoint.x + powerPoint.width > viewportLeft - 500 && 
                   powerPoint.x < viewportRight + 500 &&
                   powerPoint.y + powerPoint.height > viewportTop - 500 &&
                   powerPoint.y < viewportBottom + 500;
        });
        
        this.checkCollisions();
        
        this.score++;
        this.updateScore();
        
        if (this.score % 1500 === 0) {
            this.gameSpeed += 0.3;
        }
        
        // Update distance traveled
        this.distanceTraveled += this.gameSpeed;
        
        // Update max height (measured from ground, so lower y values = higher altitude)
        const currentHeight = this.camera.groundY - this.player.y;
        if (currentHeight > this.maxHeight) {
            this.maxHeight = currentHeight;
        }
        
        // Update cloud particles
        this.cloudParticles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 1;
            particle.opacity -= 0.02;
            particle.size -= 0.1;
        });
        
        // Remove dead cloud particles
        this.cloudParticles = this.cloudParticles.filter(particle => 
            particle.life > 0 && particle.opacity > 0 && particle.size > 0.1
        );
        
        // Check if player entered or exited a cloud
        let isInCloudNow = false;
        this.clouds.forEach(cloud => {
            // Move clouds slightly (they should appear stationary relative to world)
            cloud.x -= this.gameSpeed * 0.2; // Slower than obstacles to create parallax
            
            // Check if player is in this cloud
            if (this.isPlayerInCloud(this.player, cloud)) {
                isInCloudNow = true;
            }
        });
        
        // If player was in a cloud but now exited, create the exit effect
        if (this.player.isInCloud && !isInCloudNow) {
            this.createCloudExitEffect();
        }
        
        // Update player's cloud state
        this.player.isInCloud = isInCloudNow;
        
        // Generate a new cloud when one moves too far left
        if (this.clouds.length < 15) {
            this.generateClouds(1);
        }
        
        // Remove clouds that are no longer visible
        const cloudViewportLeft = this.camera.x - this.canvas.width;
        this.clouds = this.clouds.filter(cloud => {
            return cloud.x + cloud.width > cloudViewportLeft;
        });
    }
    
    generateObstacle() {
        const obstacleTypes = [
            { width: 60, height: 30 },
            { width: 30, height: 60 },
            { width: 40, height: 40 }
        ];
        
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        // Place obstacles across the entire height range up to maxHeight
        // Expanded vertical spawn range to utilize the full flight area
        const minY = -this.camera.maxHeight * 0.9; // Allow spawning high in the sky
        const maxY = this.camera.groundY - type.height - 50; // Keep some margin from ground
        const y = minY + Math.random() * (maxY - minY);
        
        // Spawn obstacles farther out for better visibility with camera zoom
        // Also further distance when player is boosting
        const extraDistance = this.player.isBoosting ? 500 : 0;
        const spawnDistance = this.player.x + this.canvas.width + 300 + extraDistance;
        
        this.obstacles.push({
            x: spawnDistance,
            y: y,
            width: type.width,
            height: type.height,
            passed: false,
            rotation: Math.random() * Math.PI * 2
        });
        
        this.lastObstacleX = spawnDistance;
    }
    
    generateGroundObstacle() {
        // Create a taller obstacle at ground level
        const height = 120 + Math.random() * 80; // Taller obstacle to force jumping
        const width = 40 + Math.random() * 20;   // Random width
        
        // Position at ground level
        const y = this.camera.groundY - height;
        
        // Spawn ahead of player
        const spawnDistance = this.player.x + this.canvas.width + 300;
        
        // Add a special property to identify it as a ground obstacle
        this.obstacles.push({
            x: spawnDistance,
            y: y,
            width: width,
            height: height,
            passed: false,
            rotation: 0, // No rotation for ground obstacles
            isGroundObstacle: true
        });
    }
    
    generatePowerPoint() {
        const powerUpTypes = [
            { type: 'shield', color: '#4169E1' },
            { type: 'shrink', color: '#FF1493' },
            { type: 'boost', color: '#FF6600' },  // Bright orange for boost
            { type: 'money', color: '#FFD700' },   // Gold color for money
            { type: 'energy', color: '#00FFFF' }   // Cyan color for energy refill
        ];
        
        const powerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        // Spawn power-ups across the entire height range
        const minY = -this.camera.maxHeight * 0.9; // Up to 90% of max height
        const maxY = this.camera.groundY - 50;
        const y = minY + Math.random() * (maxY - minY);
        
        // Spawn power-ups farther out with extra distance during boost
        const extraDistance = this.player.isBoosting ? 500 : 0;
        const spawnDistance = this.player.x + this.canvas.width + 300 + extraDistance;
        
        this.powerPoints.push({
            x: spawnDistance,
            y: y,
            width: 30,
            height: 30,
            type: powerUp.type,
            color: powerUp.color
        });
    }
    
    activatePowerUp(powerUp) {
        switch(powerUp.type) {
            case 'shield':
                this.player.hasShield = true;
                // Shield wears off after 5 seconds
                setTimeout(() => {
                    this.player.hasShield = false;
                }, this.powerUpDuration);
                break;
                
            case 'shrink':
                this.player.isShrunk = true;
                this.player.width = this.player.originalWidth * 0.6;
                this.player.height = this.player.originalHeight * 0.6;
                // Shrink wears off after 5 seconds
                setTimeout(() => {
                    this.player.isShrunk = false;
                    this.player.width = this.player.originalWidth;
                    this.player.height = this.player.originalHeight;
                }, this.powerUpDuration);
                break;
                
            case 'boost':
                // Activate boost mode
                this.player.isBoosting = true;
                this.player.boostSpeed = this.player.boostMaxSpeed;
                this.player.velocity = this.player.boostUpForce; // Initial upward boost
                this.player.boostTimer = Date.now();
                this.player.cometTrail = []; // Clear any existing trail
                
                // Make sure we don't lose camera tracking during boost
                this.camera.zoomSpeed = 0.05; // Increase zoom speed during boost
                
                // Boost wears off after set duration
                setTimeout(() => {
                    this.player.isBoosting = false;
                    this.player.boostSpeed = 0;
                    this.camera.zoomSpeed = 0.02; // Reset zoom speed
                }, this.player.boostDuration);
                break;
                
            case 'money':
                this.powerPointsCollected++;
                // Money now also gives 10 energy back
                this.energy.current = Math.min(this.energy.max, this.energy.current + 10);
                // Reset exhausted state if enough energy was restored
                if (this.energy.current > 30 && this.energy.isEmpty) {
                    this.energy.isEmpty = false;
                    this.player.isExhausted = false;
                }
                break;
                
            case 'energy':
                // Full energy refill
                this.energy.current = this.energy.max;
                // Reset exhausted state
                this.energy.isEmpty = false;
                this.player.isExhausted = false;
                break;
        }
    }
    
    checkCollisions() {
        for (const obstacle of this.obstacles) {
            if (this.isColliding(this.player, obstacle)) {
                if (this.player.hasShield) {
                    this.player.hasShield = false;
                    this.obstacles = this.obstacles.filter(o => o !== obstacle);
                } else {
                    this.gameOver();
                }
                return;
            }
        }
        
        this.powerPoints = this.powerPoints.filter(powerPoint => {
            if (this.isColliding(this.player, powerPoint)) {
                this.activatePowerUp(powerPoint);
                this.updateScore();
                return false;
            }
            return true;
        });
        
        this.obstacles.forEach(obstacle => {
            if (!obstacle.passed && obstacle.x < this.player.x) {
                obstacle.passed = true;
                this.score += 10;
                this.updateScore();
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    gameOver() {
        this.isGameOver = true;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalPowerPoints').textContent = this.powerPointsCollected;
        
        // Add max height and total distance to game over screen
        const maxHeightElement = document.getElementById('finalHeight');
        const totalDistanceElement = document.getElementById('finalDistance');
        
        if (maxHeightElement) {
            maxHeightElement.textContent = Math.round(this.maxHeight);
        }
        
        if (totalDistanceElement) {
            totalDistanceElement.textContent = Math.round(this.distanceTraveled);
        }
        
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('powerPoints').textContent = `Money: ${this.powerPointsCollected}`;
        
        // Format values for display (round to integers)
        const currentHeight = Math.round(this.camera.groundY - this.player.y);
        const formattedDistance = Math.round(this.distanceTraveled);
        
        // Add to DOM or update existing elements
        const heightElement = document.getElementById('height');
        const distanceElement = document.getElementById('distance');
        
        if (heightElement) {
            heightElement.textContent = `Height: ${currentHeight}`;
        }
        
        if (distanceElement) {
            distanceElement.textContent = `Distance: ${formattedDistance}`;
        }
    }
    
    generateStars(count) {
        const stars = [];
        const maxHeight = this.camera.maxHeight;
        // Much wider distribution for stars to cover the entire possible visible area
        const skyWidth = this.canvas.width * 200;
        
        for (let i = 0; i < count; i++) {
            // Position stars in the upper part of the sky (negative y)
            const starY = -Math.random() * maxHeight * 0.8 - maxHeight * 0.2;
            
            stars.push({
                x: Math.random() * skyWidth,  // Stars now span the full skyWidth
                y: starY,
                size: 0.5 + Math.random() * 2,
                brightness: 0.5 + Math.random() * 0.5
            });
        }
        
        return stars;
    }
    
    generateClouds(count) {
        for (let i = 0; i < count; i++) {
            // Random cloud size and shape
            const width = 200 + Math.random() * 400;
            const height = 100 + Math.random() * 200;
            const bubbleCount = 5 + Math.floor(Math.random() * 8);
            
            // Position within the cloud layer (3000-8000)
            const cloudY = -(3000 + Math.random() * 5000);
            
            // Spawn ahead of player with some randomness in spacing
            const minDistance = this.player.x + this.canvas.width;
            const maxDistance = this.player.x + this.canvas.width * 3;
            const cloudX = minDistance + Math.random() * (maxDistance - minDistance);
            
            // Generate a unique cloud shape using multiple "bubbles"
            const bubbles = [];
            for (let j = 0; j < bubbleCount; j++) {
                bubbles.push({
                    x: Math.random() * width * 0.8,
                    y: Math.random() * height * 0.8,
                    radius: 30 + Math.random() * 70
                });
            }
            
            this.clouds.push({
                x: cloudX,
                y: cloudY,
                width: width,
                height: height,
                bubbles: bubbles,
                opacity: 0.6 + Math.random() * 0.3 // Semi-transparent
            });
        }
    }
    
    isPlayerInCloud(player, cloud) {
        // First do a quick bounding box check
        if (player.x > cloud.x + cloud.width || 
            player.x + player.width < cloud.x || 
            player.y > cloud.y + cloud.height || 
            player.y + player.height < cloud.y) {
            return false;
        }
        
        // For better accuracy, check if player center is in any of the cloud bubbles
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        for (const bubble of cloud.bubbles) {
            const bubbleCenterX = cloud.x + bubble.x + bubble.radius;
            const bubbleCenterY = cloud.y + bubble.y + bubble.radius;
            
            const dx = playerCenterX - bubbleCenterX;
            const dy = playerCenterY - bubbleCenterY;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < bubble.radius + player.width/2) {
                return true;
            }
        }
        
        return false;
    }
    
    createCloudExitEffect() {
        const particleCount = 20 + Math.floor(Math.random() * 20);
        
        for (let i = 0; i < particleCount; i++) {
            // Calculate exit direction and speed based on player velocity
            const speed = 1 + Math.random() * 3;
            let angle = Math.random() * Math.PI * 2; // Random direction by default
            
            // Adjust angle based on player's movement
            if (Math.abs(this.player.velocity) > 0.5) {
                // Add bias in the direction of player movement
                const playerDirection = this.player.velocity > 0 ? Math.PI/2 : -Math.PI/2;
                angle = playerDirection + (Math.random() - 0.5) * Math.PI; // ±90 degrees
            }
            
            this.cloudParticles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                opacity: 0.7 + Math.random() * 0.3,
                life: 20 + Math.random() * 30
            });
        }
    }
    
    updateEnergy() {
        // Determine the player's state for energy adjustment
        const isOnGround = this.player.y + this.player.height >= this.camera.groundY;
        const isRising = this.player.velocity < 0;
        
        // Handle energy changes based on player state
        if (this.player.isHolding && !this.player.isExhausted) {
            // Drain energy when holding space to fly up
            this.energy.current -= this.energy.drainRate;
        } else if (isOnGround) {
            // Drain energy at half rate when on ground
            this.energy.current -= this.energy.groundDrainRate;
        } else if (!isRising) {
            // Regenerate energy when falling freely
            this.energy.current += this.energy.regenRate;
        }
        
        // Clamp energy between 0 and max
        this.energy.current = Math.max(0, Math.min(this.energy.current, this.energy.max));
        
        // Check if energy is depleted
        if (this.energy.current <= 0 && !this.energy.isEmpty) {
            this.energy.isEmpty = true;
            this.player.isExhausted = true;
        }
        
        // If energy is above 30%, allow flying again
        if (this.energy.current > 30 && this.energy.isEmpty) {
            this.energy.isEmpty = false;
            this.player.isExhausted = false;
        }
    }
    
    draw() {
        // Clear the canvas regardless of game state
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // If game hasn't started, just draw a simple background
        if (!this.isGameStarted && !this.isGameOver) {
            // Draw a simple gradient background for the start screen
            const startScreenGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            startScreenGradient.addColorStop(0, '#1E4F9C');  // Deeper blue at top
            startScreenGradient.addColorStop(1, '#B4D6FF');  // Light blue at bottom
            
            this.ctx.fillStyle = startScreenGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        
        // Game is running, draw all game elements
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw the world and game elements
        this.drawSky();
        this.drawClouds();
        this.drawGround();
        this.drawCloudParticles();
        this.drawCometTrail();
        this.drawPlayer();
        this.drawObstacles();
        this.drawPowerups();
        
        // Restore camera transform
        this.ctx.restore();
        
        // Draw UI elements in screen space (not affected by camera)
        this.drawEnergyBar();
    }
    
    // Split sky drawing into its own method
    drawSky() {
        // Calculate extended sky height
        const skyHeight = this.camera.maxHeight;
        
        // Calculate sky position relative to camera to ensure it always remains in view
        // Make sky extremely wide and always centered on the camera
        const skyWidth = this.canvas.width * 200; // Much wider than before
        const skyStartX = this.camera.x - skyWidth / 2;
        
        // Draw extended sky gradient with multiple color stops
        const skyGradient = this.ctx.createLinearGradient(
            skyStartX + skyWidth/2, -skyHeight, 
            skyStartX + skyWidth/2, this.camera.groundY
        );
        skyGradient.addColorStop(0, '#000000');       // Space - black at very top
        skyGradient.addColorStop(0.1, '#000033');     // Deep space - very dark blue
        skyGradient.addColorStop(0.2, '#000066');     // Night sky
        skyGradient.addColorStop(0.4, '#0A1A5C');     // Dawn/dusk deep blue
        skyGradient.addColorStop(0.6, '#1E4F9C');     // Daytime blue - deeper
        skyGradient.addColorStop(0.8, '#4A90E2');     // Daytime blue
        skyGradient.addColorStop(1, '#B4D6FF');       // Horizon light blue
        
        // Draw a much wider and taller sky to prevent black edges
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(
            skyStartX,  // Sky starts relative to camera position
            -skyHeight - this.canvas.height * 5, // Make sky extend further up
            skyWidth,   // Extremely wide sky
            skyHeight + this.camera.groundY + this.canvas.height * 10  // Very tall sky
        );
        
        // Reposition stars based on camera position to ensure they remain visible
        this.ctx.fillStyle = '#FFFFFF';
        for (const star of this.stars) {
            // Calculate star's actual position in the world
            // We'll maintain the original y position but adjust x position relative to camera
            const adjustedX = (skyStartX + (star.x + skyWidth/2) % skyWidth);
            
            this.ctx.globalAlpha = star.brightness;
            this.ctx.beginPath();
            this.ctx.arc(adjustedX, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;  // Reset alpha
    }
    
    // Split ground drawing into its own method
    drawGround() {
        // Calculate extended width for ground elements based on camera position
        // Make ground elements much wider than the viewport to ensure visibility during boost
        const groundWidth = this.canvas.width * 50; // Extremely wide ground
        const groundStartX = this.camera.x - groundWidth / 2; // Center ground on camera
        
        // Draw dirt below ground (only showing a small amount)
        this.ctx.fillStyle = '#8B4513'; // Saddle brown for dirt
        const dirtHeight = this.canvas.height / 20; // Reduced from 1/8 to 1/20 of screen height
        this.ctx.fillRect(groundStartX, this.camera.groundY, groundWidth, dirtHeight);
        
        // Draw some dirt details (rocks, etc.)
        this.ctx.fillStyle = '#6B3203'; // Darker brown for dirt details
        for (let i = 0; i < 300; i++) { // Increased rock count for wider area
            const x = groundStartX + Math.random() * groundWidth;
            const y = this.camera.groundY + Math.random() * (dirtHeight - 3);
            const rockSize = 1 + Math.random() * 3;
            this.ctx.fillRect(x, y, rockSize, rockSize);
        }
        
        // Draw grass ground as a thin strip
        this.ctx.fillStyle = '#2E8B57';
        this.ctx.fillRect(groundStartX, this.camera.groundY, groundWidth, 2);
        
        // Draw grass details - taller grass blades
        this.ctx.fillStyle = '#228B22';
        for (let i = 0; i < 800; i++) { // Increased grass count for wider area
            const x = groundStartX + Math.random() * groundWidth;
            const height = 2 + Math.random() * 6;
            this.ctx.fillRect(x, this.camera.groundY, 1, -height);
        }
    }
    
    drawClouds() {
        this.clouds.forEach(cloud => {
            // For each bubble in the cloud, draw a slightly different white circle
            cloud.bubbles.forEach(bubble => {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(
                    cloud.x + bubble.x + bubble.radius, 
                    cloud.y + bubble.y + bubble.radius, 
                    bubble.radius, 
                    0, 
                    Math.PI * 2
                );
                this.ctx.fill();
            });
            
            // Add a subtle glow around the cloud
            const gradientSize = 50;
            try {
                const gradient = this.ctx.createRadialGradient(
                    cloud.x + cloud.width/2, cloud.y + cloud.height/2, 0,
                    cloud.x + cloud.width/2, cloud.y + cloud.height/2, cloud.width/2 + gradientSize
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${cloud.opacity * 0.3})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(
                    cloud.x - gradientSize, 
                    cloud.y - gradientSize, 
                    cloud.width + gradientSize*2, 
                    cloud.height + gradientSize*2
                );
            } catch (e) {
                // Fallback if gradient creation fails
            }
        });
    }
    
    drawCloudParticles() {
        this.cloudParticles.forEach(particle => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawCometTrail() {
        if (this.player.isBoosting && this.player.cometTrail.length > 0) {
            this.player.cometTrail.forEach(particle => {
                // Skip invalid particles
                if (particle.size <= 0 || particle.opacity <= 0) return;
                
                // Ensure radius is valid for createRadialGradient
                const radius = Math.max(0.1, particle.size);
                
                try {
                    // Create a gradient for the particle with safe values
                    const gradient = this.ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, radius
                    );
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
                    gradient.addColorStop(0.5, `rgba(255, 200, 0, ${particle.opacity * 0.8})`);
                    gradient.addColorStop(1, `rgba(255, 100, 0, ${particle.opacity * 0.1})`);
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                } catch (e) {
                    // If gradient creation still fails, use a simple circle with solid color
                    this.ctx.fillStyle = `rgba(255, 165, 0, ${particle.opacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        }
    }
    
    drawPlayer() {
        // Save for rotation
        this.ctx.save();
        
        // Reset any shadow effects before drawing the player
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        
        // Apply any new shadow effects based on player state
        if (this.player.isInCloud) {
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
            this.ctx.shadowBlur = 10;
        } else if (this.player.isBoosting) {
            this.ctx.shadowColor = 'rgba(255, 165, 0, 0.7)';
            this.ctx.shadowBlur = 15;
        }
        
        // Position and rotate player
        this.ctx.translate(
            this.player.x + this.player.width/2,
            this.player.y + this.player.height/2
        );
        this.ctx.rotate(this.player.swoopAngle);
        
        // Get the current frame to draw
        const currentFrame = this.images.playerFrames[this.player.frameIndex];
        
        // Handle case if images aren't loaded yet or animation isn't working
        if (currentFrame && currentFrame.complete) {
            this.ctx.drawImage(
                currentFrame,
                -this.player.width/2,
                -this.player.height/2,
                this.player.width,
                this.player.height
            );
        } else {
            // Fallback to a colored rectangle if animation frames aren't available
            this.ctx.fillStyle = this.player.isBoosting ? '#FF9500' : '#FFD700';
            this.ctx.fillRect(
                -this.player.width/2,
                -this.player.height/2,
                this.player.width,
                this.player.height
            );
        }
        
        this.ctx.restore();
        
        // Draw shield if active
        if (this.player.hasShield) {
            this.ctx.strokeStyle = '#4169E1';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width/2,
                this.player.y + this.player.height/2,
                this.player.width/2 + 5,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
        }
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            // Choose color based on obstacle type
            if (obstacle.isGroundObstacle) {
                this.ctx.fillStyle = '#8B4513'; // Brown for ground obstacles
            } else {
                this.ctx.fillStyle = this.player.isBoosting ? '#4CAF50' : '#2E8B57';
            }
            
            this.ctx.save();
            this.ctx.translate(
                obstacle.x + obstacle.width/2,
                obstacle.y + obstacle.height/2
            );
            this.ctx.rotate(obstacle.rotation);
            
            // Add motion blur effect if boosting
            if (this.player.isBoosting) {
                this.ctx.shadowColor = 'rgba(0, 128, 0, 0.5)';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowOffsetX = -5;
            }
            
            this.ctx.fillRect(
                -obstacle.width/2,
                -obstacle.height/2,
                obstacle.width,
                obstacle.height
            );
            
            // Add a distinctive pattern to ground obstacles
            if (obstacle.isGroundObstacle) {
                this.ctx.fillStyle = '#6B3203'; // Darker brown for details
                const stripeHeight = 10;
                const stripeGap = 15;
                
                for (let i = 0; i < obstacle.height; i += stripeGap) {
                    this.ctx.fillRect(
                        -obstacle.width/2,
                        -obstacle.height/2 + i,
                        obstacle.width,
                        stripeHeight
                    );
                }
            }
            
            this.ctx.restore();
        });
    }
    
    drawPowerups() {
        this.powerPoints.forEach(powerPoint => {
            this.ctx.fillStyle = powerPoint.color;
            this.ctx.beginPath();
            
            // Add glow effect to powerups during boost
            if (this.player.isBoosting) {
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
                this.ctx.shadowBlur = 15;
            }
            
            this.ctx.arc(
                powerPoint.x + powerPoint.width/2,
                powerPoint.y + powerPoint.height/2,
                powerPoint.width/2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Choose the right emoji based on power-up type
            let emoji = '💰'; // Default to money bag
            if (powerPoint.type === 'shield') emoji = '🛡️';
            else if (powerPoint.type === 'shrink') emoji = '🔽';
            else if (powerPoint.type === 'boost') emoji = '🚀';
            else if (powerPoint.type === 'energy') emoji = '⚡';
            
            this.ctx.fillText(
                emoji,
                powerPoint.x + powerPoint.width/2,
                powerPoint.y + powerPoint.height/2
            );
        });
    }
    
    drawEnergyBar() {
        // Position the energy bar at the top center of the screen
        const barX = (this.canvas.width - this.energy.barWidth) / 2;
        const barY = 20; // 20px from the top
        
        // Draw border
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(
            barX - this.energy.barBorderWidth, 
            barY - this.energy.barBorderWidth,
            this.energy.barWidth + this.energy.barBorderWidth * 2,
            this.energy.barHeight + this.energy.barBorderWidth * 2
        );
        
        // Draw background
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(
            barX, 
            barY,
            this.energy.barWidth,
            this.energy.barHeight
        );
        
        // Calculate fill width based on current energy
        const fillWidth = (this.energy.current / this.energy.max) * this.energy.barWidth;
        
        // Choose color based on energy level
        let fillColor;
        if (this.energy.current < 20) {
            fillColor = '#FF0000'; // Red when energy is critical
        } else if (this.energy.current < 50) {
            fillColor = '#FFCC00'; // Yellow when energy is low
        } else {
            fillColor = '#00CC00'; // Green when energy is good
        }
        
        // Draw energy fill
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(
            barX + this.energy.barPadding,
            barY + this.energy.barPadding,
            fillWidth - this.energy.barPadding * 2,
            this.energy.barHeight - this.energy.barPadding * 2
        );
        
        // Format the energy values
        const currentEnergy = Math.floor(this.energy.current);
        const maxEnergy = Math.floor(this.energy.max);
        const energyText = `${currentEnergy}/${maxEnergy}`;
        
        // Draw "ENERGY" text with numerical value
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            `ENERGY ${energyText}`, 
            barX + this.energy.barWidth / 2, 
            barY + this.energy.barHeight / 2
        );
    }
}

window.onload = () => {
    new Game();
}; 