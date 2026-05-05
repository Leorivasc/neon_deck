/**
 * Vertical Slider Component
 * 
 * This class defines a vertical slider UI component that can be used in p5.js sketches.
 * The slider allows users to select a value within a specified range by dragging a handle along a vertical track.
 * The track color interpolates between two specified colors based on the current value.
 * 
 * Usage:
 * const slider = new SliderV(x, y, width, height, label, min, max, defaultValue, color1, color2);
 */
class SliderV {
    // Constructor
    /**
     * 
     * @param {number} x - The x-coordinate of the slider's top-left corner.
     * @param {number} y - The y-coordinate of the slider's top-left corner.
     * @param {number} w - The width of the slider.
     * @param {number} h - The height of the slider.
     * @param {string} label - The label for the slider.
     * @param {number} min - The minimum value of the slider.
     * @param {number} max - The maximum value of the slider.
     * @param {number} defaultValue - The default value of the slider.
     * @param {string} color1 - The color representing the minimum value.
     * @param {string} color2 - The color representing the maximum value.
     * @param {object} [opts] - Optional settings: { wheelSteps, wheelSensitivity }.
     */
    constructor(x, y, w = 30, h = 120, label, min = 0, max = 100, defaultValue = 50, color1, color2, opts = {}) {
        this.x = x; 
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;
        this.color1 = color1 || '#cccccc';
        this.color2 = color2 || '#00ff00';

        this.min = min;
        this.max = max;
        this.value = defaultValue;

        this.isDragging = false;

        // Wheel behaviour configuration
        // wheelSteps: how many fractional steps the wheel moves across the full range (higher -> smaller increments)
        // wheelSensitivity: multiplier to tune speed of wheel reaction
        this.wheelSteps = opts.wheelSteps || 100;
        this.wheelSensitivity = opts.wheelSensitivity || 1;
    }

    draw() {
        push();

        // Define colors for min and max values
        const minColor = color(this.color1);//color('#ccc'); // Default gray
        const maxColor = color(this.color2);//color(0,255,0); //color("#5d9e5fff"); // A pleasant green

        // Calculate the interpolation amount (0 to 1)
        const t = map(this.value, this.min, this.max, 0, 1);

        // Interpolate the color for the track
        const trackColor = lerpColor(minColor, maxColor, t);

        // Draw track
        noStroke();
        fill(3, 7, 14, 210);
        rect(this.x - 5, this.y - 5, this.w + 10, this.h + 10, 6);
        stroke(0, 229, 255, 90);
        fill(14, 23, 38);
        rect(this.x, this.y, this.w, this.h, this.w / 2);

        noStroke();
        fill(trackColor);
        const activeHeight = map(this.value, this.min, this.max, 0, this.h);
        rect(this.x, this.y + this.h - activeHeight, this.w, activeHeight, this.w / 2);

        // Calculate handle position
        const handleRadius = this.w / 2;
        const handleY = map(this.value, this.min, this.max, this.y + this.h - handleRadius, this.y + handleRadius);

        // Draw handle
        fill(237, 247, 255);
        stroke(0, 229, 255);
        strokeWeight(1);
        //elongated rectangle for handle
        rectMode(RADIUS);
        rect(this.x+this.w/2, handleY, this.w*0.7, Math.max(4, this.w/3-4), this.w / 5);
        
        //circle for handle
        //ellipse(this.x + this.w / 2, handleY, this.w * 0.8);

        //three vertical lines inside the handle to indicate grip
        //stroke(0);
        //strokeWeight(1);
        //line(this.x + this.w / 2 - 5, handleY - 2, this.x + this.w / 2 - 5, handleY + 2);
        //line(this.x + this.w / 2, handleY - 2, this.x + this.w / 2, handleY + 2);
        //line(this.x + this.w / 2 + 5, handleY - 2, this.x + this.w / 2 + 5, handleY + 2);


        // Reset rect mode
        rectMode(CORNER);

        // Draw label
        fill(237, 247, 255);
        textSize(10);
        textAlign(CENTER, CENTER);
        noStroke();
        text(this.label, this.x + this.w / 2, this.y + this.h + 15);

        pop();
    }

    // This should be called from the p5.js mousePressed() function
    handleMouse(mx, my) {
        // Click anywhere on the track to jump there, then drag from that point.
        if (this.isMouseOver(mx, my)) {
            this.isDragging = true;
            this._updateValueFromMouse(my); // Snap to precise mouse Y on click for responsiveness
        }
    }

    // This should be called from the p5.js mouseDragged() function
    mouseDragged(mx, my) {
        if (this.isDragging) {
            this._updateValueFromMouse(my);
        }
    }

    // This should be called from the p5.js mouseReleased() function
    mouseReleased() {
        this.isDragging = false;
    }

    _updateValueFromMouse(my) {
        const handleRadius = this.w / 2;
        const constrainedY = constrain(my, this.y + handleRadius, this.y + this.h - handleRadius);
        this.value = map(constrainedY, this.y + this.h - handleRadius, this.y + handleRadius, this.min, this.max);
    }

    /**
     * Handle mouse wheel events to change slider value.
     * Call this from your sketch's global mouseWheel(event) handler:
     *   function mouseWheel(event) { mySlider.handleWheel(event); }
     *
     * The slider only reacts when the pointer is over the slider bounds.
     * @param {WheelEvent|Object} event - The wheel event passed by p5 (has delta or deltaY).
     */
    handleWheel(event) {
        // Use current global mouseX/mouseY from p5 to detect hovering
        if (!this.isMouseOver(mouseX, mouseY)) return;

        const deltaY = (event.deltaY !== undefined) ? event.deltaY : (event.delta || 0);

        // Normalize delta to a sensible change amount:
        // positive deltaY usually means scrolling down (want to decrease slider),
        // negative means scrolling up (increase slider).
        const range = this.max - this.min;
        const unit = range / this.wheelSteps; // base unit per wheel "step"
        const change = - (deltaY / 100) * unit * this.wheelSensitivity; // scale deltaY

        this.setValue(this.value + change);

        // Prefer to prevent page scroll when interacting with slider
        if (event.preventDefault) event.preventDefault();
        return false;
    }

    /**
     * Returns true if given coordinate (or current mouse) is over slider area.
     * @param {number} [mx=mouseX] - x coordinate to test.
     * @param {number} [my=mouseY] - y coordinate to test.
     */
    isMouseOver(mx = mouseX, my = mouseY) {
        return mx >= this.x && mx <= (this.x + this.w) && my >= this.y && my <= (this.y + this.h);
    }

    // Query/Set methods
    getValue() {
        return this.value;
    }

    setValue(val) {
        this.value = constrain(val, this.min, this.max);
    }
}
