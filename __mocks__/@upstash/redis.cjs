const Redis = jest.fn().mockImplementation(() => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

module.exports = { Redis };
