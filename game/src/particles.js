// Particles for Nightshift: The Meridian Vault.
// Small feedback bursts: shard sparkles, noise rings, detection pops
// and footstep dust. Pure canvas, no assets.

export class Particles {
  constructor() {
    this.list = [];
  }

  burst(x, y, color, count = 14, speed = 90) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        kind: 'dot',
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 2 + Math.random() * 2.5,
        color,
      });
    }
  }

  ring(x, y, color, maxRadius = 70) {
    this.list.push({ kind: 'ring', x, y, life: 0.55, maxLife: 0.55, size: 4, maxRadius, color });
  }

  textPop(x, y, text, color) {
    this.list.push({ kind: 'text', x, y, vx: 0, vy: -34, life: 0.9, maxLife: 0.9, size: 22, color, text });
  }

  dust(x, y) {
    this.list.push({
      kind: 'dot',
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 0.4,
      maxLife: 0.4,
      size: 1.5,
      color: 'rgba(180, 190, 210, 0.5)',
    });
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      if (p.kind === 'dot' || p.kind === 'text') {
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        if (p.kind === 'dot') {
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
      }
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'dot') {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t + 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'ring') {
        const r = p.maxRadius * (1 - t);
        ctx.globalAlpha = t * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, t * 1.5);
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }
}
