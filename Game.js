// Maps element symbols → display color (used by palette and dropped atoms).
const ELEMENT_COLORS = {
  H: '#7ee8d4', O: '#ff5c6c', N: '#9aa6ff', C: '#3a3a3a',
  Na: '#ffd166', Cl: '#5cd66e', Fe: '#b87333', Al: '#c0c0c0',
  Mg: '#f0a0ff', K: '#ad7af0', P: '#ff9933', Zn: '#9ad0ff'
};

// Library of small "reactions" — recipes the player can mix in a beaker.
// Sorted symbol multiset → product label + color.
const MIX_RECIPES = [
  { ingredients: ['H','H','O'], product: 'H₂O',  hue: 200, score: 60, hint: 'Water!' },
  { ingredients: ['H','H','O','O'], product: '2 H₂O', hue: 200, score: 80, hint: 'Balanced water!' },
  { ingredients: ['H','N','N','N'], product: 'NH₃', hue: 280, score: 80, hint: 'Ammonia synthesized!' },
  { ingredients: ['Cl','H'], product: 'HCl', hue: 100, score: 50, hint: 'Hydrochloric acid!' },
  { ingredients: ['Cl','Na'], product: 'NaCl', hue: 60, score: 50, hint: 'Table salt!' },
  { ingredients: ['Mg','O'], product: 'MgO', hue: 320, score: 50, hint: 'Magnesium oxide!' },
  { ingredients: ['Fe','O','O'], product: 'Fe₂O₃', hue: 30, score: 70, hint: 'Rust forming!' },
  { ingredients: ['C','O','O'], product: 'CO₂', hue: 340, score: 60, hint: 'Carbon dioxide!' }
];

