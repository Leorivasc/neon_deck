/**
 * Horizontal Slider Component
 * 
 * Class representing a horizontal slider UI component.
 * This slider allows users to select a value within a specified range by dragging a handle along a horizontal track.
 * The track color interpolates between two specified colors based on the current value.
 * 
 * Usage:
 * const slider = new SliderH(x, y, width, height, label, min, max, defaultValue, color1, color2, opts);
 * Call slider.handleWheel(event) from your sketch's global mouseWheel handler when needed.
 */
class SliderH {
    /**
     * Creates a new SliderH instance.
     * @param {number} x - The x-coordinate of the slider.
     * @param {number} y - The y-coordinate of the slider.
     * @param {number} w - The width of the slider.
     * @param {number} h - The height of the slider.
     * @param {string} label - The label for the slider.
     * @param {number} min - The minimum value of the slider.
     * @param {number} max - The maximum value of the slider.
     * @param {number} defaultValue - The default value of the slider.
     * @param {string} color1 - Color for minimum value.
     * @param {string} color2 - Color for maximum value.
     * @param {object} [opts] - Optional settings: { wheelSteps, wheelSensitivity }.
     */
    constructor(x, y, w = 120, h = 30, label, min = 0, max = 100, defaultValue = 50, color1 = '#cccccc', color2 = '#5d9e5fff', opts = {}) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;
        this.color1 = color1;
        this.color2 = color2;

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

    /**
     * Draws the slider on the canvas.
     */
    draw() {
        push();

        // Define colors for min and max values
        const minColor = color(this.color1);
        const maxColor = color(this.color2);

        // Calculate the interpolation amount (0 to 1)
        const t = map(this.value, this.min, this.max, 0, 1);

        // Interpolate the color for the track
        const trackColor = lerpColor(minColor, maxColor, t);

        // Draw track
        stroke(0);
        fill(trackColor);
        rect(this.x, this.y, this.w, this.h, this.h / 2);

        // Calculate handle position
        const handleRadius = this.h / 2;
        const handleX = map(this.value, this.min, this.max, this.x + handleRadius, this.x + this.w - handleRadius);

        // Draw handle
        fill('#fff');
        stroke(0);
        ellipse(handleX, this.y + this.h / 2, this.h * 0.8);

        // Draw label
        fill(0);
        textSize(10);
        textAlign(CENTER, CENTER);
        noStroke();
        text(this.label, this.x + this.w / 2, this.y + this.h + 15);

        pop();
    }

    /**
     * Handles mouse pressed events.
     * @param {number} mx - The x-coordinate of the mouse.
     * @param {number} my - The y-coordinate of the mouse.
     */
    handleMouse(mx, my) {
        // Click anywhere on the track to jump there, then drag from that point.
        if (this.isMouseOver(mx, my)) {
            this.isDragging = true;
            this._updateValueFromMouse(mx); // Snap to precise mouse X on click for responsiveness
        }
    }

    /**
     * Handles mouse dragged events.
     * @param {number} mx - The x-coordinate of the mouse.
     * @param {number} my - The y-coordinate of the mouse.
     */
    mouseDragged(mx, my) {
        if (this.isDragging) {
            this._updateValueFromMouse(mx);
        }
    }

    /**
     * Handles mouse released events.
     */
    mouseReleased() {
        this.isDragging = false;
    }

    /**
     * Updates the slider value based on the mouse position.
     * @param {number} mx - The x-coordinate of the mouse.
     */
    _updateValueFromMouse(mx) {
        const handleRadius = this.h / 2;
        const constrainedX = constrain(mx, this.x + handleRadius, this.x + this.w - handleRadius);
        this.value = map(constrainedX, this.x + handleRadius, this.x + this.w - handleRadius, this.min, this.max);
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

        // Prefer horizontal delta if available, otherwise use vertical delta (typical mouse wheel)
        const rawDelta = (event.deltaX !== undefined && Math.abs(event.deltaX) > 0) ? event.deltaX
                         : (event.deltaY !== undefined ? event.deltaY
                         : (event.delta || 0));

        // Normalize delta to a sensible change amount:
        // positive rawDelta usually means scrolling right/down (we invert to match intuitive direction)
        const range = this.max - this.min;
        const unit = range / this.wheelSteps; // base unit per wheel "step"
        const change = - (rawDelta / 100) * unit * this.wheelSensitivity; // scale delta

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

    /**
     * Gets the current value of the slider.
     * @returns {number} The current value.
     */
    getValue() {
        return this.value;
    }

    /**
     * Sets the value of the slider.
     * @param {number} val - The new value.
     */
    setValue(val) {
        this.value = constrain(val, this.min, this.max);
    }
}
