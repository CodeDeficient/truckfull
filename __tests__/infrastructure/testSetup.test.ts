describe('Test Infrastructure Verification', () => {
  it('should run a basic test successfully', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async tests', async () => {
    const asyncFunction = async () => {
      return 'test';
    };

    const result = await asyncFunction();
    expect(result).toBe('test');
  });
});