// Wires Equations.js helpers (Equations_pickRandom, Equations_buildChoices,
// Equations_formatFormula) into the round/question lifecycle below.
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.entities = [];
    this.particles = [];
    this.beakers = [];
    this.lastTime = 0;

    // Game state
    this.state = 'menu';
    this.totalRounds = 10;
    this.round = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correctCount = 0;
    this.timeLeft = 15;
    this.maxTime = 15;
    this.questions = [];
    this.currentQ = null;
    this.currentChoices = [];
    this.starfield = [];

    // Drag state for element palette → beaker
    this.drag = null; // { symbol, color, x, y, fromPaletteEl }

    // DOM refs
    this.equationEl = document.getElementById('equation');
    this.hintEl = document.getElementById('hint');
    this.choicesEl = document.getElementById('choicesArea');
    this.feedbackEl = document.getElementById('feedback');
    this.roundValEl = document.getElementById('roundVal');
    this.scoreValEl = document.getElementById('scoreVal');
    this.streakValEl = document.getElementById('streakVal');
    this.timerValEl = document.getElementById('timerVal');
    this.timerItem = this.timerValEl.parentElement;
    this.startScreen = document.getElementById('startScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.finalScoreEl = document.getElementById('finalScore');
    this.finalStatsEl = document.getElementById('finalStats');
    this.paletteEl = document.getElementById('palette');

    document.getElementById('startBtn').addEventListener('click', () => this.beginGame());
    document.getElementById('replayBtn').addEventListener('click', () => this.beginGame());

    this.buildPalette();
    this.setupDragInput();
    this.setupResize();
    this.setupBackground();
    this.start();
  }

  buildPalette() {
    if (!this.paletteEl) return;
    this.paletteEl.innerHTML = '';
    const symbols = ['H','O','N','C','Na','Cl','Fe','Mg'];
    for (const s of symbols) {
      const btn = document.createElement('div');
      btn.className = 'palette-item';
      btn.dataset.symbol = s;
      btn.style.background = ELEMENT_COLORS[s] || '#888';
      btn.textContent = s;
      btn.title = `Drag ${s} into a beaker`;
      // Pointer + click both work
      btn.addEventListener('pointerdown', (e) => this.startDrag(e, s, btn));
      btn.addEventListener('click', (e) => {
        // Click-to-drop into closest beaker (mobile-friendly fallback)
        if (this.drag) return; // pointerdown handled drag already
        this.dropSymbolInClosestBeaker(s);
      });
      this.paletteEl.appendChild(btn);
    }
  }

  setupDragInput() {
    window.addEventListener('pointermove', (e) => this.onDragMove(e));
    window.addEventListener('pointerup', (e) => this.endDrag(e));
    window.addEventListener('pointercancel', (e) => this.endDrag(e));
  }

  startDrag(e, symbol, sourceEl) {
    e.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.background = ELEMENT_COLORS[symbol] || '#888';
    ghost.textContent = symbol;
    document.body.appendChild(ghost);
    this.drag = { symbol, color: ELEMENT_COLORS[symbol] || '#888', ghost, sourceEl };
    this.moveGhost(e.clientX, e.clientY);
  }

  onDragMove(e) {
    if (!this.drag) return;
    this.moveGhost(e.clientX, e.clientY);
  }

  moveGhost(cx, cy) {
    if (!this.drag) return;
    this.drag.ghost.style.left = (cx - 22) + 'px';
    this.drag.ghost.style.top  = (cy - 22) + 'px';
  }

  endDrag(e) {
    if (!this.drag) return;
    const { symbol, color, ghost } = this.drag;
    // Locate canvas-local coords
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const target = this.getBeakerAt(cx, cy);
    if (target) {
      target.addElement(symbol, color);
      this.spawnParticlesAt(target.x + target.width / 2, target.y + 8, color, 12);
      this.checkBeakerReaction(target);
    }
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    this.drag = null;
  }

  dropSymbolInClosestBeaker(symbol) {
    if (!this.beakers.length) return;
    // pick the beaker with fewest elements (encourages spreading)
    const target = this.beakers.slice().sort((a,b) => a.elements.length - b.elements.length)[0];
    if (!target) return;
    const color = ELEMENT_COLORS[symbol] || '#888';
    target.addElement(symbol, color);
    this.spawnParticlesAt(target.x + target.width / 2, target.y + 8, color, 10);
    this.checkBeakerReaction(target);
  }

  getBeakerAt(x, y) {
    for (const b of this.beakers) {
      if (b.pointInside(x, y)) return b;
    }
    // Loose hit — within 30px
    let best = null, bestD = 30 * 30;
    for (const b of this.beakers) {
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  // Try to match the beaker's current contents against a recipe.
  checkBeakerReaction(beaker) {
    const syms = beaker.getSymbols().join(',');
    const recipe = MIX_RECIPES.find(r => r.ingredients.slice().sort().join(',') === syms);
    if (recipe) {
      beaker.triggerReaction(recipe.product);
      // Big particle burst inside the beaker
      const cx = beaker.x + beaker.width / 2;
      const cy = beaker.y + beaker.height * 0.45;
      this.spawnParticlesAt(cx, cy, '#ffe066', 36);
      this.spawnParticlesAt(cx, cy, `hsl(${recipe.hue}, 80%, 60%)`, 24);
      // Bonus score during play, free-play points otherwise
      this.score += recipe.score;
      this.showFeedback(`+${recipe.score}  ${recipe.hint}`, '#ffe066');
      this.updateHUD();
    } else if (beaker.elements.length >= 6) {
      // Overflow → fizzle + clear so the player can retry
      this.spawnParticlesAt(beaker.x + beaker.width/2, beaker.y + 10, '#ff5c6c', 16);
      beaker.clearElements();
      this.showFeedback('💨 Fizzled — try again', '#ff9b9b');
    }
  }

  setupResize() {
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = this.canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      this.canvas.width = Math.floor(r.width * dpr);
      this.canvas.height = Math.floor(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cssW = r.width;
      this.cssH = r.height;
      this.layoutBeakers();
    };
    window.addEventListener('resize', fit);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(this.canvas);
    fit();
  }

  setupBackground() {
    for (let i = 0; i < 60; i++) {
      this.starfield.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
    this.layoutBeakers();
  }

  layoutBeakers() {
    this.beakers = [];
    if (!this.cssW || !this.cssH) return;
    const count = Math.max(3, Math.min(4, Math.floor(this.cssW / 280)));
    const totalW = this.cssW * 0.85;
    const gap = totalW / count;
    const w = Math.min(110, gap * 0.55);
    const h = Math.min(170, this.cssH * 0.32);
    const startX = (this.cssW - gap * count) / 2 + (gap - w) / 2;
    const y = this.cssH - h - 110; // leave space for palette
    for (let i = 0; i < count; i++) {
      const hue = 140 + (i * 60) % 220;
      this.beakers.push(new Beaker(startX + gap * i, y, w, h, hue));
    }
    this.entities = this.beakers.slice();
  }

  beginGame() {
    this.state = 'playing';
    this.round = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correctCount = 0;
    this.questions = Equations_pickRandom(this.totalRounds);
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    if (this.paletteEl) this.paletteEl.classList.remove('hidden');
    this.nextRound();
  }

  nextRound() {
    if (this.round >= this.totalRounds) {
      this.endGame();
      return;
    }
    this.round++;
    this.currentQ = this.questions[this.round - 1];
    this.currentChoices = Equations_buildChoices(this.currentQ.correct);
    this.timeLeft = this.maxTime;
    this.state = 'playing';
    // Clear leftover beaker contents at the start of each round
    for (const b of this.beakers) b.clearElements();
    this.renderEquation();
    this.renderChoices();
    this.updateHUD();
    this.timerItem.classList.remove('danger');
  }

  renderEquation() {
    const q = this.currentQ;
    let html = '';
    q.reactants.forEach((part, i) => {
      html += `<span class="coef-slot">?</span><span class="formula">${Equations_formatFormula(part)}</span>`;
      if (i < q.reactants.length - 1) html += `<span class="plus">+</span>`;
    });
    html += `<span class="arrow">→</span>`;
    q.products.forEach((part, i) => {
      html += `<span class="coef-slot">?</span><span class="formula">${Equations_formatFormula(part)}</span>`;
      if (i < q.products.length - 1) html += `<span class="plus">+</span>`;
    });
    this.equationEl.innerHTML = html;
    this.hintEl.textContent = `💡 ${q.hint} — or drag elements into a beaker for bonus points!`;
  }

  renderChoices() {
    this.choicesEl.innerHTML = '';
    this.currentChoices.forEach((coefs) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = coefs.join(' : ');
      btn.addEventListener('click', () => this.handleAnswer(coefs, btn));
      this.choicesEl.appendChild(btn);
    });
  }

  revealCorrectInEquation() {
    const q = this.currentQ;
    const slots = this.equationEl.querySelectorAll('.coef-slot');
    q.correct.forEach((c, i) => {
      if (slots[i]) slots[i].textContent = c;
    });
  }

  handleAnswer(coefs, btn) {
    if (this.state !== 'playing') return;
    const correct = this.currentQ.correct;
    const isRight = coefs.length === correct.length && coefs.every((v, i) => v === correct[i]);
    this.state = 'reveal';
    this.choicesEl.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

    if (isRight) {
      btn.classList.add('correct');
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.correctCount++;
      const base = 100;
      const timeBonus = Math.round(this.timeLeft * 10);
      const streakBonus = this.streak >= 3 ? this.streak * 25 : 0;
      const gained = base + timeBonus + streakBonus;
      this.score += gained;
      this.showFeedback(`+${gained}  ${this.streak >= 3 ? '🔥 STREAK x' + this.streak : '✓ CORRECT'}`,
        this.streak >= 3 ? '#ffaa3a' : '#5cd66e');
      this.spawnParticles('#5cd66e', 30);
      // Reward all beakers with a celebratory reaction visual
      for (const bk of this.beakers) {
        bk.triggerReaction('✓');
      }
      this.revealCorrectInEquation();
    } else {
      btn.classList.add('wrong');
      this.choicesEl.querySelectorAll('.choice-btn').forEach(b => {
        if (b.textContent === correct.join(' : ')) b.classList.add('correct');
      });
      this.streak = 0;
      this.showFeedback('✗ WRONG', '#ff5c6c');
      this.spawnParticles('#ff5c6c', 18);
      this.revealCorrectInEquation();
    }

    this.updateHUD();
    setTimeout(() => this.nextRound(), 1600);
  }

  handleTimeout() {
    if (this.state !== 'playing') return;
    this.state = 'reveal';
    this.streak = 0;
    this.choicesEl.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === this.currentQ.correct.join(' : ')) b.classList.add('correct');
    });
    this.showFeedback('⏰ TIME!', '#ffe066');
    this.spawnParticles('#ffe066', 14);
    this.revealCorrectInEquation();
    this.updateHUD();
    setTimeout(() => this.nextRound(), 1600);
  }

  showFeedback(text, color) {
    this.feedbackEl.textContent = text;
    this.feedbackEl.style.color = color;
    this.feedbackEl.classList.remove('show');
    void this.feedbackEl.offsetWidth;
    this.feedbackEl.classList.add('show');
    setTimeout(() => this.feedbackEl.classList.remove('show'), 1200);
  }

  spawnParticles(color, count) {
    if (!this.cssW) return;
    const cx = this.cssW / 2;
    const cy = this.cssH * 0.45;
    this.spawnParticlesAt(cx, cy, color, count);
  }

  spawnParticlesAt(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  endGame() {
    this.state = 'gameover';
    this.finalScoreEl.textContent = this.score;
    const accuracy = Math.round((this.correctCount / this.totalRounds) * 100);
    let rank = '🧪 Apprentice Chemist';
    if (this.score >= 2500) rank = '🏆 Master Alchemist';
    else if (this.score >= 1800) rank = '⚗️ Expert Chemist';
    else if (this.score >= 1200) rank = '🔬 Lab Technician';
    this.finalStatsEl.innerHTML =
      `<div>${rank}</div>` +
      `<div>Correct: <b>${this.correctCount}/${this.totalRounds}</b> (${accuracy}%)</div>` +
      `<div>Best Streak: <b>${this.bestStreak}</b> 🔥</div>`;
    this.gameOverScreen.classList.remove('hidden');
    if (this.paletteEl) this.paletteEl.classList.add('hidden');
  }

  updateHUD() {
    this.roundValEl.textContent = `${this.round}/${this.totalRounds}`;
    this.scoreValEl.textContent = this.score;
    this.streakValEl.textContent = this.streak;
    this.timerValEl.textContent = this.timeLeft.toFixed(1);
  }

  update(dt) {
    if (this.state === 'playing') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 5) this.timerItem.classList.add('danger');
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.handleTimeout();
      }
      this.timerValEl.textContent = this.timeLeft.toFixed(1);
    }

    for (const b of this.beakers) b.update(dt);
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.isDead());
  }

  draw() {
    const ctx = this.ctx;
    if (!this.cssW) return;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    const t = performance.now() / 1000;
    for (const s of this.starfield) {
      const alpha = 0.3 + Math.sin(t * s.speed + s.phase) * 0.3;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = '#7ee8d4';
      ctx.beginPath();
      ctx.arc(s.x * this.cssW, s.y * this.cssH * 0.7, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const b of this.beakers) b.draw(ctx);
    for (const p of this.particles) p.draw(ctx);
  }

  getObjectAt(canvasX, canvasY) {
    for (const entity of this.entities) {
      const b = entity.getBounds();
      if (canvasX >= b.x && canvasX <= b.x + b.width &&
          canvasY >= b.y && canvasY <= b.y + b.height) {
        return entity;
      }
    }
    return null;
  }

  start() {
    const gameLoop = (timestamp) => {
      const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000 || 0);
      this.lastTime = timestamp;
      this.update(dt);
      this.draw();
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }
}

