class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Make canvas full window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
        
        // Position ground near the bottom (7/8 of the screen height from the top)
        const groundPosition = this.canvas.height * 7/8;
        
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
            y: groundPosition - 100, // Position player above the ground
            width: 40,
            height: 40,
            velocity: 0,
            gravity: 0.15,
            maxVelocity: 6,
            hasShield: false,
            isShrunk: false,
            originalWidth: 40,
            originalHeight: 40,
            isHolding: false,
            swoopForce: -0.5,
            swoopAngle: 0,
            startY: groundPosition - 100 // Store starting Y relative to ground
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
        this.camera.groundY = this.canvas.height * 7/8;
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
        this.camera.x = this.player.x - (this.canvas.width / 2);
        
        // Position camera vertically to keep player visible
        // Adjust vertical offset based on distance from ground to show more sky as player ascends
        const groundOffset = this.canvas.height / 8 * (1 + normalizedDistance * 2);
        this.camera.y = this.player.y - (this.canvas.height / 2) - groundOffset;
    }
    
    update() {
        // Update camera first
        this.updateCamera();
        
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
        
        if (this.obstacles.length === 0 || 
            this.canvas.width - this.lastObstacleX > 500) {
            this.generateObstacle();
        }
        
        if (Math.random() < 0.03) {
            this.generatePowerPoint();
        }
        
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            return obstacle.x > -obstacle.width - 500;
        });
        
        this.powerPoints = this.powerPoints.filter(powerPoint => {
            powerPoint.x -= this.gameSpeed;
            return powerPoint.x > -powerPoint.width - 500;
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
        
        // Place obstacles across a wider vertical range
        // Make sure obstacles don't spawn too close to the ground
        const minY = 50;
        const maxY = this.camera.groundY - type.height - 100;
        const y = minY + Math.random() * (maxY - minY);
        
        // Spawn obstacles farther out for better visibility with camera zoom
        const spawnDistance = this.canvas.width + 300;
        
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
            { type: 'point', color: '#FF69B4' }
        ];
        
        const powerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        // Adjust power-up spawning
        const minY = 50;
        const maxY = this.camera.groundY - 50;
        const y = minY + Math.random() * (maxY - minY);
        
        // Spawn power-ups farther out for better visibility with camera zoom
        const spawnDistance = this.canvas.width + 300;
        
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
        const skyWidth = this.canvas.width * 5;
        
        for (let i = 0; i < count; i++) {
            // Position stars in the upper part of the sky (negative y)
            const starY = -Math.random() * maxHeight * 0.8 - maxHeight * 0.2;
            
            stars.push({
                x: Math.random() * skyWidth - skyWidth / 2,
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
        
        // Draw extended sky gradient with multiple color stops
        const skyGradient = this.ctx.createLinearGradient(0, -skyHeight, 0, this.camera.groundY);
        skyGradient.addColorStop(0, '#000000');       // Space - black at very top
        skyGradient.addColorStop(0.1, '#000033');     // Deep space - very dark blue
        skyGradient.addColorStop(0.2, '#000066');     // Night sky
        skyGradient.addColorStop(0.4, '#0A1A5C');     // Dawn/dusk deep blue
        skyGradient.addColorStop(0.6, '#1E4F9C');     // Daytime blue - deeper
        skyGradient.addColorStop(0.8, '#4A90E2');     // Daytime blue
        skyGradient.addColorStop(1, '#B4D6FF');       // Horizon light blue
        
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(-this.canvas.width * 2, -skyHeight, this.canvas.width * 5, skyHeight + this.camera.groundY + this.canvas.height);
        
        // Draw stars in the upper part of the sky
        this.ctx.fillStyle = '#FFFFFF';
        for (const star of this.stars) {
            this.ctx.globalAlpha = star.brightness;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;  // Reset alpha
        
        // Draw dirt below ground (only showing a small amount)
        this.ctx.fillStyle = '#8B4513'; // Saddle brown for dirt
        const dirtHeight = this.canvas.height / 8; // Only show a small section of dirt
        this.ctx.fillRect(-this.canvas.width * 2, this.camera.groundY, this.canvas.width * 5, dirtHeight);
        
        // Draw some dirt details (rocks, etc.)
        this.ctx.fillStyle = '#6B3203'; // Darker brown for dirt details
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width * 5 - this.canvas.width * 2;
            const y = this.camera.groundY + Math.random() * (dirtHeight - 5);
            const rockSize = 2 + Math.random() * 4;
            this.ctx.fillRect(x, y, rockSize, rockSize);
        }
        
        // Draw grass ground as a thin strip
        this.ctx.fillStyle = '#2E8B57';
        this.ctx.fillRect(-this.canvas.width * 2, this.camera.groundY, this.canvas.width * 5, 3);
        
        // Draw grass details - taller grass blades
        this.ctx.fillStyle = '#228B22';
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * this.canvas.width * 5 - this.canvas.width * 2;
            const height = 3 + Math.random() * 8;
            this.ctx.fillRect(x, this.camera.groundY, 1, -height);
        }
        
        // Draw player
        this.ctx.save();
        this.ctx.translate(
            this.player.x + this.player.width/2,
            this.player.y + this.player.height/2
        );
        this.ctx.rotate(this.player.swoopAngle);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(
            -this.player.width/2,
            -this.player.height/2,
            this.player.width,
            this.player.height
        );
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
        
        // Draw obstacles
        this.ctx.fillStyle = '#2E8B57';
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            this.ctx.translate(
                obstacle.x + obstacle.width/2,
                obstacle.y + obstacle.height/2
            );
            this.ctx.rotate(obstacle.rotation);
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
                powerPoint.type === 'shrink' ? '🔽' : '⭐',
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