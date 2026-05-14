/**
 * Reusable p5 text list box with fixed-height rows, truncation, and optional
 * scrollbar. It is intentionally small so playlist, logs, and command-style
 * panels can share the same visual primitive later.
 */
class TextListBox {
    /**
     * Creates a reusable canvas list box.
     * @param {number} x - Left coordinate in canvas space.
     * @param {number} y - Top coordinate in canvas space.
     * @param {number} w - Box width.
     * @param {number} h - Box height.
     * @param {Object} options - Row sizing, font, scrollbar, and autoscroll options.
     */
    constructor(x, y, w, h, options = {}) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.items = [];
        this.itemHeight = options.itemHeight || 18;
        this.fontSize = options.fontSize || 11;
        this.scrollbarWidth = options.scrollbarWidth || 16;
        this.paddingX = options.paddingX || 6;
        this.selectedIndex = options.selectedIndex ?? -1;
        this.autoStickToBottom = options.autoStickToBottom === true;
        this.scrollOffset = 0;
        this.scrollbarDragging = false;
        this.scrollbarY = 0;
        this.scrollbarHeight = 0;
        this.scrollbarDragOffset = 0;
        this.lastItemCount = 0;
        // True after the user scrolls away from the bottom. New items should
        // not force the view downward while the user is reading older lines.
        this.userPinned = false;
    }

    /**
     * Updates the list rectangle and keeps the current scroll offset valid.
     */
    setBounds(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.clampScrollOffset();
    }

    /**
     * Replaces the visible item model. If bottom-stick is enabled and the user
     * has not pinned history, new rows keep the list scrolled to the bottom.
     */
    setItems(items) {
        const wasAtBottom = this.isAtBottom();
        this.items = Array.isArray(items) ? items : [];
        // A log-like list should follow new rows only while the user is already
        // at the bottom. Once they scroll upward, userPinned preserves history.
        if (this.autoStickToBottom && !this.userPinned && (this.items.length !== this.lastItemCount || wasAtBottom)) {
            this.scrollToBottom();
        } else {
            this.clampScrollOffset();
        }
        // Reaching the bottom re-arms autoscroll for future appended rows.
        if (this.isAtBottom()) {
            this.userPinned = false;
        }
        this.lastItemCount = this.items.length;
    }

    /**
     * Returns the number of whole rows that can be drawn in the box.
     */
    getVisibleCount() {
        return Math.max(1, Math.floor(this.h / this.itemHeight));
    }

    /**
     * Returns the largest valid first-row index for the current item count.
     */
    getMaxScrollOffset() {
        return Math.max(0, this.items.length - this.getVisibleCount());
    }

    /**
     * Keeps scrollOffset inside the legal range after resize or data changes.
     */
    clampScrollOffset() {
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.getMaxScrollOffset()));
    }

    /**
     * Moves the viewport to the newest rows.
     */
    scrollToBottom() {
        this.scrollOffset = this.getMaxScrollOffset();
    }

    /**
     * Reports whether the newest row is currently visible.
     */
    isAtBottom() {
        return this.scrollOffset >= this.getMaxScrollOffset();
    }

    /**
     * Draws the box background, visible rows, selection highlight, and scrollbar.
     */
    draw() {
        push();
        noStroke();
        fill(UI.surface[0], UI.surface[1], UI.surface[2], 238);
        rect(this.x, this.y, this.w, this.h, 4);

        this.clampScrollOffset();
        const visibleCount = this.getVisibleCount();
        const maxTextWidth = Math.max(20, this.w - this.scrollbarWidth - this.paddingX * 2);

        textSize(this.fontSize);
        textAlign(LEFT, TOP);

        // Draw only rows inside the viewport. This keeps rendering bounded even
        // if the backing log/list contains many more entries.
        for (let i = 0; i < visibleCount; i++) {
            const itemIndex = i + this.scrollOffset;
            if (itemIndex >= this.items.length) {
                break;
            }

            const item = this.normalizeItem(this.items[itemIndex]);
            const rowY = this.y + i * this.itemHeight;
            if (itemIndex === this.selectedIndex) {
                fill(UI.line[0], UI.line[1], UI.line[2], 36);
                rect(this.x, rowY, this.w - this.scrollbarWidth, this.itemHeight);
            }

            fill(item.color || UI.text);
            text(this.truncateText(item.text, maxTextWidth), this.x + this.paddingX, rowY + 4);
        }

        this.drawScrollbar(visibleCount);
        pop();
    }

    /**
     * Converts string items and object items into one drawing shape.
     */
    normalizeItem(item) {
        if (typeof item === "string") {
            return { text: item, color: UI.text };
        }

        return {
            text: String(item?.text || ""),
            color: item?.color || UI.text
        };
    }

    /**
     * Truncates text to fit the row width and appends an ellipsis when needed.
     */
    truncateText(value, maxWidth) {
        let textToDisplay = String(value || "");
        let trimmed = false;

        while (textWidth(textToDisplay) > maxWidth && textToDisplay.length > 0) {
            textToDisplay = textToDisplay.slice(0, -1);
            trimmed = true;
        }

        return trimmed ? textToDisplay.trim() + "..." : textToDisplay;
    }

    /**
     * Draws a playlist/filebrowser-style scrollbar for the current viewport.
     */
    drawScrollbar(visibleCount) {
        if (this.items.length <= visibleCount) {
            stroke(UI.line[0], UI.line[1], UI.line[2], 70);
            line(this.x + this.w - this.scrollbarWidth, this.y, this.x + this.w - this.scrollbarWidth, this.y + this.h);
            noStroke();
            return;
        }

        // Scrollbar position is derived from the current first visible row.
        this.scrollbarHeight = Math.max((visibleCount / this.items.length) * this.h, 20);
        this.scrollbarY = this.y + (this.scrollOffset / this.getMaxScrollOffset()) * (this.h - this.scrollbarHeight);
        this.scrollbarY = Math.max(this.y, Math.min(this.scrollbarY, this.y + this.h - this.scrollbarHeight));

        fill(UI.line[0], UI.line[1], UI.line[2], 190);
        rect(this.x + this.w - this.scrollbarWidth + 5, this.scrollbarY, 7, this.scrollbarHeight, 4);

        stroke(UI.line[0], UI.line[1], UI.line[2], 70);
        line(this.x + this.w - this.scrollbarWidth, this.y, this.x + this.w - this.scrollbarWidth, this.y + this.h);
        noStroke();
    }

    /**
     * Tests whether a point is inside the list box.
     */
    contains(mx, my) {
        return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
    }

    /**
     * Handles mouse-wheel scrolling. Scrolling away from the bottom pins the
     * viewport to history until the user returns to the newest rows.
     */
    handleWheel(delta) {
        this.scrollOffset += delta > 0 ? 1 : -1;
        this.clampScrollOffset();
        this.userPinned = !this.isAtBottom();
    }

    /**
     * Starts scrollbar dragging. Clicking anywhere in the scrollbar column
     * jumps the thumb there and begins a drag, which is easier on touch screens.
     */
    handleMousePressed(mx, my) {
        if (!this.contains(mx, my) || this.items.length <= this.getVisibleCount()) {
            return false;
        }

        if (mx >= this.x + this.w - this.scrollbarWidth && mx <= this.x + this.w) {
            this.scrollbarDragging = true;
            // If the user clicks outside the thumb but inside the track, center
            // the thumb on that click before converting it to a scroll offset.
            this.scrollbarDragOffset = my >= this.scrollbarY && my <= this.scrollbarY + this.scrollbarHeight
                ? my - this.scrollbarY
                : this.scrollbarHeight / 2;
            this.handleMouseDrag(mx, my);
            return true;
        }

        return false;
    }

    /**
     * Updates the scrollbar thumb and converts its position into a row offset.
     */
    handleMouseDrag(mx, my) {
        if (!this.scrollbarDragging) {
            return false;
        }

        const maxScrollY = this.y + this.h - this.scrollbarHeight;
        this.scrollbarY = Math.max(this.y, Math.min(my - this.scrollbarDragOffset, maxScrollY));
        this.scrollOffset = Math.round(((this.scrollbarY - this.y) / Math.max(1, this.h - this.scrollbarHeight)) * this.getMaxScrollOffset());
        this.clampScrollOffset();
        this.userPinned = !this.isAtBottom();
        return true;
    }

    /**
     * Ends an active scrollbar drag.
     */
    handleMouseRelease() {
        this.scrollbarDragging = false;
    }
}
