class Switch {
    constructor(x, y, w = 30, h = 60) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isOn = false;
    }

    draw() {
        push();
        stroke(180);
        fill(this.isOn ? '#5d9e5fff' : '#ccc');
        rect(this.x, this.y, this.w, this.h, this.w / 2);

        let knobY = this.isOn ? this.w/2 : this.w/2+this.h - this.w;
        fill('#fff');
        noStroke();
        ellipse(this.x+this.w/2, this.y+knobY, this.w * 0.8);

        fill(0);
        textSize(12);
        textAlign(CENTER, CENTER);
        //text(this.isOn ? "ON" : "OFF", this.x + this.w / 2, this.y + this.h / 2);

        pop();
    }

    handleMouse(mx, my) {
        if (
            mx > this.x && mx < this.x + this.w &&
            my > this.y && my < this.y + this.h
        ) {
            this.isOn = !this.isOn;
        }
    }

    // Query methods
    getState() {
        return this.isOn;
    }

    isEnabled() {
        return this.isOn;
    }

    isDisabled() {
        return !this.isOn;
    }

    setState(val) {
        this.isOn = !!val;
    }
}