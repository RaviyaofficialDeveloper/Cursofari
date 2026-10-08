/**
 * AnimalRenderer.js
 * Handles drawing the animal segments with premium 2.5D styling.
 */
import { CreatureSystemConfig, AnimalVisualProfiles } from './AnimalPresets.js';

export default class AnimalRenderer {
    constructor(canvas, context, preset) {
        this.canvas = canvas;
        this.ctx = context;
        this.preset = preset;
        this.config = CreatureSystemConfig;
        
        this.updateProfile();
    }

    setPreset(preset) {
        this.preset = preset;
        this.updateProfile();
    }
    
    updateProfile() {
        this.profile = AnimalVisualProfiles[this.preset.name] || AnimalVisualProfiles.lizard;
    }

    render(physics, screenWidth, isDebug) {
        const ctx = this.ctx;
        const scale = physics.getScale(screenWidth);
        
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // 1. Draw Drop Shadow (Ambient Grounding)
        if (this.config.enableShadow) {
            this.drawShadow(ctx, physics, scale);
        }

        // 2. Draw Legs (Under the body)
        if (this.preset.hasLegs) {
            physics.legs.forEach(leg => {
                this.drawLeg(ctx, leg, physics, scale);
            });
        }
        
        // 2.5 Draw Wings (if flying creature)
        if (this.preset.hasWings) {
            this.drawWings(ctx, physics, scale);
        }

        // 3. Draw Body (2.5D Layered Spine)
        this.drawBody(ctx, physics.segments, scale);
        
        // 4. Draw Head
        this.drawHead(ctx, physics.segments[0], scale, physics.velocityX, physics.velocityY);

        if (isDebug) {
            this.renderDebug(physics);
        }
    }

    drawShadow(ctx, physics, scale) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 20 * scale;
        ctx.shadowOffsetY = 15 * scale;
        
