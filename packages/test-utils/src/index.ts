export class CapturingEmailProvider {
  public readonly messages: Array<{ email: string; code: string; purpose: string }> = [];
  public sendOtp(email: string, code: string, purpose: string): Promise<void> {
    this.messages.push({ email, code, purpose });
    return Promise.resolve();
  }
}

export class FailingProvider {
  public execute(): Promise<never> {
    return Promise.reject(new Error('TEST_PROVIDER_UNAVAILABLE'));
  }
}
