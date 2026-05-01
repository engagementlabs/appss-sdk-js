type EventValidator = (properties: unknown) => void;

export class EventValidatorRegistry {
  private readonly validators = new Map<string, EventValidator>();

  register(eventName: string, validator: EventValidator): void {
    this.validators.set(eventName, validator);
  }

  validate(eventName: string, properties: unknown): void {
    this.validators.get(eventName)?.(properties);
  }
}