        ctx.beginPath();
        physics.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
        });
        ctx.strokeStyle = "rgba(0,0,0,0.1)"; // Almost invisible stroke just to cast shadow
        ctx.lineWidth = this.config.baseLineWidth * 10 * scale;
        ctx.stroke();
        ctx.restore();
    }

    drawBody(ctx, segments, scale) {
        if (segments.length === 0) return;

        const baseWidth = this.config.baseLineWidth * 8 * scale; // Much thicker than prototype
        
        if (this.preset.isCentipede) {
            // Draw centipede segmented armor
            for (let i = segments.length - 1; i >= 0; i--) {
                const seg = segments[i];
                let width = baseWidth;
                
                // Taper neck and tail
                if (i < 3) width = baseWidth * (0.8 + 0.2 * (i/3));
                const tailStart = segments.length - this.preset.tailLength;
                if (i > tailStart) {
                    const taper = 1 - ((i - tailStart) / this.preset.tailLength);
                    width = baseWidth * Math.max(0.2, taper);
                }
                
                ctx.save();
                ctx.translate(seg.x, seg.y);
                ctx.rotate(seg.angle);
                
                // Draw overlapping armor plates
                const plateLength = this.preset.bodyLength * scale * 0.8;
                
                // Shadow
                ctx.beginPath();
                ctx.ellipse(-plateLength*0.2, 0, plateLength, width, 0, 0, Math.PI * 2);
                ctx.fillStyle = this.profile.shadow;
                ctx.fill();
                
                // Primary
                ctx.beginPath();
                ctx.ellipse(-plateLength*0.1, 0, plateLength * 0.9, width * 0.8, 0, 0, Math.PI * 2);
                ctx.fillStyle = this.profile.primary;
                ctx.fill();
                
                // Highlight
                ctx.beginPath();
                ctx.ellipse(0, 0, plateLength * 0.7, width * 0.4, 0, 0, Math.PI * 2);
                ctx.fillStyle = this.profile.highlight;
                ctx.fill();
                
                ctx.restore();
            }
            return;
        }
        
        // We will draw the body in multiple layers to create a 2.5D tubular effect
        
        // Layer 1: Dark Base / Shadow Underside
        this.drawCurve(ctx, segments, baseWidth, this.profile.shadow);
        
        // Layer 2: Primary Color (Midtone)
        this.drawCurve(ctx, segments, baseWidth * 0.75, this.profile.primary);
        
        // Layer 3: Highlight Surface
        this.drawCurve(ctx, segments, baseWidth * 0.35, this.profile.highlight);
    }
    
    drawCurve(ctx, segments, maxWidth, color) {
        ctx.strokeStyle = color;
        
        const tailStartIdx = Math.floor(segments.length - this.preset.tailLength);
        
        for (let i = 1; i < segments.length; i++) {
            ctx.beginPath();
            const p0 = segments[i - 1];
            const p1 = segments[i];
            
            ctx.moveTo(p0.x, p0.y);
            
            // Midpoint smoothing
            const midX = p0.x + (p1.x - p0.x) / 2;
            const midY = p0.y + (p1.y - p0.y) / 2;
            
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
            ctx.lineTo(p1.x, p1.y);
            
            // Taper thickness along the body
            let width = maxWidth;
            
            // Neck taper
            if (i < 5) {
                width = maxWidth * (0.6 + 0.4 * (i/5));
            }
            
            // Tail taper
            if (i > tailStartIdx) {
                const taperProg = 1 - ((i - tailStartIdx) / this.preset.tailLength);
                width = maxWidth * taperProg;
            }
            
            ctx.lineWidth = Math.max(0.5, width);
            ctx.stroke();
        }
    }

    drawHead(ctx, head, scale, vx, vy, physics) {
        if (this.preset.isCentipede && physics && physics.antennae) {
            // Draw Antennae before head
            this.drawAntennae(ctx, physics.antennae, scale);
        }

        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(head.angle);

        const hw = (this.preset.isCentipede ? 14 : 12) * scale;
        const hl = (this.preset.isCentipede ? 18 : 16) * scale;
        
        // Base Shadow
        ctx.fillStyle = this.profile.shadow;
        this.drawHeadShape(ctx, hw * 1.1, hl * 1.1);
        ctx.fill();
        
        // Primary
        ctx.fillStyle = this.profile.primary;
        this.drawHeadShape(ctx, hw, hl);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = this.profile.highlight;
        this.drawHeadShape(ctx, hw * 0.6, hl * 0.8);
        ctx.fill();

        // Eyes
        ctx.fillStyle = this.profile.eye;
        
        // Eye offset based on velocity (looking)
        const eyeLook = Math.min(1, Math.sqrt(vx*vx + vy*vy) / 10) * 2 * scale;
        
        ctx.beginPath();
        ctx.arc(hl * 0.3 + eyeLook, -hw * 0.5, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(hl * 0.3 + eyeLook, hw * 0.5, 3 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
    
    drawHeadShape(ctx, w, l) {
        ctx.beginPath();
        if (this.preset.name === "snake") {
            ctx.ellipse(l/2, 0, l, w, 0, 0, Math.PI * 2);
        } else if (this.preset.isCentipede) {
            // Armored centipede head plate
            ctx.moveTo(l, 0); // front snout
            ctx.quadraticCurveTo(l*0.8, -w*1.2, -l*0.2, -w);
            ctx.lineTo(-l*0.6, -w*0.5); // back corner
            ctx.quadraticCurveTo(-l*0.4, 0, -l*0.6, w*0.5);
            ctx.lineTo(-l*0.2, w);
            ctx.quadraticCurveTo(l*0.8, w*1.2, l, 0);
            ctx.closePath();
        } else {
            ctx.moveTo(l, 0);       // snout
            ctx.lineTo(l*0.3, -w);  // side
            ctx.lineTo(-l*0.5, -w*0.6); // back
            ctx.lineTo(-l*0.5, w*0.6);
            ctx.lineTo(l*0.3, w);
            ctx.closePath();
        }
    }

    drawAntennae(ctx, antennae, scale) {
        ctx.save();
        ctx.strokeStyle = this.profile.highlight;
        ctx.lineWidth = this.config.baseLineWidth * 1.5 * scale;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        antennae.forEach(chain => {
            ctx.beginPath();
            ctx.moveTo(chain[0].x, chain[0].y);
            for (let i = 1; i < chain.length; i++) {
                ctx.lineTo(chain[i].x, chain[i].y);
            }
            ctx.stroke();
        });
        ctx.restore();
    }

    drawLeg(ctx, leg, physics, scale) {
        const attachSeg = physics.segments[leg.config.attachedSegment];
        
        let w1 = this.config.baseLineWidth * 6 * scale;
        let w2 = this.config.baseLineWidth * 4 * scale;
        let w3 = this.config.baseLineWidth * 2 * scale;
        
        if (this.preset.isCentipede) {
            // Thinner, creepier legs for centipede
            w1 *= 0.5;
            w2 *= 0.5;
            w3 *= 0.5;
        }
        
        // Draw Shadow Layer
        this.strokeLeg(ctx, attachSeg, leg, w1, this.profile.shadow);
        // Draw Primary Layer
        this.strokeLeg(ctx, attachSeg, leg, w2, this.profile.primary);
        // Draw Highlight Layer
        this.strokeLeg(ctx, attachSeg, leg, w3, this.profile.highlight);
        
        // Foot pad
        ctx.fillStyle = this.profile.shadow;
        ctx.beginPath();
        ctx.arc(leg.currentX, leg.currentY, w1 * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.profile.highlight;
        ctx.beginPath();
        ctx.arc(leg.currentX, leg.currentY, w3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    strokeLeg(ctx, attachSeg, leg, width, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(attachSeg.x, attachSeg.y);
        ctx.lineTo(leg.jointX, leg.jointY);
        ctx.lineTo(leg.currentX, leg.currentY);
        ctx.stroke();
    }
    
    drawWings(ctx, physics, scale) {
        if (!physics.segments || physics.segments.length < this.preset.wingAttachedSegment) return;
        
        const attachSeg = physics.segments[this.preset.wingAttachedSegment];
        const flapPhase = physics.flapPhase || 0;
        const isGliding = physics.isGliding;
        
        // Wing angles based on flap phase
        let flapAngle = Math.cos(flapPhase) * 0.8;
        if (isGliding) flapAngle = -0.2; // Slight dihedral angle when gliding
        
        // Draw Left Wing
        this.drawSingleWing(ctx, attachSeg, physics, scale, flapAngle, -1);
        // Draw Right Wing
        this.drawSingleWing(ctx, attachSeg, physics, scale, flapAngle, 1);
    }
    
    drawSingleWing(ctx, attachSeg, physics, scale, flapAngle, side) {
        const angle = attachSeg.angle;
        const baseWingAngle = angle + (Math.PI / 2) * side;
        
        // Incorporate flap sweep (sweeping back/forward slightly during flap)
        const sweep = Math.sin(physics.flapPhase) * 0.2 * side;
        const finalUpperAngle = baseWingAngle + flapAngle * side + sweep;
        
        const bones = this.preset.wingBones;
        const upperLen = bones.upper * scale;
        const forearmLen = bones.forearm * scale;
        const fingerLen = bones.finger * scale;
        
        // Shoulder
        const shoulderX = attachSeg.x;
        const shoulderY = attachSeg.y;
        
        // Elbow
        const elbowX = shoulderX + Math.cos(finalUpperAngle) * upperLen;
        const elbowY = shoulderY + Math.sin(finalUpperAngle) * upperLen;
        
        // Wrist
        // Wrist bends back slightly based on flap phase to create drag/lift arcs
        const wristBend = flapAngle * 0.5 * side;
        const wristAngle = finalUpperAngle + wristBend;
        const wristX = elbowX + Math.cos(wristAngle) * forearmLen;
        const wristY = elbowY + Math.sin(wristAngle) * forearmLen;
        
        if (this.preset.name === 'dragon') {
            this.drawDragonWing(ctx, shoulderX, shoulderY, elbowX, elbowY, wristX, wristY, wristAngle, fingerLen, side, scale);
        } else if (this.preset.name === 'bird') {
            this.drawBirdWing(ctx, shoulderX, shoulderY, elbowX, elbowY, wristX, wristY, wristAngle, fingerLen, side, scale, physics.flapPhase);
        }
    }
    
    drawDragonWing(ctx, sx, sy, ex, ey, wx, wy, wristAngle, fingerLen, side, scale) {
        // Dragon wing has structural fingers and a membrane stretching between them
        const f1Angle = wristAngle + 0.3 * side;
        const f2Angle = wristAngle - 0.2 * side;
        const f3Angle = wristAngle - 0.7 * side;
        
        const f1x = wx + Math.cos(f1Angle) * fingerLen * 1.2;
        const f1y = wy + Math.sin(f1Angle) * fingerLen * 1.2;
        
        const f2x = wx + Math.cos(f2Angle) * fingerLen;
        const f2y = wy + Math.sin(f2Angle) * fingerLen;
        
        const f3x = wx + Math.cos(f3Angle) * fingerLen * 0.8;
        const f3y = wy + Math.sin(f3Angle) * fingerLen * 0.8;
        
        // Membrane
        ctx.fillStyle = this.profile.secondary;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(ex, ey, wx, wy);
        ctx.lineTo(f1x, f1y);
        ctx.quadraticCurveTo((f1x+f2x)/2 - 10*scale*side, (f1y+f2y)/2, f2x, f2y);
        ctx.quadraticCurveTo((f2x+f3x)/2 - 10*scale*side, (f2y+f3y)/2, f3x, f3y);
        // Connect back to body
        ctx.quadraticCurveTo((sx+f3x)/2, (sy+f3y)/2, sx, sy);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Wing Bones
        ctx.strokeStyle = this.profile.highlight;
        ctx.lineWidth = this.config.baseLineWidth * 3 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(wx, wy);
        ctx.stroke();
        
        ctx.lineWidth = this.config.baseLineWidth * 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(f1x, f1y);
        ctx.moveTo(wx, wy);
        ctx.lineTo(f2x, f2y);
        ctx.moveTo(wx, wy);
        ctx.lineTo(f3x, f3y);
        ctx.stroke();
    }
    
    drawBirdWing(ctx, sx, sy, ex, ey, wx, wy, wristAngle, fingerLen, side, scale, flapPhase) {
        // Bird wing uses overlapping feather shapes rather than a membrane
        ctx.fillStyle = this.profile.primary;
        
        // Outer primary feathers
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(wx, wy);
        
        // Spread feathers based on flap phase
        const spread = Math.sin(flapPhase) * 0.1 * side;
        const tipX = wx + Math.cos(wristAngle + spread) * fingerLen;
        const tipY = wy + Math.sin(wristAngle + spread) * fingerLen;
        
        ctx.lineTo(tipX, tipY);
        
        // Curve back to body (trailing edge)
        ctx.quadraticCurveTo(ex, ey + 20*scale, sx, sy + 15*scale);
        ctx.fill();
        
        // Secondary feathers (overlay for 2.5D depth)
        ctx.fillStyle = this.profile.highlight;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.quadraticCurveTo(ex, ey + 10*scale, sx, sy + 5*scale);
        ctx.fill();
        
        // Wing bone highlight
        ctx.strokeStyle = this.profile.highlight;
        ctx.lineWidth = this.config.baseLineWidth * 2 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(wx, wy);
        ctx.stroke();
    }

    renderDebug(physics) {
        const ctx = this.ctx;
        ctx.fillStyle = "red";
        physics.segments.forEach(seg => {
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        if (this.preset.hasLegs) {
            physics.legs.forEach(leg => {
                ctx.strokeStyle = "green";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(leg.targetX, leg.targetY, 4, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = "blue";
                ctx.beginPath();
                ctx.arc(leg.jointX, leg.jointY, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
}
