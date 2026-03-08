import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE'],
  });
}
