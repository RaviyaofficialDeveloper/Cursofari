/**
 * MouseFollowerAnimal.js
 * The main orchestrator class.
 */

import { CreatureSystemConfig } from './AnimalPresets.js';
import AnimalPhysics from './AnimalPhysics.js';
import AnimalRenderer from './AnimalRenderer.js';
import BackgroundEnvironment from './BackgroundEnvironment.js';

export default class MouseFollowerAnimal {
    constructor(canvasId, initialPreset) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.preset = initialPreset;
        this.config = CreatureSystemConfig;
        
        // Pointer tracking with velocity
        this.pointer = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            vx: 0,
            vy: 0,
            isMoving: false,
            isVisible: true
        };
        this.lastPointerX = this.pointer.x;
        this.lastPointerY = this.pointer.y;
        this.pointerTimeout = null;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Event listeners
        window.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
        
        window.addEventListener('mouseout', () => {
            this.pointer.isVisible = false;
        });
        window.addEventListener('mouseover', () => {
            this.pointer.isVisible = true;
        });

        // Visibility API for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            } else {
                this.start();
            }
        });

        // Initialize Systems
        this.background = new BackgroundEnvironment(this.canvas, this.ctx);
        this.physics = new AnimalPhysics(this.preset, this.pointer.x, this.pointer.y);
        this.renderer = new AnimalRenderer(this.canvas, this.ctx, this.preset);

        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (this.prefersReducedMotion) {
            this.config.enableParticles = false;
            this.config.maxSpeed *= 0.5;
        }

        this.lastTime = performance.now();
        this.animationFrameId = null;
        this.isRunning = false;
        
        this.start();
    }

    setPreset(preset) {
        this.preset = preset;
        this.physics = new AnimalPhysics(this.preset, this.physics.segments[0].x, this.physics.segments[0].y);
        this.renderer.setPreset(this.preset);
    }

    onPointerMove(x, y) {
        // Calculate velocity
        this.pointer.vx = x - this.lastPointerX;
        this.pointer.vy = y - this.lastPointerY;
        
        this.pointer.x = x;
        this.pointer.y = y;
        this.pointer.isMoving = true;
        this.pointer.isVisible = true;
        
        this.lastPointerX = x;
        this.lastPointerY = y;
        
        if (this.pointerTimeout) {
            clearTimeout(this.pointerTimeout);
        }
        
        this.pointerTimeout = setTimeout(() => {
            this.pointer.isMoving = false;
            this.pointer.vx = 0;
            this.pointer.vy = 0;
        }, 50); // Fast timeout for velocity dropoff
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        if (this.background) {
            this.background.resize(this.width, this.height);
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.loop();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    loop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Render Background First
        if (this.config.enableBackground) {
            this.background.update(this.pointer, deltaTime);
        }

        // Update & Render Physics
        this.physics.update(this.pointer, deltaTime, this.width, this.height);
        this.renderer.render(this.physics, this.width, this.config.debug);

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
}
