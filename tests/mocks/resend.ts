import { jest } from '@jest/globals';

interface EmailSendCall {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface MockResendInstance {
  emails: {
    send: jest.Mock<Promise<{ error: null | { message: string } }>, [EmailSendCall]>;
  };
}

export const resendMock: MockResendInstance = {
  emails: {
    send: jest.fn<Promise<{ error: null }>, [EmailSendCall]>().mockResolvedValue({ error: null }),
  },
};

let shouldFail = false;
let mockErrorMessage = 'Simulated email error';

export function setResendMockFailure(
  fail: boolean,
  message: string = 'Simulated email error',
): void {
  shouldFail = fail;
  mockErrorMessage = message;
  if (fail) {
    resendMock.emails.send.mockResolvedValue({ error: { message } });
  } else {
    resendMock.emails.send.mockResolvedValue({ error: null });
  }
}

export function getEmailSendCalls(): EmailSendCall[] {
  return resendMock.emails.send.mock.calls as EmailSendCall[];
}

export function getLastEmailCall(): EmailSendCall | null {
  const calls = getEmailSendCalls();
  return calls.length > 0 ? calls[calls.length - 1] : null;
}

export function getEmailCallCount(): number {
  return resendMock.emails.send.mock.calls.length;
}

export function clearEmailSendCalls(): void {
  resendMock.emails.send.mockClear();
}

export function resetResendMock(): void {
  clearEmailSendCalls();
  shouldFail = false;
  mockErrorMessage = 'Simulated email error';
  resendMock.emails.send.mockResolvedValue({ error: null });
}

export function setupResendMock(): void {
  jest.doMock('resend', () => ({
    Resend: jest.fn(() => resendMock),
  }));
}
