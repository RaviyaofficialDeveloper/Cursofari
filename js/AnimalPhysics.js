/**
 * AnimalPhysics.js
 * Handles movement, predictive tracking, kinematics, and inverse kinematics (IK).
 */
import { CreatureSystemConfig } from './AnimalPresets.js';

export default class AnimalPhysics {
    constructor(preset, startX, startY) {
        this.preset = preset;
        this.segments = [];
        this.legs = [];
        this.time = 0;
        
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Config shortcuts
        this.config = CreatureSystemConfig;
        
        // Current actual target (where the head is trying to go)
        this.targetX = startX;
        this.targetY = startY;

        // Initialize body segments
        for (let i = 0; i < preset.segmentCount; i++) {
            this.segments.push({
                x: startX,
                y: startY,
                angle: 0,
                // Inertial properties for advanced physics
                vx: 0,
                vy: 0
            });
        }
        
        // Initialize legs
        if (this.preset.hasLegs && this.preset.legs) {
            this.preset.legs.forEach(legConfig => {
                this.legs.push({
                    config: legConfig,
                    currentX: startX,
                    currentY: startY,
                    targetX: startX,
                    targetY: startY,
                    stepProgress: 1, // 1 = planted
                    isStepping: false,
                    jointX: startX,
                    jointY: startY,
                    // Used for step arc
                    startX: startX,
                    startY: startY,
                    phaseOffset: 0
                });
            });
        } else if (this.preset.hasLegs && this.preset.isCentipede) {
            // Generate multiple leg pairs for Centipede
            const legPairs = this.preset.legPairs || 20;
            const startSegment = 2; // Skip head
            const endSegment = this.preset.segmentCount - 3; // Skip tail tip
            const segmentRange = endSegment - startSegment;
            
            for (let i = 0; i < legPairs; i++) {
                const segmentIndex = startSegment + Math.floor(i * (segmentRange / legPairs));
                // Traveling wave offset
                const phase = (i / legPairs) * Math.PI * 4;
                
                // Left leg
                this.legs.push({
                    config: { side: -1, attachedSegment: segmentIndex, offsetDist: this.preset.legLength, baseAngle: -Math.PI / 2 },
                    currentX: startX, currentY: startY, targetX: startX, targetY: startY,
                    stepProgress: 1, isStepping: false, jointX: startX, jointY: startY, startX: startX, startY: startY,
                    phaseOffset: phase
                });
                // Right leg
                this.legs.push({
                    config: { side: 1, attachedSegment: segmentIndex, offsetDist: this.preset.legLength, baseAngle: Math.PI / 2 },
                    currentX: startX, currentY: startY, targetX: startX, targetY: startY,
                    stepProgress: 1, isStepping: false, jointX: startX, jointY: startY, startX: startX, startY: startY,
                    phaseOffset: phase + Math.PI // offset right side
                });
            }
            
            // Antennae
            this.antennae = [[], []]; // Left and right
            for(let a=0; a<2; a++) {
                for(let i=0; i<6; i++) {
                    this.antennae[a].push({x: startX, y: startY, angle: 0});
                }
            }
        }
        
        // Initialize wings if present
        if (this.preset.hasWings) {
            this.flapPhase = 0;
            this.isGliding = false;
            this.glideTimeout = 0;
            this.liftOffset = 0;
        }
    }

