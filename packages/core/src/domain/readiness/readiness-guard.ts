export enum Readiness {
  NotReady = 'NotReady',
  Configured = 'Configured',
  Ready = 'Ready',
}

export class ReadinessGuard {
  private state: Readiness = Readiness.NotReady;

  transition(to: Readiness): void {
    const from = this.state;

    const valid =
      (from === Readiness.NotReady && to === Readiness.Configured) ||
      (from === Readiness.Configured && to === Readiness.Ready) ||
      (from === Readiness.Ready && to === Readiness.Ready) ||
      (from === Readiness.Configured && to === Readiness.NotReady) ||
      (from === Readiness.Ready && to === Readiness.NotReady);

    if (!valid) {
      throw new Error(`Invalid state transition: ${from} → ${to}`);
    }

    this.state = to;
  }

  canInit(): boolean {
    return this.state === Readiness.NotReady;
  }

  canIdentify(): boolean {
    return this.state === Readiness.Configured || this.state === Readiness.Ready;
  }

  canTrack(): boolean {
    return this.state === Readiness.Ready;
  }

  isConfigured(): boolean {
    return this.state !== Readiness.NotReady;
  }

  getState(): Readiness {
    return this.state;
  }

  reset(): void {
    this.state = Readiness.NotReady;
  }
}
