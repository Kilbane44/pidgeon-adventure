class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Remove any existing UI elements to prevent duplicates
        this.cleanupExistingUI();
        
        // Load game images
        this.images = {
            playerFrames: []  // Will hold all animation frames
        };

        // Achievement tracking variables
        this.cloudTime = 0;
        this.boostCount = 0;
        this.shieldCount = 0;
        this.moneyMultiplier = 1;
        
        // Initialize achievement system with reference to this game instance
        this.achievementSystem = new AchievementSystem(this);

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
    
    cleanupExistingUI() {
        // Remove any existing UI elements
        const elementsToRemove = ['scoreDisplay', 'dayDisplay', 'startScreen', 'gameOverScreen', 'shopScreen'];
        
        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Remove any existing event listeners
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
        }
        if (this.keyUpHandler) {
            document.removeEventListener('keyup', this.keyUpHandler);
        }
        if (this.touchStartHandler) {
            document.removeEventListener('touchstart', this.touchStartHandler);
        }
        if (this.touchEndHandler) {
            document.removeEventListener('touchend', this.touchEndHandler);
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
        
        // Position ground lower on the screen (9/10 of the screen height from the top)
        const groundPosition = this.canvas.height * 9/10;
        
        // Camera properties
        this.camera = {
            scale: 1,
            baseScale: 1,
            sightBonus: 0,      // New property for sight upgrades
            minScale: 0.5,     // Minimum scale (most zoomed out) at high altitudes
            maxScale: 1.2,     // Maximum scale (most zoomed in) at ground level
            targetScale: 1,
            zoomSpeed: 0.02,
            groundY: groundPosition,
            x: 0,
            y: 0,
            maxHeight: this.canvas.height * 10  // Allow flying much higher
        };
        
        // Add day counter
        this.currentDay = 1;
        this.totalMoney = 0;
        
        // Generate stars once at initialization - increased star count
        this.stars = this.generateStars(600);
        // Add twinkling timer for star animation
        this.starTwinkleTimer = 0;
        
        // Add cloud system - BUT DON'T GENERATE CLOUDS UNTIL GAME STARTS
        this.clouds = [];
        this.cloudParticles = [];  // For exit effect particles
        
        // Energy system
        this.energy = {
            current: 100,       // Start with full energy
            max: 100,           // Maximum energy
            drainRate: 0.05,    // Reduced from 0.0625 to match slower movement
            groundDrainRate: 0.02, // Reduced from 0.03125 for slower drain on ground
            regenRate: 0.015,   // Reduced from 0.02 for slower regeneration
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
            gravity: 0.1,            // Reduced from 0.15
            maxVelocity: 1,          // this is flight speed
            hasShield: false,
            isShrunk: false,
            originalWidth: 64,  // Adjusted for sprite size
            originalHeight: 64, // Adjusted for sprite size
            isHolding: false,
            swoopForce: -0.35,       // Reduced from -0.5
            swoopAngle: 0,
            frameIndex: 0,          // Current animation frame
            frameTimer: 0,          // Timer for frame animation
            frameDuration: 125,     // Each frame lasts 125ms (250ms for complete 2-frame cycle)
            numberOfFrames: 2,      // Total number of frames (just 2 frames)
            startY: groundPosition - 150, // Store starting Y relative to ground
            
            // Boost power-up properties - reduced speeds to prevent camera issues
            isBoosting: false,
            boostSpeed: 0,
            boostMaxSpeed: 6,       // Reduced from 8
            boostUpForce: -6,       // Reduced from -10
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
        this.gameSpeed = .5;       // Reduced from 2
        this.isGameOver = false;
        this.isGameStarted = false;
        this.lastObstacleX = 0;
        this.powerUpDuration = 5000; // 5 seconds for power-ups
        this.powerUpTimer = null;
        
        this.distanceTraveled = 0;
        this.maxHeight = 0;
        
        // Ground obstacle tracking
        this.lastGroundObstacleDistance = 0;  // Track when the last ground obstacle was spawned
        this.groundObstacleInterval = 6000;   // Increased from 4500 for fewer ground obstacles
        
        // Create UI elements first
        this.createUI();
        
        // Then set up event listeners that reference UI elements
        this.setupEventListeners();
        
        // Show start screen
        this.showStartScreen();
        
        // Start initial game loop for visuals only
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
        document.removeEventListener('touchstart', this.touchStartHandler);
        document.removeEventListener('touchend', this.touchEndHandler);
        
        // Bind the handlers to this instance
        this.keyDownHandler = this.handleKeyDown.bind(this);
        this.keyUpHandler = this.handleKeyUp.bind(this);
        this.touchStartHandler = this.handleTouchStart.bind(this);
        this.touchEndHandler = this.handleTouchEnd.bind(this);
        
        // Add keyboard event listeners
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        
        // Add touch event listeners
        document.addEventListener('touchstart', this.touchStartHandler);
        document.addEventListener('touchend', this.touchEndHandler);
        
        // Prevent default touch behaviors that might interfere with the game
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        
        // Add start button handler
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Add restart button handler
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.startNextDay();
            });
        }
        
        // Add buy energy upgrade button handler
        const buyEnergyBtn = document.getElementById('buyEnergyBtn');
        if (buyEnergyBtn) {
            // Remove existing event listeners if any
            buyEnergyBtn.replaceWith(buyEnergyBtn.cloneNode(true));
            
            // Add new event listener
            document.getElementById('buyEnergyBtn').addEventListener('click', () => {
                this.buyEnergyUpgrade();
            });
        }
        
        // Add buy sight upgrade button handler
        const buySightBtn = document.getElementById('buySightBtn');
        if (buySightBtn) {
            // Remove existing event listeners if any
            buySightBtn.replaceWith(buySightBtn.cloneNode(true));
            
            // Add new event listener
            document.getElementById('buySightBtn').addEventListener('click', () => {
                this.buySightUpgrade();
            });
        }
        
        // Add buy flight speed upgrade button handler
        const buySpeedBtn = document.getElementById('buySpeedBtn');
        if (buySpeedBtn) {
            // Remove existing event listeners if any
            buySpeedBtn.replaceWith(buySpeedBtn.cloneNode(true));
            
            // Add new event listener
            document.getElementById('buySpeedBtn').addEventListener('click', () => {
                this.buySpeedUpgrade();
            });
        }
        
        // Add buy lift power upgrade button handler
        const buyLiftBtn = document.getElementById('buyLiftBtn');
        if (buyLiftBtn) {
            // Remove existing event listeners if any
            buyLiftBtn.replaceWith(buyLiftBtn.cloneNode(true));
            
            // Add new event listener
            document.getElementById('buyLiftBtn').addEventListener('click', () => {
                this.buyLiftUpgrade();
            });
        }
    }
    
    handleKeyDown(event) {
        if (event.code === 'Space') {
            event.preventDefault(); // Prevent page scrolling with space
            if (!this.isGameStarted) {
                this.startGame();
            } else if (!this.isGameOver) {
                this.player.isHolding = true;
            }
        }
        
        // Cheat code - press '1' to get 10,000 money
        if (event.code === 'Digit1' || event.code === 'Numpad1') {
            this.activateMoneyCheat();
        }
    }
    
    handleKeyUp(event) {
        if (event.code === 'Space') {
            event.preventDefault(); // Prevent page scrolling with space
            if (!this.isGameOver) {
                this.player.isHolding = false;
            }
        }
    }
    
    handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling
        if (!this.isGameStarted) {
            this.startGame();
        } else if (!this.isGameOver) {
            this.player.isHolding = true;
        }
    }
    
    handleTouchEnd(event) {
        event.preventDefault(); // Prevent scrolling
        if (!this.isGameOver) {
            this.player.isHolding = false;
        }
    }
    
    showStartScreen() {
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        // Update start screen text to show both control methods
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.innerHTML = `
                <h1>Pidgeon Adventure</h1>
                <p>Press SPACE or TAP to start flying</p>
                <p>Hold SPACE or TOUCH to flap wings</p>
            `;
        }
    }
    
    startGame() {
        if (!this.isGameStarted) {
            this.isGameStarted = true;
            this.isGameOver = false;
            this.score = 0;
            this.powerPointsCollected = 0;
            this.distanceTraveled = 0;
            this.maxHeight = 0;
            this.gameSpeed = .5;
            this.energy.current = this.energy.max;
            this.energy.isEmpty = false;
            this.player.isExhausted = false;
            this.player.isHolding = false;
            this.player.velocity = 0;
            this.player.y = this.player.startY;
            this.camera.x = 0;
            this.camera.y = 0;
            this.camera.scale = 1;
            this.camera.targetScale = 1;
            this.camera.baseScale = 1;
            this.obstacles = [];
            this.powerPoints = [];
            this.clouds = [];
            this.cloudParticles = [];
            this.generateClouds(15);
            this.lastObstacleX = 0;
            this.lastGroundObstacleDistance = 0;
            
            // Hide start screen
            const startScreen = document.getElementById('startScreen');
            if (startScreen) {
                startScreen.classList.add('hidden');
            }
            
            // Show score display
            const scoreDisplay = document.getElementById('scoreDisplay');
            if (scoreDisplay) {
                scoreDisplay.classList.remove('hidden');
            }
            
            // Update score display
            this.updateScore();
            
            // Increase ground obstacle interval for fewer ground obstacles
            this.groundObstacleInterval = 6000; // Increased from 4500
        }
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
        this.gameSpeed = .5;
        this.isGameOver = false;
        this.isGameStarted = true;
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.updateScore();
        this.camera.groundY = this.canvas.height * 9/10;
        this.camera.x = 0;
        this.camera.y = 0;
        this.distanceTraveled = 0;
        this.maxHeight = 0;
        
        // Reset energy as well
        this.energy.current = this.energy.max;
        this.energy.isEmpty = false;
        this.player.isExhausted = false;
        
        // Reset ground obstacle tracking
        this.lastGroundObstacleDistance = 0;
    }
    
    gameLoop() {
        // Always update and draw, but only update game logic if game is active
        if (this.isGameStarted && !this.isGameOver) {
            this.update();
        }
        
        this.draw();
        
        // Continue the loop even if game over or not started (to show start/shop screens)
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
        // Apply the baseScale as a multiplier to allow power-ups to affect zoom
        // Apply sight bonus to reduce the scale (zoom out more)
        const sightMultiplier = 1 - this.camera.sightBonus;
        this.camera.targetScale = (this.camera.maxScale - normalizedDistance * (this.camera.maxScale - this.camera.minScale)) * this.camera.baseScale * sightMultiplier;
        
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
        
        // Update achievement tracking
        if (this.player.isInCloud) {
            this.cloudTime += 1/60; // Assuming 60 FPS
        }
        
        // Update achievement system
        this.achievementSystem.checkAchievements({
            currentDay: this.currentDay,
            maxHeight: this.maxHeight,
            powerPointsCollected: this.powerPointsCollected,
            cloudTime: this.cloudTime,
            boostCount: this.boostCount,
            shieldCount: this.shieldCount,
            distanceTraveled: this.distanceTraveled,
            totalMoney: this.totalMoney
        });
        
        // Update star twinkling - reduced speed
        this.starTwinkleTimer += 0.01; // Reduced from 0.02 for slower twinkling
        
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
        
        // Get player's current height
        const playerHeight = this.camera.groundY - this.player.y;
        
        // Calculate the visible width based on current camera zoom
        const visibleWidth = this.canvas.width / this.camera.scale;
        
        // Generate obstacles less frequently by increasing the distance threshold
        // Check if we need more obstacles ahead of the player
        const lastObstacleDistance = this.player.x + visibleWidth - this.lastObstacleX;
        if (this.obstacles.length === 0 || lastObstacleDistance > 1200) { // Increased from 800 to 1200
            
            // Generate standard obstacles
            this.generateObstacle();
            
            // Generate additional obstacles when boosting - reduced chance even further
            if (this.player.isBoosting && Math.random() < 0.1) { // Reduced from 0.2 to 0.1
                setTimeout(() => this.generateObstacle(), 100);
            }
            
            // Check for high altitude to generate airplanes (between 10,000 and 30,000) - reduced chance
            if (playerHeight > 10000 && Math.random() < 0.1) { // Reduced from 0.15 to 0.1
                this.generateAirplane();
            }
        }
        
        // Check if it's time to spawn a ground obstacle - increase interval even more
        if (this.distanceTraveled - this.lastGroundObstacleDistance >= this.groundObstacleInterval) {
            this.generateGroundObstacle();
            this.lastGroundObstacleDistance = this.distanceTraveled;
        }
        
        // Generate power points more frequently, with emphasis on money
        // Increased chance to ensure more power-ups appear
        const powerupChance = this.player.isBoosting ? 0.07 : 0.04; // Increased from 0.05/0.03
        if (Math.random() < powerupChance) {
            this.generatePowerPoint();
            
            // Extra chance for money powerups
            if (Math.random() < 0.2) { // Kept at 0.2
                setTimeout(() => this.generateMoneyPowerup(), 50);
            }
        }
        
        // Keep filtering objects only when they're actually off-screen
        // Calculate viewport bounds based on camera position and canvas size
        // Adjust viewport calculations to account for camera scale
        const viewportLeft = this.camera.x - (this.canvas.width / 2) / this.camera.scale;
        const viewportRight = this.camera.x + (this.canvas.width * 1.5) / this.camera.scale;
        const viewportTop = this.camera.y - (this.canvas.height / 2) / this.camera.scale;
        const viewportBottom = this.camera.y + (this.canvas.height * 1.5) / this.camera.scale;
        
        // Filter obstacles only when they're well outside the viewport
        this.obstacles = this.obstacles.filter(obstacle => {
            // Apply appropriate speed based on obstacle type
            if (obstacle.isAirplane) {
                obstacle.x -= this.gameSpeed * 2; // Airplanes move faster
            } else {
                obstacle.x -= this.gameSpeed;
            }
            // Only keep obstacles that are close to the visible area or haven't been passed yet
            return (obstacle.x + obstacle.width > viewportLeft - 500 && 
                   obstacle.x < viewportRight + 500 &&
                   obstacle.y + obstacle.height > viewportTop - 500 &&
                   obstacle.y < viewportBottom + 500) || !obstacle.passed;
        });
        
        // Filter power points only when they're well outside the viewport
        this.powerPoints = this.powerPoints.filter(powerPoint => {
            powerPoint.x -= this.gameSpeed;
            // Use the same adjusted viewport bounds for powerpoints
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
        
        // Track previous distance for money earning calculation
        const previousDistance = this.distanceTraveled;
        
        // Update distance traveled
        this.distanceTraveled += this.gameSpeed;
        
        // Award money for every 1000 distance traveled
        const previousThousand = Math.floor(previousDistance / 1000);
        const currentThousand = Math.floor(this.distanceTraveled / 1000);
        
        if (currentThousand > previousThousand) {
            // Player has crossed another 1000 distance mark, award 1 money
            this.powerPointsCollected += 1;
            this.updateScore();
        }
        
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
        
        // Remove clouds that are no longer visible - use the already defined viewportLeft
        this.clouds = this.clouds.filter(cloud => {
            return cloud.x + cloud.width > viewportLeft - 300; // Add some margin for clouds
        });
    }
    
    generateObstacle() {
        // Only generate obstacles with a 30% chance to significantly reduce their frequency
        if (Math.random() > 0.7) {
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
            
            // Spawn obstacles at a fixed screen-based distance, independent of camera zoom
            const spawnDistance = this.player.x + (this.canvas.width * 1.2); // 120% of screen width ahead
            
            this.obstacles.push({
                x: spawnDistance,
                y: y,
                width: type.width,
                height: type.height,
                passed: false,
                rotation: Math.random() * Math.PI * 2
            });
            
            this.lastObstacleX = spawnDistance;
        } else {
            // If we skip obstacle generation, still update lastObstacleX to prevent clustering
            this.lastObstacleX = this.player.x + (this.canvas.width * 1.2);
        }
    }
    
    generateGroundObstacle() {
        // Create a taller obstacle at ground level
        const height = 120 + Math.random() * 80*this.camera.maxScale; // Taller obstacle to force jumping
        const width = 40 + Math.random() * 20*this.camera.maxScale;   // Random width
        
        // Position at ground level
        const y = this.camera.groundY - height;
        
        // Calculate the actual viewport width based on camera zoom
        const visibleWidth = this.canvas.width / this.camera.minScale; // Width visible at maximum zoom out
        
        // Spawn ahead of player, further out to account for zoom
        const spawnDistance = this.player.x + visibleWidth + 300;
        
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
            { type: 'shield', color: '#4169E1', weight: 15 },
            { type: 'shrink', color: '#FF1493', weight: 15 },
            { type: 'boost', color: '#FF6600', weight: 15 },  // Bright orange for boost
            { type: 'money', color: '#FFD700', weight: 40 },   // Gold color for money - increased weight
            { type: 'energy', color: '#00FFFF', weight: 15 }   // Cyan color for energy refill
        ];
        
        // Calculate total weight
        const totalWeight = powerUpTypes.reduce((sum, type) => sum + type.weight, 0);
        
        // Generate a random number between 0 and total weight
        const randomValue = Math.random() * totalWeight;
        
        // Find the selected power-up type based on weight
        let currentWeight = 0;
        let selectedPowerUp = powerUpTypes[0];
        
        for (const powerUp of powerUpTypes) {
            currentWeight += powerUp.weight;
            if (randomValue <= currentWeight) {
                selectedPowerUp = powerUp;
                break;
            }
        }
        
        // Spawn power-ups across the entire height range
        const minY = -this.camera.maxHeight * 0.9; // Up to 90% of max height
        const maxY = this.camera.groundY - 50;
        const y = minY + Math.random() * (maxY - minY);
        
        // Spawn power-ups at a fixed screen-based distance
        // This ensures they spawn on screen regardless of camera zoom
        const spawnDistance = this.player.x + (this.canvas.width * 0.8); // 80% of screen width ahead
        
        this.powerPoints.push({
            x: spawnDistance,
            y: y,
            width: 30,
            height: 30,
            type: selectedPowerUp.type,
            color: selectedPowerUp.color
        });
    }
    
    // Method to specifically generate money powerups
    generateMoneyPowerup() {
        // Spawn money powerups across the entire height range
        const minY = -this.camera.maxHeight * 0.9;
        const maxY = this.camera.groundY - 50;
        const y = minY + Math.random() * (maxY - minY);
        
        // Use fixed screen-based distance to spawn powerups
        const spawnDistance = this.player.x + (this.canvas.width * 0.8); // 80% of screen width ahead
        
        this.powerPoints.push({
            x: spawnDistance,
            y: y,
            width: 30,
            height: 30,
            type: 'money',
            color: '#FFD700'
        });
    }
    
    // Method to generate airplane obstacles at high altitudes
    generateAirplane() {
        // Airplanes only appear at high altitudes between 10,000 and 30,000
        const minAltitude = 10000;
        const maxAltitude = 30000;
        
        // Calculate airplane position (y) based on altitude
        const y = this.camera.groundY - minAltitude - Math.random() * (maxAltitude - minAltitude);
        
        // Generate the airplane with a longer width than standard obstacles
        const width = 120 + Math.random() * 60; // Longer obstacle
        const height = 30 + Math.random() * 20;  // Not too tall
        
        // Use fixed distance for consistent spawning
        const spawnDistance = this.player.x + this.canvas.width + 400;
        
        // Create the airplane obstacle
        this.obstacles.push({
            x: spawnDistance,
            y: y,
            width: width,
            height: height,
            passed: false,
            rotation: 0, // No rotation for airplanes
            isAirplane: true, // Mark as an airplane
            color: '#A9A9A9' // Gray color for airplanes
        });
    }
    
    activatePowerUp(powerUp) {
        switch(powerUp.type) {
            case 'shield':
                this.player.hasShield = true;
                this.shieldCount++;
                // Shield wears off after 5 seconds
                setTimeout(() => {
                    this.player.hasShield = false;
                }, this.powerUpDuration);
                break;
                
            case 'shrink':
                // Instead of shrinking the player, zoom out the camera
                this.camera.baseScale = this.camera.baseScale * 0.7; // Zoom out by 30%
                
                // Reset the camera scale after power-up duration
                setTimeout(() => {
                    this.camera.baseScale = 1; // Reset to normal scale
                }, this.powerUpDuration);
                break;
                
            case 'boost':
                // Activate boost mode
                this.player.isBoosting = true;
                this.player.boostSpeed = this.player.boostMaxSpeed;
                this.player.velocity = this.player.boostUpForce; // Initial upward boost
                this.player.boostTimer = Date.now();
                this.player.cometTrail = []; // Clear any existing trail
                this.boostCount++;
                
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
                // Increase money by 10 instead of 1, apply multiplier
                this.powerPointsCollected += Math.floor(10 * this.moneyMultiplier);
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
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        
        // Update total money
        this.totalMoney += this.powerPointsCollected;
        
        // Update shop screen stats
        document.getElementById('dayComplete').textContent = this.currentDay;
        document.getElementById('moneyCollected').textContent = this.powerPointsCollected;
        document.getElementById('totalMoney').textContent = this.totalMoney;
        document.getElementById('currentMaxEnergy').textContent = this.energy.max;
        document.getElementById('currentSightBonus').textContent = `${Math.round(this.camera.sightBonus * 100)}%`;
        document.getElementById('currentFlightSpeed').textContent = this.gameSpeed.toFixed(1);
        document.getElementById('currentLiftPower').textContent = this.player.maxVelocity.toFixed(1);
        document.getElementById('restartButton').textContent = `Sleep and Start Day ${this.currentDay + 1}`;
        
        // Enable/disable buy buttons based on money
        this.updateShopButtonStates();
        
        // Show game over screen which now functions as shop
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    startNextDay() {
        // Increment day counter
        this.currentDay++;
        
        // Reset achievement tracking variables
        this.cloudTime = 0;
        this.boostCount = 0;
        this.shieldCount = 0;
        
        // Reset game (similar to resetGame but keep total money)
        this.player.y = this.player.startY;
        this.player.velocity = 0;
        this.player.hasShield = false;
        this.player.width = this.player.originalWidth;
        this.player.height = this.player.originalHeight;
        this.player.isHolding = false;
        this.player.swoopAngle = 0;
        this.camera.scale = 1;
        this.camera.targetScale = 1;
        this.camera.baseScale = 1;
        // We don't reset camera.sightBonus as it's a permanent upgrade
        this.obstacles = [];
        this.powerPoints = [];
        this.clouds = [];
        this.cloudParticles = [];
        this.generateClouds(15);
        this.score = 0;
        this.powerPointsCollected = 0;
        this.gameSpeed = 0.5; // Reset to initial speed
        this.isGameOver = false;
        this.isGameStarted = true;
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.updateScore();
        this.camera.x = 0;
        this.camera.y = 0;
        this.distanceTraveled = 0;
        this.maxHeight = 0;
        
        // Reset energy to the current max value (which may have been upgraded)
        this.energy.current = this.energy.max;
        this.energy.isEmpty = false;
        this.player.isExhausted = false;
        
        // Update day display
        const dayElement = document.getElementById('dayDisplay');
        if (dayElement) {
            dayElement.innerHTML = `<span>Day: ${this.currentDay}</span>`;
        }
        
        // Increase ground obstacle interval for fewer ground obstacles
        this.groundObstacleInterval = 2000; // Increased from 4500
    }
    
    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${this.score}`;
        }
        
        const powerPointsElement = document.getElementById('powerPoints');
        if (powerPointsElement) {
            powerPointsElement.textContent = `Money: ${this.powerPointsCollected}`;
        }
        
        const heightElement = document.getElementById('height');
        if (heightElement) {
            const currentHeight = Math.floor(this.camera.groundY - this.player.y);
            heightElement.textContent = `Height: ${currentHeight}`;
        }
        
        const distanceElement = document.getElementById('distance');
        if (distanceElement) {
            distanceElement.textContent = `Distance: ${Math.floor(this.distanceTraveled)}`;
        }
        
        // Add speed display
        const speedElement = document.getElementById('speed');
        if (speedElement) {
            // Display speed rounded to 1 decimal place
            speedElement.textContent = `Speed: ${this.gameSpeed.toFixed(1)}`;
        } else if (document.getElementById('scoreDisplay')) {
            // Create speed element if it doesn't exist but scoreDisplay does
            const speedSpan = document.createElement('span');
            speedSpan.id = 'speed';
            speedSpan.textContent = `Speed: ${this.gameSpeed.toFixed(1)}`;
            document.getElementById('scoreDisplay').appendChild(speedSpan);
        }
        
        // Update day display separately
        const dayElement = document.getElementById('dayDisplay');
        if (dayElement) {
            dayElement.innerHTML = `<span>Day: ${this.currentDay}</span>`;
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
                size: 2 + Math.random() * 4,  // Increased star size even more
                brightness: 0.8 + Math.random() * 0.2,  // Higher minimum brightness
                twinkleSpeed: 0.2 + Math.random() * 0.8, // Slower twinkle speed
                twinklePhase: Math.random() * Math.PI * 2 // Random starting phase for twinkling
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
            
            // Calculate the actual viewport width based on camera zoom
            const visibleWidth = this.canvas.width / this.camera.minScale; // Width visible at maximum zoom out
            
            // Spawn ahead of player with some randomness in spacing, accounting for zoom
            const minDistance = this.player.x + visibleWidth;
            const maxDistance = this.player.x + visibleWidth * 3;
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
        
        // End the run if the player is on the ground with 0 energy
        if (isOnGround && this.energy.current <= 0 && !this.isGameOver) {
            this.gameOver();
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
        
        // Get player's current height
        const playerHeight = this.camera.groundY - this.player.y;
        
        // Add glow effect for stars
        this.ctx.shadowColor = 'white';
        this.ctx.shadowBlur = 3;
        
        // Reposition stars based on camera position to ensure they remain visible
        this.ctx.fillStyle = '#FFFFFF';
        
        // Draw the base set of stars with twinkling effect - use a larger minimum size
        for (const star of this.stars) {
            // Calculate star's actual position in the world
            // We'll maintain the original y position but adjust x position relative to camera
            const adjustedX = (skyStartX + (star.x + skyWidth/2) % skyWidth);
            
            // Apply twinkling effect by modulating brightness based on time and star's twinkle speed and phase
            // Reduced twinkle intensity from 0.3 to 0.15 (less variation)
            const twinkleFactor = 0.85 + 0.15 * Math.sin(this.starTwinkleTimer * star.twinkleSpeed + star.twinklePhase);
            
            // Apply glow effect for larger stars
            if (star.size > 2) {
                this.ctx.shadowBlur = star.size * 1.5;
            } else {
                this.ctx.shadowBlur = 4;
            }
            
            this.ctx.globalAlpha = star.brightness * twinkleFactor;
            this.ctx.beginPath();
            this.ctx.arc(adjustedX, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Add more stars based on player height - generate more stars at each height
        if (playerHeight > 5000) {
            // Start adding extra stars above 5000 height
            const heightFactor = Math.min((playerHeight - 5000) / 25000, 1); // Maxes out at 30,000 height
            const extraStarCount = Math.floor(heightFactor * 1200); // Up to 1200 extra stars (increased from 700)
            
            // Generate temporary stars based on current position and height
            for (let i = 0; i < extraStarCount; i++) {
                // More stars appear higher up (negative y values)
                const starY = -Math.random() * skyHeight * 0.9 - skyHeight * 0.1;
                
                // Stars get brighter the higher you go
                const heightBrightness = 0.5 + (heightFactor * 0.5);
                const starBrightness = 0.6 + Math.random() * heightBrightness; // Increased minimum brightness
                
                // Stars get bigger the higher you go - increased size even more
                const sizeFactor = 1.5 + heightFactor * 2;
                const starSize = 2 + Math.random() * 4 * sizeFactor;
                
                const starX = (skyStartX + Math.random() * skyWidth);
                
                // Apply twinkling effect to extra stars too - reduced intensity
                const twinkleSpeed = 0.2 + Math.random() * 0.8;
                const twinklePhase = Math.random() * Math.PI * 2;
                const twinkleFactor = 0.85 + 0.15 * Math.sin(this.starTwinkleTimer * twinkleSpeed + twinklePhase);
                
                // Apply glow effect for larger stars
                if (starSize > 2) {
                    this.ctx.shadowBlur = starSize * 2;
                } else {
                    this.ctx.shadowBlur = 4;
                }
                
                this.ctx.globalAlpha = starBrightness * twinkleFactor;
                this.ctx.beginPath();
                this.ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Add MASSIVE number of stars between 10k and 20k feet
            if (playerHeight > 10000 && playerHeight < 20000) {
                // Calculate how deep into the 10k-20k range the player is (0 to 1)
                let midRangeFactor;
                
                if (playerHeight < 15000) {
                    // First half: 0 to 1 as player goes from 10k to 15k
                    midRangeFactor = (playerHeight - 10000) / 5000;
                } else {
                    // Second half: 1 down to 0 as player goes from 15k to 20k
                    midRangeFactor = (20000 - playerHeight) / 5000;
                }
                
                // Maximum star density at 15k feet (midRangeFactor = 1)
                const massiveStarCount = Math.floor(midRangeFactor * 2000); // Up to 2000 additional stars at 15k height
                
                // Generate massive number of stars
                for (let i = 0; i < massiveStarCount; i++) {
                    // Focus these stars in the 10k-20k altitude band
                    const baseAltitude = this.camera.groundY - 15000; // Center at 15k feet
                    const altitudeSpread = 5000; // Spread across ±5k feet
                    const starY = baseAltitude + (Math.random() * 2 - 1) * altitudeSpread;
                    
                    // These stars should be small but bright - increased size
                    const starSize = 1.5 + Math.random() * 3;
                    const starBrightness = 0.8 + Math.random() * 0.2;
                    
                    const starX = (skyStartX + Math.random() * skyWidth);
                    
                    // Apply more subtle twinkling effect
                    const twinkleSpeed = 0.2 + Math.random() * 0.8;
                    const twinklePhase = Math.random() * Math.PI * 2;
                    const twinkleFactor = 0.85 + 0.15 * Math.sin(this.starTwinkleTimer * twinkleSpeed + twinklePhase);
                    
                    // Larger glow for better visibility
                    this.ctx.shadowBlur = 4;
                    
                    this.ctx.globalAlpha = starBrightness * twinkleFactor;
                    this.ctx.beginPath();
                    this.ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            // Add colored stars at very high altitudes (above 15,000)
            if (playerHeight > 15000) {
                const coloredStarFactor = Math.min((playerHeight - 15000) / 15000, 1);
                const coloredStarCount = Math.floor(coloredStarFactor * 300); // Up to 300 colored stars (increased from 200)
                
                // Array of star colors - reds, blues, yellows
                const starColors = [
                    '#FF5555', // Red
                    '#5555FF', // Blue
                    '#FFFF55', // Yellow
                    '#FF55FF', // Purple
                    '#55FFFF', // Cyan
                    '#FF9955'  // Orange
                ];
                
                for (let i = 0; i < coloredStarCount; i++) {
                    // Colored stars appear very high up
                    const starY = -skyHeight * 0.5 - Math.random() * skyHeight * 0.5;
                    
                    // Colored stars are larger and brighter - increased size even more
                    const starSize = 3 + Math.random() * 5 * (1 + coloredStarFactor);
                    const starBrightness = 0.9 + Math.random() * 0.1;
                    
                    const starX = (skyStartX + Math.random() * skyWidth);
                    
                    // Apply more subtle twinkling effect to colored stars
                    const twinkleSpeed = 0.2 + Math.random() * 0.8;
                    const twinklePhase = Math.random() * Math.PI * 2;
                    const twinkleFactor = 0.9 + 0.1 * Math.sin(this.starTwinkleTimer * twinkleSpeed + twinklePhase);
                    
                    // Pick a random color
                    const starColor = starColors[Math.floor(Math.random() * starColors.length)];
                    this.ctx.fillStyle = starColor;
                    
                    // Match shadow color to star color for glow effect
                    this.ctx.shadowColor = starColor;
                    this.ctx.shadowBlur = starSize * 3;
                    
                    this.ctx.globalAlpha = starBrightness * twinkleFactor;
                    this.ctx.beginPath();
                    this.ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Reset drawing state
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.globalAlpha = 1;
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
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
            } else if (obstacle.isAirplane) {
                this.ctx.fillStyle = obstacle.color || '#A9A9A9'; // Gray for airplanes
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
            
            // Draw the obstacle
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
            
            // Add distinctive details to airplanes
            if (obstacle.isAirplane) {
                // Draw windows
                this.ctx.fillStyle = '#87CEEB'; // Sky blue for windows
                const windowSize = 5;
                const windowGap = 15;
                
                for (let i = -obstacle.width/3; i < obstacle.width/2 - windowSize; i += windowGap) {
                    this.ctx.fillRect(
                        i,
                        -obstacle.height/4,
                        windowSize,
                        windowSize
                    );
                }
                
                // Draw wings
                this.ctx.fillStyle = '#696969'; // Darker gray for wings
                this.ctx.fillRect(
                    -obstacle.width/4,
                    -obstacle.height/2 - obstacle.height * 0.6,
                    obstacle.width/2,
                    obstacle.height * 0.6
                );
                
                // Draw tail wing
                this.ctx.fillRect(
                    obstacle.width/2 - obstacle.width/5,
                    -obstacle.height/2 - obstacle.height * 0.3,
                    obstacle.width/5,
                    obstacle.height * 0.5
                );
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
        if (this.energy.current < this.energy.max * 0.2) {
            fillColor = '#FF0000'; // Red when energy is critical (less than 20%)
        } else if (this.energy.current < this.energy.max * 0.5) {
            fillColor = '#FFCC00'; // Yellow when energy is low (less than 50%)
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
    
    createUI() {
        // Create a separate day display for the top right
        if (!document.getElementById('dayDisplay')) {
            const dayDiv = document.createElement('div');
            dayDiv.id = 'dayDisplay';
            dayDiv.innerHTML = `<span>Day: ${this.currentDay}</span>`;
            document.body.appendChild(dayDiv);
        }
        
        // Check if start screen already exists
        if (!document.getElementById('startScreen')) {
            // Create start screen
            const startScreen = document.createElement('div');
            startScreen.id = 'startScreen';
            startScreen.className = 'screen';
            startScreen.innerHTML = '<h1>Pidgeon Adventure</h1><p>Press SPACE to start flying</p><p>Hold SPACE to flap wings</p>';
            document.body.appendChild(startScreen);
        }
        
        // Check if game over screen already exists
        if (!document.getElementById('gameOverScreen')) {
            // Create game over screen (now used for shop)
            const gameOverScreen = document.createElement('div');
            gameOverScreen.id = 'gameOverScreen';
            gameOverScreen.className = 'screen hidden';
            gameOverScreen.innerHTML = `
                <h1>Day <span id="dayComplete">${this.currentDay}</span> Complete</h1>
                <div id="shopStats">
                    <p>Money Collected: <span id="moneyCollected">0</span></p>
                    <p>Total Money: <span id="totalMoney">0</span></p>
                    <p>Current Max Energy: <span id="currentMaxEnergy">${this.energy.max}</span></p>
                    <p>Current Sight Bonus: <span id="currentSightBonus">${Math.round(this.camera.sightBonus * 100)}%</span></p>
                    <p>Flight Speed: <span id="currentFlightSpeed">${this.gameSpeed.toFixed(1)}</span></p>
                    <p>Lift Power: <span id="currentLiftPower">${this.player.maxVelocity.toFixed(1)}</span></p>
                </div>
                
                <div id="shopUpgrades">
                    <div class="upgrade-item">
                        <h3>Increase Max Energy</h3>
                        <p>+10 Max Energy</p>
                        <p class="cost">Cost: 20 Money</p>
                        <button id="buyEnergyBtn">Buy Upgrade</button>
                    </div>
                    
                    <div class="upgrade-item">
                        <h3>Improve Sight</h3>
                        <p>See 5% further</p>
                        <p class="cost">Cost: 30 Money</p>
                        <button id="buySightBtn">Buy Upgrade</button>
                    </div>
                    
                    <div class="upgrade-item">
                        <h3>Increase Flight Speed</h3>
                        <p>+0.1 Game Speed</p>
                        <p class="cost">Cost: 25 Money</p>
                        <button id="buySpeedBtn">Buy Upgrade</button>
                    </div>
                    
                    <div class="upgrade-item">
                        <h3>Improve Lift Power</h3>
                        <p>+0.2 Max Velocity</p>
                        <p class="cost">Cost: 25 Money</p>
                        <button id="buyLiftBtn">Buy Upgrade</button>
                    </div>
                </div>
                
                <button id="restartButton">Sleep and Start Day ${this.currentDay + 1}</button>
            `;
            document.body.appendChild(gameOverScreen);
        }
        
        // Only add style if it doesn't exist
        if (!document.getElementById('game-styles')) {
            // Add some basic styling
            const style = document.createElement('style');
            style.id = 'game-styles';
            style.textContent = `
                #scoreDisplay {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    font-family: Arial, sans-serif;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                #dayDisplay {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    font-family: Arial, sans-serif;
                    z-index: 10;
                    font-size: 18px;
                    font-weight: bold;
                }
                .screen {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    font-family: Arial, sans-serif;
                    z-index: 100;
                }
                .hidden {
                    display: none;
                }
                #restartButton {
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
                #restartButton:hover {
                    background: #3457b2;
                    transform: scale(1.05);
                }
                #shopStats {
                    background: rgba(0, 0, 0, 0.5);
                    padding: 15px 30px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: center;
                }
                #shopStats p {
                    margin: 10px 0;
                    font-size: 18px;
                }
                #shopUpgrades {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 20px;
                    margin: 20px 0;
                }
                .upgrade-item {
                    background: rgba(30, 30, 30, 0.8);
                    border: 2px solid #4169E1;
                    border-radius: 8px;
                    padding: 15px;
                    width: 250px;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .upgrade-item h3 {
                    margin-top: 0;
                    color: #B4D6FF;
                }
                .cost {
                    font-weight: bold;
                    color: gold;
                }
                #buyEnergyBtn, #buySightBtn, #buySpeedBtn, #buyLiftBtn {
                    background-color: #4CAF50;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                #buyEnergyBtn:hover, #buySightBtn:hover, #buySpeedBtn:hover, #buyLiftBtn:hover {
                    background-color: #45a049;
                    transform: scale(1.05);
                }
                #buyEnergyBtn:disabled, #buySightBtn:disabled, #buySpeedBtn:disabled, #buyLiftBtn:disabled {
                    background-color: #777;
                    cursor: not-allowed;
                    transform: none;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    buyEnergyUpgrade() {
        const ENERGY_UPGRADE_COST = 20;
        
        // Check if player has enough money
        if (this.totalMoney >= ENERGY_UPGRADE_COST) {
            // Deduct money and increase max energy
            this.totalMoney -= ENERGY_UPGRADE_COST;
            this.energy.max += 10;
            
            // Update shop screen stats
            document.getElementById('totalMoney').textContent = this.totalMoney;
            document.getElementById('currentMaxEnergy').textContent = this.energy.max;
            
            // Enable/disable buttons based on new money balance
            this.updateShopButtonStates();
        }
    }
    
    buySightUpgrade() {
        const SIGHT_UPGRADE_COST = 30;
        const SIGHT_UPGRADE_AMOUNT = 0.05; // 5% increase in sight distance
        
        // Check if player has enough money
        if (this.totalMoney >= SIGHT_UPGRADE_COST) {
            // Deduct money and increase sight bonus
            this.totalMoney -= SIGHT_UPGRADE_COST;
            this.camera.sightBonus += SIGHT_UPGRADE_AMOUNT;
            
            // Update shop screen stats
            document.getElementById('totalMoney').textContent = this.totalMoney;
            document.getElementById('currentSightBonus').textContent = `${Math.round(this.camera.sightBonus * 100)}%`;
            
            // Enable/disable buttons based on new money balance
            this.updateShopButtonStates();
        }
    }
    
    buySpeedUpgrade() {
        const SPEED_UPGRADE_COST = 25;
        const SPEED_UPGRADE_AMOUNT = 0.1;
        
        // Check if player has enough money
        if (this.totalMoney >= SPEED_UPGRADE_COST) {
            // Deduct money and increase game speed
            this.totalMoney -= SPEED_UPGRADE_COST;
            this.gameSpeed += SPEED_UPGRADE_AMOUNT;
            
            // Update shop screen stats
            document.getElementById('totalMoney').textContent = this.totalMoney;
            document.getElementById('currentFlightSpeed').textContent = this.gameSpeed.toFixed(1);
            
            // Enable/disable buy button based on new money balance
            this.updateShopButtonStates();
        }
    }
    
    buyLiftUpgrade() {
        const LIFT_UPGRADE_COST = 25;
        const LIFT_UPGRADE_AMOUNT = 0.2;
        
        // Check if player has enough money
        if (this.totalMoney >= LIFT_UPGRADE_COST) {
            // Deduct money and increase max velocity
            this.totalMoney -= LIFT_UPGRADE_COST;
            this.player.maxVelocity += LIFT_UPGRADE_AMOUNT;
            
            // Update shop screen stats
            document.getElementById('totalMoney').textContent = this.totalMoney;
            document.getElementById('currentLiftPower').textContent = this.player.maxVelocity.toFixed(1);
            
            // Enable/disable buy button based on new money balance
            this.updateShopButtonStates();
        }
    }
    
    // Helper method to update all shop button states
    updateShopButtonStates() {
        const energyBtn = document.getElementById('buyEnergyBtn');
        const sightBtn = document.getElementById('buySightBtn');
        const speedBtn = document.getElementById('buySpeedBtn');
        const liftBtn = document.getElementById('buyLiftBtn');
        
        if (energyBtn) energyBtn.disabled = this.totalMoney < 20;
        if (sightBtn) sightBtn.disabled = this.totalMoney < 30;
        if (speedBtn) speedBtn.disabled = this.totalMoney < 25;
        if (liftBtn) liftBtn.disabled = this.totalMoney < 25;
    }
    
    // Cheat code function
    activateMoneyCheat() {
        // Add 10,000 money
        this.powerPointsCollected += 10000;
        
        // Update the score display
        this.updateScore();
        
        // Show a brief notification
        this.showCheatNotification("CHEAT ACTIVATED: +10,000 Money!");
    }
    
    // Helper function to show cheat notification
    showCheatNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('cheatNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cheatNotification';
            document.body.appendChild(notification);
            
            // Add style for the notification
            const style = document.getElementById('game-styles');
            if (style) {
                style.textContent += `
                    #cheatNotification {
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
                    #cheatNotification.visible {
                        opacity: 1;
                    }
                `;
            }
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.classList.add('visible');
        
        // Hide notification after 2 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
        }, 2000);
    }
}

window.onload = () => {
    new Game();
};