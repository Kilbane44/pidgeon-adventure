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
            minScale: 0.5,     // More zoom out at height for better visibility
            maxScale: 0.7,     // Less zoom in at ground
            targetScale: 0.7,
            zoomSpeed: 0.02,
            groundY: groundPosition,
            x: 0,
            y: 0,
            maxHeight: this.canvas.height * 10  // Allow flying much higher
        };
        
        // Generate stars once at initialization
        this.stars = this.generateStars(300);
        
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
            boostUpForce: -5,       // Reduced from -10 to be less extreme
            boostDuration: 3000,    // 3 seconds of boost
            boostTimer: 0,
            cometTrail: []          // Array to store comet trail particles
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
        
        this.setupEventListeners();
        this.showStartScreen();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (!this.isGameStarted) {
                    this.startGame();
                } else if (!this.isGameOver) {
                    this.player.isHolding = true;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && !this.isGameOver) {
                this.player.isHolding = false;
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
        
        // Calculate target scale - now inverted logic with extended range:
        // Low height (near ground) = high scale value (zoomed in)
        // High height (far from ground) = low scale value (zoomed out)
        const normalizedDistance = Math.min(distanceFromGround / maxDistance, 1);
        
        // Higher normalizedDistance (higher from ground) means more zoomed out (smaller value)
        this.camera.targetScale = this.camera.maxScale + 
            (1 - normalizedDistance) * (this.camera.minScale - this.camera.maxScale);
        
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
        
        if (this.player.isHolding) {
            this.player.velocity += this.player.swoopForce;
            this.player.velocity = Math.max(this.player.velocity, -this.player.maxVelocity);
            this.player.swoopAngle = Math.min(this.player.swoopAngle + 0.1, 0.3);
        } else {
            this.player.velocity += this.player.gravity;
            this.player.velocity = Math.min(this.player.velocity, this.player.maxVelocity);
            this.player.swoopAngle = Math.max(this.player.swoopAngle - 0.1, -0.3);
        }
        
        this.player.y += this.player.velocity;
        
        // Only check bottom boundary, allow unlimited upward flight
        if (this.player.y + this.player.height > this.camera.groundY) {
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
    
    generatePowerPoint() {
        const powerUpTypes = [
            { type: 'shield', color: '#4169E1' },
            { type: 'shrink', color: '#FF1493' },
            { type: 'point', color: '#FF69B4' },
            { type: 'boost', color: '#FF6600' }  // Bright orange for boost
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
                
            case 'point':
                this.powerPointsCollected++;
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
        document.getElementById('powerPoints').textContent = `Power Points: ${this.powerPointsCollected}`;
        
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
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
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
        
        // Draw comet trail if boosting
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
        
        // Draw player sprite with animation
        this.ctx.save();
        this.ctx.translate(
            this.player.x + this.player.width/2,
            this.player.y + this.player.height/2
        );
        this.ctx.rotate(this.player.swoopAngle);
        
        // Get the current frame to draw
        const currentFrame = this.images.playerFrames[this.player.frameIndex];
        
        // Handle case if images aren't loaded yet or animation isn't working
        if (currentFrame && currentFrame.complete) {
            // Add glow effect if boosting
            if (this.player.isBoosting) {
                this.ctx.shadowColor = 'rgba(255, 165, 0, 0.7)';
                this.ctx.shadowBlur = 15;
            }
            
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
        
        // Draw obstacles with boost effect if player is boosting
        this.ctx.fillStyle = this.player.isBoosting ? '#4CAF50' : '#2E8B57';
        this.obstacles.forEach(obstacle => {
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
            this.ctx.restore();
        });
        
        // Draw power points
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
            this.ctx.fillText(
                powerPoint.type === 'shield' ? '🛡️' : 
                powerPoint.type === 'shrink' ? '🔽' : 
                powerPoint.type === 'boost' ? '🚀' :
                '⭐',
                powerPoint.x + powerPoint.width/2,
                powerPoint.y + powerPoint.height/2
            );
        });
        
        // Restore camera transform
        this.ctx.restore();
    }
}

window.onload = () => {
    new Game();
}; 