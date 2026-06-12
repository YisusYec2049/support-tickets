export function playNotification() {
  try {
    const ctx = new AudioContext()

    function beep(startTime: number, onEnd?: () => void) {
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(1.0, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5)

      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(960, startTime)
      osc.frequency.exponentialRampToValueAtTime(720, startTime + 0.2)
      osc.start(startTime)
      osc.stop(startTime + 0.5)
      if (onEnd) osc.onended = onEnd
    }

    beep(ctx.currentTime)
    beep(ctx.currentTime + 0.55, () => ctx.close())
  } catch {
    // navegador sin soporte o bloqueado por política de autoplay
  }
}