    // pointerState: { x, y, vx, vy, isMoving, isVisible }
    update(pointerState, deltaTime, screenWidth, screenHeight) {
        this.time += deltaTime;
        
        const head = this.segments[0];
        
        // Scale adjustment
        const scale = this.getScale(screenWidth);
        const currentFollowDistance = this.getFollowDistance(screenWidth) * scale;
        
        // Calculate Predictive Target
        let desiredX, desiredY;
        
        if (!pointerState.isVisible) {
            // Autonomous Mode: wander slowly around the center
            const centerX = screenWidth / 2;
            const centerY = screenHeight / 2;
            const wanderRadius = Math.min(screenWidth, screenHeight) * 0.3;
            
            desiredX = centerX + Math.cos(this.time * 0.0005) * wanderRadius;
            desiredY = centerY + Math.sin(this.time * 0.0007) * wanderRadius;
        } else {
            // Predictive tracking based on pointer velocity
            const predictedX = pointerState.x + (pointerState.vx * this.config.predictionAmount);
            const predictedY = pointerState.y + (pointerState.vy * this.config.predictionAmount);
            
            // Vector from head to predicted pos
            const dx = predictedX - head.x;
            const dy = predictedY - head.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > currentFollowDistance) {
                // Move towards predicted pos, stopping at followDistance
                const angleToMouse = Math.atan2(dy, dx);
                
                // Add an orbit offset based on sine wave to prevent robotic straight-line following
                const orbitOffset = Math.sin(this.time * 0.002) * 0.3;
                const finalAngle = angleToMouse + orbitOffset;
                
                // The creature tries to stay currentFollowDistance away from the mouse
                desiredX = predictedX - Math.cos(finalAngle) * currentFollowDistance;
                desiredY = predictedY - Math.sin(finalAngle) * currentFollowDistance;
            } else {
                // If inside the follow distance, chill out (idle behavior)
                desiredX = head.x;
                desiredY = head.y;
            }
        }
        
        // Edge avoidance
        const margin = 50 * scale;
        if (desiredX < margin) desiredX = margin;
        if (desiredX > screenWidth - margin) desiredX = screenWidth - margin;
        if (desiredY < margin) desiredY = margin;
        if (desiredY > screenHeight - margin) desiredY = screenHeight - margin;

        // Apply Spring/Damper physics to Velocity
        const ax = (desiredX - head.x) * this.config.acceleration * this.preset.speedMultiplier;
        const ay = (desiredY - head.y) * this.config.acceleration * this.preset.speedMultiplier;
        
        this.velocityX += ax;
        this.velocityY += ay;
        
        // Damping
        this.velocityX *= this.config.damping;
        this.velocityY *= this.config.damping;
        
        // Max Speed limit
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const currentMaxSpeed = this.config.maxSpeed * this.preset.speedMultiplier;
        if (speed > currentMaxSpeed) {
            const ratio = currentMaxSpeed / speed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }
        
        // Idle Animation if barely moving
        let idleOffsetX = 0;
        let idleOffsetY = 0;
        if (speed < 1.0 && this.config.enableIdleAnimation) {
            idleOffsetX = Math.sin(this.time * 0.001) * 2 * scale;
            idleOffsetY = Math.cos(this.time * 0.0008) * 1.5 * scale;
            
            // Random tiny head movements
            if (Math.random() < 0.01) {
                this.velocityX += (Math.random() - 0.5) * 5;
                this.velocityY += (Math.random() - 0.5) * 5;
            }
        }
        let headTurnDiff = 0;
        if (speed > 0.5) {
            // Smoothly turn head
            const targetAngle = Math.atan2(this.velocityY, this.velocityX);
            // Angle interpolation logic to avoid snap-around at PI/-PI boundary
            headTurnDiff = targetAngle - head.angle;
            while (headTurnDiff < -Math.PI) headTurnDiff += Math.PI * 2;
            while (headTurnDiff > Math.PI) headTurnDiff -= Math.PI * 2;
            head.angle += headTurnDiff * this.preset.turnSpeed;
        }

        // Flight calculations (if winged)
        let flightLift = 0;
        if (this.preset.hasWings) {
            // Speed affects flap rate
            let speedMult = Math.max(0.5, speed / (currentMaxSpeed * 0.5));
            
            // Bird gliding logic: if moving fast and steady, glide instead of flap
            if (this.preset.name === 'bird' && speed > currentMaxSpeed * 0.7 && Math.abs(headTurnDiff) < 0.05) {
                this.glideTimeout += deltaTime;
                if (this.glideTimeout > 500) {
                    this.isGliding = true;
                }
            } else {
                this.glideTimeout = 0;
                this.isGliding = false;
            }
            
            if (!this.isGliding) {
                this.flapPhase += deltaTime * this.preset.flapFrequency * speedMult;
            }
            
            // Bob up and down based on flap cycle
            flightLift = Math.sin(this.flapPhase) * this.preset.flapAmplitude * scale;
            this.liftOffset = flightLift;
        }

