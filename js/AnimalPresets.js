/**
 * AnimalPresets.js
 * Contains the central configuration for the Creature System,
 * as well as the behavior and visual profiles for different animals.
 */

export const CreatureSystemConfig = {
    // Distance from the cursor
    followDistance: { desktop: 240, laptop: 200, mobile: 120 },
    
    // Predictive tracking
    predictionAmount: 0.35,
    
    // Physics
    smoothing: 0.08,        // Lower = smoother, slower follow
    maxSpeed: 16,           // Maximum velocity
    acceleration: 0.08,     // How fast it reaches max speed
    damping: 0.88,          // Velocity decay
    
    // Appearance
    creatureScale: { desktop: 1.0, large: 1.2, tablet: 0.8, mobile: 0.6 },
    baseLineWidth: 2.0,     // Base multiplier for line width
    
    // Features
    enableBackground: true,
    enableParticles: true,
    enableParallax: true,
    enableShadow: true,
    enableIdleAnimation: true,
    enableAutonomousMode: true,
    
    // Global debug flag (hidden in production)
    debug: false
};

// sophisticated colors, avoid pure white, use gradients/shading
export const AnimalVisualProfiles = {
    lizard: {
        primary: "#4d7c0f",     // Natural Iguana Green
        secondary: "#3f6212",   // Darker green
        highlight: "#65a30d",   // Light green scale highlight
        shadow: "#1a2e05",
        eye: "#facc15"          // Yellow reptile eye
    },
    snake: {
        primary: "#854d0e",     // Natural brown/tan (Viper/Python)
        secondary: "#713f12",
        highlight: "#a16207",
        shadow: "#422006",
        eye: "#000"
    },
    dragon: {
        primary: "#27272a",     // Realistic dark leathery grey (Komodo-like)
        secondary: "#18181b",
        highlight: "#3f3f46",
        shadow: "#09090b",
        eye: "#ef4444"
    },
    bird: {
        primary: "#57534e",     // Hawk / Eagle brown-grey
        secondary: "#44403c",
        highlight: "#78716c",
        shadow: "#1c1917",
        eye: "#facc15"
    },
    centipede: {
        primary: "#3f1d1d",     // Deep burgundy / dark brown
        secondary: "#291313",   // Very dark charcoal
        highlight: "#9a3412",   // Muted copper/rust
        shadow: "#170a0a",
        eye: "#fb923c"          // Warm amber glow
    }
};

export const AnimalPresets = {
    lizard: {
        name: "lizard",
        segmentCount: 40,
        bodyLength: 18,
        
        // Overrides or specific behavioral traits
        speedMultiplier: 1.1,
        turnSpeed: 0.15,
        
        // Animation
        tailWave: 0.25,
        tailLength: 15,         // Number of segments that are "tail"
        
        hasLegs: true,
        legs: [
            // Using inverse kinematics
            // side: -1 (left), 1 (right)
            { attachedSegment: 6, side: -1, offsetDist: 28, upperLength: 24, lowerLength: 20 },
            { attachedSegment: 6, side: 1, offsetDist: 28, upperLength: 24, lowerLength: 20 },
            { attachedSegment: 22, side: -1, offsetDist: 24, upperLength: 22, lowerLength: 18 },
            { attachedSegment: 22, side: 1, offsetDist: 24, upperLength: 22, lowerLength: 18 }
        ],
        legStepDistance: 45,    // How far body moves before stepping
        legStepDuration: 0.2    // Speed of step (0-1 progression per frame)
    },
    
    snake: {
        name: "snake",
        segmentCount: 60,
        bodyLength: 16,
        
        speedMultiplier: 0.9,
        turnSpeed: 0.08,
        
        tailWave: 0.4,
        tailLength: 20,
        
        hasLegs: false
    },
    
    dragon: {
        name: "dragon",
        segmentCount: 30, // Shorter core body, large segments
        bodyLength: 25,
        
        speedMultiplier: 0.8, // Heavy, slower
        turnSpeed: 0.04,      // Wide turns
        
        tailWave: 0.15,
        tailLength: 15,
        
        hasLegs: false, // We'll focus entirely on wings for this implementation
        hasWings: true,
        isFlying: true,
        
        // Wing properties
        flapFrequency: 0.003, // Slow heavy beats
        flapAmplitude: 45,
        wingAttachedSegment: 5,
        wingBones: {
            upper: 60,
            forearm: 70,
            finger: 50
        }
    },
    
    bird: {
        name: "bird",
        segmentCount: 15, // Short body
        bodyLength: 12,
        
        speedMultiplier: 1.0, // Reduced speed for realism
        turnSpeed: 0.12,      // Slightly reduced turn speed

        
        tailWave: 0.05,
        tailLength: 5, // Short fanned tail
        
        hasLegs: false,
        hasWings: true,
        isFlying: true,
        
        // Wing properties
        flapFrequency: 0.012, // Fast flapping
        flapAmplitude: 30,
        wingAttachedSegment: 3,
        wingBones: {
            upper: 30,
            forearm: 25,
            finger: 15
        }
    },
    
    centipede: {
        name: "centipede",
        segmentCount: 25, // 25 body segments
        bodyLength: 16,   // Total length ~400px
        
        speedMultiplier: 1.3, // Fast crawling
        turnSpeed: 0.15,      // Responsive head
        
        tailWave: 0.2,    // Subtle tail drag
        tailLength: 5,
        
        hasLegs: true,
        isCentipede: true, // Special flag for centipede logic
        legPairs: 20,      // Total number of leg pairs
        legLength: 15,     // Base length of legs
        legStepDistance: 12,
        legStepDuration: 0.15
    }
};

export default { CreatureSystemConfig, AnimalVisualProfiles, AnimalPresets };
