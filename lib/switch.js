class Switch {
    constructor(x, y, w = 30, h = 60, label) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isOn = false;
        this.label = label;
    }

    draw() {
        push();
        stroke(0);
        fill(this.isOn ? '#5d9e5fff' : '#ccc');
        rect(this.x, this.y, this.w, this.h, this.w / 2);

        let handleY = this.isOn ? this.w/2 : this.w/2+this.h - this.w;
        fill('#fff');
        stroke(0);
        ellipse(this.x+this.w/2, this.y+handleY, this.w * 0.8);

        fill(0);
        textSize(10);
        textAlign(CENTER, CENTER);
        noStroke();
        text(this.label, this.x + this.w / 2, this.y + this.h+15);

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