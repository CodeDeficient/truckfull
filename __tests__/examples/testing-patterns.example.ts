// Example test file demonstrating testing patterns for the Food Truck Finder project
// This is located in __tests__/examples/ to serve as a reference for new tests

// Example 1: Basic function test
function add(a: number, b: number): number {
  return a + b;
}

describe('Basic Function Test Example', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });
});

// Example 2: Async function test
async function fetchData(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve('data'), 10);
  });
}

describe('Async Function Test Example', () => {
  it('should resolve with expected data', async () => {
    const result = await fetchData();
    expect(result).toBe('data');
  });
});

// Example 3: Object manipulation test
interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(userData: Omit<User, 'id'>, id: number = 1): User {
  return {
    ...userData,
    id,
  };
}

describe('Object Creation Test Example', () => {
  it('should create a user with correct properties', () => {
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const user = createUser(userData, 123);

    expect(user).toEqual({
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
    });

    expect(user.id).toBe(123);
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
  });

  it('should use default id when not provided', () => {
    const userData = { name: 'Jane Doe', email: 'jane@example.com' };
    const user = createUser(userData);

    expect(user.id).toBe(1);
  });
});

// Example 4: Error handling test
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

describe('Error Handling Test Example', () => {
  it('should return correct result for valid inputs', () => {
    expect(divide(6, 2)).toBe(3);
    expect(divide(10, -2)).toBe(-5);
  });

  it('should throw error when dividing by zero', () => {
    expect(() => divide(5, 0)).toThrow('Division by zero');
    expect(() => divide(5, 0)).toThrowError(/zero/);
  });
});

// Example 5: Array/object manipulation test
function filterEvenNumbers(numbers: number[]): number[] {
  return numbers.filter((num) => num % 2 === 0);
}

describe('Array Manipulation Test Example', () => {
  it('should filter even numbers correctly', () => {
    expect(filterEvenNumbers([1, 2, 3, 4, 5, 6])).toEqual([2, 4, 6]);
    expect(filterEvenNumbers([1, 3, 5])).toEqual([]);
    expect(filterEvenNumbers([2, 4, 6])).toEqual([2, 4, 6]);
    expect(filterEvenNumbers([])).toEqual([]);
  });
});

// Example 6: Testing with mock functions
interface Logger {
  log(message: string): void;
}

function processUser(name: string, logger: Logger): string {
  logger.log(`Processing user: ${name}`);
  return name.toUpperCase();
}

describe('Mock Function Test Example', () => {
  it('should process user and log the action', () => {
    const mockLogger: Logger = {
      log: jest.fn(),
    };

    const result = processUser('john', mockLogger);

    expect(result).toBe('JOHN');
    expect(mockLogger.log).toHaveBeenCalledWith('Processing user: john');
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
  });
});

// Example 7: Snapshot testing
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

function formatProduct(product: Product): string {
  return `${product.name} - $${product.price.toFixed(2)} (${product.category})`;
}

describe('Snapshot Test Example', () => {
  it('should format product correctly', () => {
    const product: Product = {
      id: 1,
      name: 'Test Product',
      price: 29.99,
      category: 'Electronics',
    };

    const formatted = formatProduct(product);
    expect(formatted).toMatchSnapshot();
  });

  it('should format product with special characters correctly', () => {
    const product: Product = {
      id: 2,
      name: 'Product with "quotes" & symbols',
      price: 15.5,
      category: 'Special Items',
    };

    const formatted = formatProduct(product);
    expect(formatted).toMatchSnapshot();
  });
});