        // Apply Velocity to Head
        head.x += this.velocityX + idleOffsetX;
        head.y += this.velocityY + idleOffsetY + (this.preset.hasWings ? (flightLift * 0.1) : 0);

        // Forward Kinematics for Body Segments
        const scaledBodyLength = this.preset.bodyLength * scale;
        
        for (let i = 1; i < this.segments.length; i++) {
            const current = this.segments[i];
            const prev = this.segments[i - 1];
            
            const segDx = prev.x - current.x;
            const segDy = prev.y - current.y;
            
            // Calculate angle to previous segment
            let targetAngle = Math.atan2(segDy, segDx);
            
            // Tail Wave / Inertia
            if (i > this.segments.length - this.preset.tailLength) {
                const waveProg = (i - (this.segments.length - this.preset.tailLength)) / this.preset.tailLength;
                const wave = Math.sin(this.time * 0.005 - i * 0.3) * this.preset.tailWave * waveProg;
                
                // Add velocity-based drag to tail
                const drag = -headTurnDiff * 0.5 * waveProg; 
                targetAngle += wave + drag;
            }
            
            // Smooth segment rotation
            let aDiff = targetAngle - current.angle;
            while (aDiff < -Math.PI) aDiff += Math.PI * 2;
            while (aDiff > Math.PI) aDiff -= Math.PI * 2;
            
            // Stiffer near head, looser near tail
            const stiffness = Math.max(0.2, 1.0 - (i / this.segments.length));
            current.angle += aDiff * stiffness;
            
            // Pull segment
            let ox = 0;
            let oy = 0;
            if (this.preset.isCentipede) {
                // Lateral body undulation for centipede
                const phase = i * 0.4 - this.time * 0.01;
                const amplitude = Math.sin(phase) * 3 * scale * Math.min(1, speed / 5);
                ox = Math.cos(targetAngle + Math.PI/2) * amplitude;
                oy = Math.sin(targetAngle + Math.PI/2) * amplitude;
            }
            
            current.x = prev.x - Math.cos(current.angle) * scaledBodyLength + ox;
            current.y = prev.y - Math.sin(current.angle) * scaledBodyLength + oy;
        }

        // Antennae Physics (Centipede only)
        if (this.preset.isCentipede && this.antennae) {
            const h = this.segments[0]; // Head
            for (let a = 0; a < 2; a++) {
                const chain = this.antennae[a];
                const side = a === 0 ? -1 : 1;
                const attachAngle = h.angle + (Math.PI/4) * side;
                
                // Base attached to head
                chain[0].x = h.x + Math.cos(attachAngle) * 8 * scale;
                chain[0].y = h.y + Math.sin(attachAngle) * 8 * scale;
                chain[0].angle = attachAngle;
                
                // Idle sway
                const sway = Math.sin(this.time * 0.002 + a * Math.PI) * 0.2;
                
                for (let i = 1; i < chain.length; i++) {
                    const c = chain[i];
                    const p = chain[i-1];
                    let tAngle = p.angle + sway + (speed > 1 ? -side * 0.1 : 0);
                    
                    let aDiff = tAngle - c.angle;
                    while (aDiff < -Math.PI) aDiff += Math.PI * 2;
                    while (aDiff > Math.PI) aDiff -= Math.PI * 2;
                    
                    c.angle += aDiff * 0.3; // stiffness
                    c.x = p.x + Math.cos(c.angle) * 4 * scale;
                    c.y = p.y + Math.sin(c.angle) * 4 * scale;
                }
            }
        }

