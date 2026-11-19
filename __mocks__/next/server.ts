/**
 * Mock for next/server module
 */

class MockNextResponse {
  status: number;
  ok: boolean;
  _body: unknown;

  constructor(body: unknown, init?: { status?: number }) {
    this.status = init?.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this._body = body;
  }

  async json() {
    return this._body;
  }

  static json(data: unknown, init?: { status?: number }) {
    const response = new MockNextResponse(data, init);
    return response;
  }
}

export { MockNextResponse as NextResponse };
