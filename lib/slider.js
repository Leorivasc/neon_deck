class Slider {
    constructor(x, y, w = 30, h = 120, label, min = 0, max = 100, defaultValue = 50) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;

        this.min = min;
        this.max = max;
        this.value = defaultValue;

        this.isDragging = false;
    }

    draw() {
        push();

        // Define colors for min and max values
        const minColor = color('#ccc'); // Default gray
        const maxColor = color("#5d9e5fff"); // A pleasant green

        // Calculate the interpolation amount (0 to 1)
        const t = map(this.value, this.min, this.max, 0, 1);

        // Interpolate the color for the track
        const trackColor = lerpColor(minColor, maxColor, t);

        // Draw track
        stroke(0);
        fill(trackColor);
        rect(this.x, this.y, this.w, this.h, this.w / 2);

        // Calculate knob position
        const knobRadius = this.w / 2;
        const knobY = map(this.value, this.min, this.max, this.y + this.h - knobRadius, this.y + knobRadius);

        // Draw knob
        fill('#fff');
        stroke(0);
        ellipse(this.x + this.w / 2, knobY, this.w * 0.8);

        // Draw label
        fill(0);
        textSize(10);
        textAlign(CENTER, CENTER);
        noStroke();
        text(this.label, this.x + this.w / 2, this.y + this.h + 15);

        pop();
    }

    // This should be called from the p5.js mousePressed() function
    handleMouse(mx, my) {
        // Calculate knob's current screen position and its visible radius
        const knobTrackRadius = this.w / 2;
        const knobY = map(this.value, this.min, this.max, this.y + this.h - knobTrackRadius, this.y + knobTrackRadius);
        const knobX = this.x + this.w / 2;
        const knobDrawRadius = (this.w * 0.8) / 2;

        // Check if the mouse click is inside the knob's circle
        if (dist(mx, my, knobX, knobY) < knobDrawRadius) {
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
        const knobRadius = this.w / 2;
        const constrainedY = constrain(my, this.y + knobRadius, this.y + this.h - knobRadius);
        this.value = map(constrainedY, this.y + this.h - knobRadius, this.y + knobRadius, this.min, this.max);
    }

    // Query/Set methods
    getValue() {
        return this.value;
    }

    setValue(val) {
        this.value = constrain(val, this.min, this.max);
    }
}