        // Update Legs using 2-Bone IK
        if (this.preset.hasLegs) {
            this.updateLegs(speed, scale);
        }
    }

    updateLegs(bodySpeed, scale) {
        this.legs.forEach((leg) => {
            const attachSeg = this.segments[leg.config.attachedSegment];
            const angle = attachSeg.angle;
            
            const scaledOffset = leg.config.offsetDist * scale;
            const perpAngle = angle + (Math.PI / 2) * leg.config.side;
            
            const idealX = attachSeg.x + Math.cos(perpAngle) * scaledOffset;
            const idealY = attachSeg.y + Math.sin(perpAngle) * scaledOffset;
            
            const dx = idealX - leg.currentX;
            const dy = idealY - leg.currentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const scaledStepDist = this.preset.legStepDistance * scale;
            
            // Determine if leg should step
            let shouldStep = false;
            if (this.preset.isCentipede) {
                // Wave locomotion
                const waveSpeed = 0.02;
                const speedMult = Math.max(0.5, bodySpeed / 5);
                const phase = (this.time * waveSpeed * speedMult + leg.phaseOffset) % (Math.PI * 2);
                
                if (Math.sin(phase) > 0.8 && dist > scaledStepDist * 0.5) {
                    shouldStep = true;
                }
                // Force step if dragging too far
                if (dist > scaledStepDist * 1.5) {
                    shouldStep = true;
                }
            } else {
                if (dist > scaledStepDist) {
                    shouldStep = true;
                }
            }
            
            // Start Step
            if (!leg.isStepping && shouldStep) {
                leg.isStepping = true;
                leg.stepProgress = 0;
                leg.startX = leg.currentX;
                leg.startY = leg.currentY;
                
                // Predict target based on velocity
                leg.targetX = idealX + this.velocityX * 3;
                leg.targetY = idealY + this.velocityY * 3;
            }
            
            // Execute Step
            if (leg.isStepping) {
                // Adjust step speed based on body speed (faster body = faster steps)
                const speedMult = Math.max(1, bodySpeed / 5);
                leg.stepProgress += this.preset.legStepDuration * speedMult;
                
                if (leg.stepProgress >= 1) {
                    leg.stepProgress = 1;
                    leg.isStepping = false;
                }
                
                // Parabolic Arc for foot lifting
                const t = leg.stepProgress;
                const easeT = t * t * (3 - 2 * t); // smoothstep
                
                leg.currentX = leg.startX + (leg.targetX - leg.startX) * easeT;
                leg.currentY = leg.startY + (leg.targetY - leg.startY) * easeT;
                
                // We don't render Z-axis directly, but we could pass a 'lift' value to the renderer
                // leg.lift = Math.sin(t * Math.PI) * 15 * scale;
            } else if (bodySpeed < 0.5 && dist > scaledStepDist * 0.5) {
                // Micro-adjustments when idle
                leg.currentX += dx * 0.02;
                leg.currentY += dy * 0.02;
            }

            // IK Calculation
            this.calculateIK(leg, attachSeg.x, attachSeg.y, scale);
        });
    }

    calculateIK(leg, baseX, baseY, scale) {
        const L1 = leg.config.upperLength * scale;
        const L2 = leg.config.lowerLength * scale;
        
        let dx = leg.currentX - baseX;
        let dy = leg.currentY - baseY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        // Prevent stretching beyond max length
        if (dist >= L1 + L2) {
            const ratio = (L1 + L2 - 0.1) / dist;
            dx *= ratio;
            dy *= ratio;
            dist = L1 + L2 - 0.1;
            leg.currentX = baseX + dx;
            leg.currentY = baseY + dy;
        }

        const baseAngle = Math.atan2(dy, dx);
        const cosAngle = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
        const safeCos = Math.max(-1, Math.min(1, cosAngle));
        const angleOffset = Math.acos(safeCos);
        
        const bendDir = leg.config.side > 0 ? 1 : -1;
        const jointAngle = baseAngle + angleOffset * bendDir;
        
        leg.jointX = baseX + Math.cos(jointAngle) * L1;
        leg.jointY = baseY + Math.sin(jointAngle) * L1;
    }
    
    getScale(screenWidth) {
        if (screenWidth >= 1440) return this.config.creatureScale.large;
        if (screenWidth >= 1024) return this.config.creatureScale.desktop;
        if (screenWidth >= 768) return this.config.creatureScale.tablet;
        return this.config.creatureScale.mobile;
    }
    
    getFollowDistance(screenWidth) {
        if (screenWidth >= 1024) return this.config.followDistance.desktop;
        if (screenWidth >= 768) return this.config.followDistance.laptop;
        return this.config.followDistance.mobile;
    }
}
