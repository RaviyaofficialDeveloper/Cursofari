/**
 * main.js
 * Entry point for the Premium Mouse-Following Animal System.
 */

import { AnimalPresets } from './AnimalPresets.js';
import MouseFollowerAnimal from './MouseFollowerAnimal.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Default preset
    const defaultPreset = AnimalPresets.lizard;
    
    // Initialize the system
    const animalSystem = new MouseFollowerAnimal('animalCanvas', defaultPreset);
    
    // Setup Minimal UI Controls (Production)
    const presetSelect = document.getElementById('presetSelect');
    
    // Handle animal switching with a smooth morph/transition if possible,
    // or just swap for now.
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            const selectedPresetName = e.target.value;
            const newPreset = AnimalPresets[selectedPresetName];
            if (newPreset) {
                // In a full implementation we could animate the transition, 
                // but setting the preset directly works cleanly.
                animalSystem.setPreset(newPreset);
            }
        });
    }
});
