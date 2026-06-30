class Particle extends GameObject {
  constructor(x, y, color) {
    super(x, y, 4, 4);
    this.name = 'Particle';
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 60;
    this.life = 1.0;
    this.maxLife = 0.8 + Math.random() * 0.6;
    this.color = color;
    this.size = 3 + Math.random() * 5;
    this.gravity = 280;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= 0.98;
    this.life -= dt / this.maxLife;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}
