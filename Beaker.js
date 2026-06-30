// A decorative animated beaker drawn on the canvas background — pure flair.
// A decorative animated beaker drawn on the canvas background — pure flair.
// Now also supports holding "elements" the player drops into it, and reacting
// when the correct combination (per Equations.js) is formed.
class Beaker extends GameObject {
  constructor(x, y, w, h, hue) {
    super(x, y, w, h);
    this.name = 'Beaker';
    this.hue = hue;
    this.bubbleTimer = 0;
    this.bubbles = [];
    this.wobble = Math.random() * Math.PI * 2;

    // Interactive contents
    this.elements = [];        // [{ symbol, color, vx, vy, x, y, r }]
    this.flashTimer = 0;        // glow when an element lands
    this.reactingTimer = 0;     // overlay glow during a reaction
    this.shakeTimer = 0;
    this.product = null;        // last product label, e.g. "H₂O"
    this.productTimer = 0;
  }

  // Drop an element into this beaker. color is rgb hex.
  addElement(symbol, color) {
    this.elements.push({
      symbol,
      color,
      x: this.x + 8 + Math.random() * (this.width - 16),
      y: this.y + 6,
      vx: (Math.random() - 0.5) * 40,
      vy: 0,
      r: 12 + Math.random() * 4
    });
    this.flashTimer = 0.45;
    this.bubbleTimer = 0;
  }

  clearElements() {
    this.elements = [];
  }

  // Returns sorted symbol multiset, e.g. ["H","H","O"]
  getSymbols() {
    return this.elements.map(e => e.symbol).sort();
  }

  triggerReaction(productLabel) {
    this.reactingTimer = 0.9;
    this.shakeTimer = 0.5;
    this.product = productLabel;
    this.productTimer = 1.6;
    this.elements = [];
  }

  pointInside(px, py) {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  update(dt) {
    this.wobble += dt * 2;
    this.bubbleTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.reactingTimer > 0) this.reactingTimer -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.productTimer > 0) this.productTimer -= dt;

    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.15 + Math.random() * 0.4;
      this.bubbles.push({
        x: this.x + 10 + Math.random() * (this.width - 20),
        y: this.y + this.height - 12,
        r: 2 + Math.random() * 4,
        vy: -20 - Math.random() * 40,
        life: 1.0
      });
    }
    for (const b of this.bubbles) {
      b.y += b.vy * dt;
      b.life -= dt * 0.7;
    }
    this.bubbles = this.bubbles.filter(b => b.life > 0 && b.y > this.y + 4);

    // Physics for floating elements (settle to liquid line and bob)
    const liquidY = this.y + this.height * 0.45;
    for (const el of this.elements) {
      el.vy += 240 * dt;
      el.x += el.vx * dt;
      el.y += el.vy * dt;
      el.vx *= 0.97;
      // Floor: bottom of beaker
      const floor = this.y + this.height - el.r - 4;
      if (el.y > floor) { el.y = floor; el.vy *= -0.35; }
      // Buoyancy if below liquid line
      if (el.y > liquidY) {
        el.vy -= 180 * dt; // buoyant
        el.vy *= 0.92;
      }
      // Walls
      if (el.x < this.x + el.r + 2) { el.x = this.x + el.r + 2; el.vx *= -0.5; }
      if (el.x > this.x + this.width - el.r - 2) { el.x = this.x + this.width - el.r - 2; el.vx *= -0.5; }
    }
  }

  draw(ctx) {
    let x = this.x, y = this.y, w = this.width, h = this.height;
    const shake = this.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
    x += shake;

    ctx.save();
    ctx.globalAlpha = 0.65;

    // Reactive glow ring
    if (this.reactingTimer > 0) {
      const ringAlpha = Math.min(1, this.reactingTimer * 1.5);
      ctx.save();
      ctx.globalAlpha = ringAlpha * 0.8;
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
      ctx.restore();
    }

    // Glass body
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = this.flashTimer > 0
      ? `rgba(255,255,180,${0.5 + this.flashTimer})`
      : 'rgba(180,220,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    // Liquid with wobble
    const liquidY = y + h * 0.45 + Math.sin(this.wobble) * 3;
    const grad = ctx.createLinearGradient(0, liquidY, 0, y + h);
    const hue = this.reactingTimer > 0 ? 50 : this.hue;
    grad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.7)`);
    grad.addColorStop(1, `hsla(${hue}, 80%, 35%, 0.85)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + 1, liquidY);
    for (let i = 0; i <= w; i += 4) {
      const wave = Math.sin(this.wobble + i * 0.15) * 2;
      ctx.lineTo(x + i, liquidY + wave);
    }
    ctx.lineTo(x + w - 1, y + h - 1);
    ctx.lineTo(x + 1, y + h - 1);
    ctx.closePath();
    ctx.fill();

    // Bubbles
    for (const b of this.bubbles) {
      ctx.globalAlpha = 0.55 * b.life;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 4, y + 8, 3, h - 16);

    // Element atoms inside
    ctx.globalAlpha = 1;
    for (const el of this.elements) {
      const ex = el.x + shake, ey = el.y;
      ctx.save();
      ctx.shadowColor = el.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = el.color;
      ctx.beginPath();
      ctx.arc(ex, ey, el.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(el.r * 1.1)}px Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.symbol, ex, ey + 1);
      ctx.restore();
    }

    // Floating product label after a reaction
    if (this.productTimer > 0 && this.product) {
      const t = this.productTimer / 1.6;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.font = 'bold 22px Segoe UI, sans-serif';
      ctx.fillStyle = '#ffe066';
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      const py = y - 14 - (1 - t) * 28;
      ctx.fillText(this.product, x + w / 2, py);
      ctx.restore();
    }

    ctx.restore();
  }
}

