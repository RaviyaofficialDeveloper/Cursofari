/**
 * BackgroundEnvironment.js
 * Manages the procedural 3-layer animated background particles.
 */
import { CreatureSystemConfig } from './AnimalPresets.js';

export default class BackgroundEnvironment {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        this.config = CreatureSystemConfig;
        
        this.particles = [];
        this.time = 0;
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.initParticles();
    }
    
    initParticles() {
        if (!this.config.enableParticles) return;
        
        // Determine particle count based on screen size
        let count = 120; // Desktop default
        if (this.width < 768) count = 40; // Mobile
        else if (this.width < 1024) count = 80; // Tablet
        
        this.particles = [];
        for (let i = 0; i < count; i++) {
            // Assign to 3 depth layers
            const layer = Math.random();
            let z = 1;
            let speedMult = 1;
            let size = 1;
            let alpha = 0.5;
            
            if (layer < 0.3) {
                // Far
                z = 3;
                speedMult = 0.2;
                size = 1;
                alpha = 0.2;
            } else if (layer < 0.7) {
                // Mid
                z = 2;
                speedMult = 0.5;
                size = 2;
                alpha = 0.4;
            } else {
                // Near
                z = 1;
                speedMult = 1.0;
                size = 3.5;
                alpha = 0.6;
            }
            
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                z: z,
                size: size,
                alpha: alpha,
                vx: (Math.random() - 0.5) * speedMult,
                vy: (Math.random() - 0.5) * speedMult,
                baseVx: (Math.random() - 0.5) * speedMult,
                baseVy: (Math.random() - 0.5) * speedMult,
                wobbleSpeed: 0.001 + Math.random() * 0.002,
                wobbleOffset: Math.random() * Math.PI * 2
            });
        }
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        // Re-initialize to adjust counts dynamically
        this.initParticles();
    }

    update(pointerState, deltaTime) {
        if (!this.config.enableParticles) return;
        
        this.time += deltaTime;
        
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.ctx.fillStyle = isDarkMode ? "rgba(255, 255, 255, " : "rgba(0, 0, 0, ";
        
        this.particles.forEach(p => {
            // Base movement + organic wobble
            p.vx = p.baseVx + Math.sin(this.time * p.wobbleSpeed + p.wobbleOffset) * 0.2;
            p.vy = p.baseVy + Math.cos(this.time * p.wobbleSpeed + p.wobbleOffset) * 0.2;
            
            // Cursor interaction (Repulsion / Parallax)
            if (pointerState.isVisible && this.config.enableParallax) {
                const dx = p.x - pointerState.x;
                const dy = p.y - pointerState.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Repulsion force
                const interactionDist = 150;
                if (dist < interactionDist) {
                    const force = (interactionDist - dist) / interactionDist;
                    p.vx += (dx / dist) * force * 1.5;
                    p.vy += (dy / dist) * force * 1.5;
                }
                
                // Mouse Velocity Parallax based on depth
                p.vx -= pointerState.vx * (0.005 / p.z);
                p.vy -= pointerState.vy * (0.005 / p.z);
            }
            
            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;
            
            // Friction for interaction forces
            p.vx *= 0.95;
            p.vy *= 0.95;
            
            // Screen wrap
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;
            
            // Render
            this.ctx.beginPath();
            this.ctx.fillStyle = isDarkMode ? `rgba(255, 255, 255, ${p.alpha})` : `rgba(0, 0, 0, ${p.alpha})`;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}
