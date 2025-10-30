# IOTA DeFi Frontend Testing Documentation

## Overview

This document outlines the comprehensive testing strategy and implementation for the IOTA DeFi Protocol frontend application. Our testing approach follows industry best practices and ensures high code quality, reliability, and maintainability.

## Testing Strategy

### Testing Pyramid

Our testing strategy follows the testing pyramid approach:

```
         /\
        /E2E\      <- Few, high-value integration tests
       /------\
      /Integr. \   <- Moderate coverage for critical paths
     /----------\
    /   Unit     \ <- Many, fast, focused tests
   /--------------\
```

### Coverage Targets

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

## Testing Frameworks and Tools

### Core Testing Stack

- **Vitest**: Modern testing framework with native TypeScript support
- **Testing Library**: For component testing with user-centric approach
- **jsdom**: Browser environment simulation
- **MSW**: For mocking HTTP requests (when needed)

### Performance Testing

- **Vitest Benchmark**: For performance regression testing
- **React Profiler**: For component render performance analysis

## Test Categories

### 1. Unit Tests

Location: `tests/**/*.test.{ts,tsx}`

**Coverage:**
- Individual components in isolation
- Utility functions and helpers
- Custom hooks
- Business logic functions

**Key Features:**
- Fast execution (<100ms per test)
- Complete isolation with mocks
- High code coverage
- Clear test descriptions

### 2. Integration Tests

Location: `tests/integration/**/*.test.tsx`

**Coverage:**
- Wallet connection flows
- Contract interaction patterns
- Multi-step user workflows
- Component integration with providers

**Key Features:**
- Real provider implementations
- Mock external dependencies (IOTA client, network calls)
- State management testing
- Error handling validation

### 3. End-to-End Tests

Location: `tests/e2e/**/*.test.tsx`

**Coverage:**
- Complete user journeys
- Cross-page navigation
- Full application workflows
- Error boundary testing

**Key Features:**
- Simulated user interactions
- Multi-step workflow validation
- Application-level integration testing

### 4. Performance Tests

Location: `tests/performance/**/*.bench.ts`

**Coverage:**
- Component rendering performance
- Bundle size analysis
- Memory usage patterns
- Animation performance

**Key Features:**
- Automated performance regression detection
- Bundle size tracking
- Memory leak detection
- Render time optimization

## Test Structure and Organization

### File Naming Conventions

```
tests/
├── setup.ts                           # Global test setup
├── utils/
│   └── test-utils.tsx                 # Custom testing utilities
├── components/
│   ├── wallet/
│   │   └── WalletConnect.test.tsx     # Component unit tests
│   └── App.test.tsx                   # Main app component tests
├── lib/
│   └── iota/
│       └── client.test.ts             # Service layer tests
├── integration/
│   └── wallet-integration.test.tsx    # Integration tests
├── e2e/
│   └── defi-workflows.test.tsx        # End-to-end tests
├── performance/
│   └── render-performance.bench.ts    # Performance benchmarks
├── hooks/
│   └── react-query.test.tsx           # Custom hooks tests
└── docs/
    └── testing-documentation.md       # This documentation
```

### Test Structure Pattern

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Feature Group', () => {
    it('should describe behavior clearly', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Mock Strategy

### IOTA SDK Mocking

We comprehensively mock the IOTA SDK to ensure:
- Fast test execution
- Predictable test behavior
- No external dependencies
- Ability to test error scenarios

```typescript
vi.mock('@iota/iota-sdk/client', () => ({
  IotaClient: vi.fn().mockImplementation(() => mockIotaClient),
  getFullnodeUrl: vi.fn().mockReturnValue('https://api.testnet.iota.cafe'),
}));
```

### Wallet Mocking

Wallet state and interactions are mocked to test:
- Connected/disconnected states
- Balance loading and updates
- Transaction signing simulation
- Error handling

### Provider Mocking

All external providers are mocked:
- React Query client with test configuration
- IOTA client provider
- Wallet provider
- React Router

## Testing Utilities

### Custom Render Function

```typescript
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient }
```

Provides automatic provider wrapping for components under test.

### Mock Data Generators

```typescript
export const mockWalletState = {
  disconnected: { isConnected: false },
  connected: {
    isConnected: true,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    balance: BigInt('1000000'),
    network: 'testnet',
  }
};
```

### Performance Testing Utilities

```typescript
export const measureRenderTime = async (componentRender: () => Promise<void> | void) => {
  const start = performance.now();
  await componentRender();
  const end = performance.now();
  return end - start;
};
```

## Testing Best Practices

### 1. Test Naming

- Use descriptive test names that explain behavior
- Start with "should" or describe the expected outcome
- Include context about state or conditions

**Good Examples:**
```typescript
it('should show loading state while fetching balance')
it('should handle wallet connection errors gracefully')
it('should update balance after successful transaction')
```

### 2. Test Independence

- Each test should be completely independent
- Use `beforeEach` for setup, `afterEach` for cleanup
- Clear all mocks between tests
- Don't rely on test execution order

### 3. User-Centric Testing

- Test from the user's perspective
- Use semantic queries (getByRole, getByText)
- Test interactions, not implementation details
- Focus on what users can see and do

### 4. Mock Sparingly

- Mock only external dependencies
- Keep internal component logic unmocked
- Mock at the boundary of your system
- Use real implementations when feasible

### 5. Async Testing

```typescript
// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Use act() for state updates
await act(async () => {
  fireEvent.click(button);
});
```

## Error Scenario Testing

### Network Failures

```typescript
it('handles network timeout gracefully', async () => {
  mockIotaClient.getBalance.mockRejectedValue(new Error('Network timeout'));

  renderWithProviders(<WalletConnect />);

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to load wallet information',
      variant: 'destructive',
    });
  });
});
```

### Transaction Failures

```typescript
it('handles transaction failure with insufficient balance', async () => {
  mockIotaClient.executeTransaction.mockRejectedValue(
    new Error('Insufficient balance')
  );

  // Test error handling
});
```

### Wallet Disconnection

```typescript
it('handles unexpected wallet disconnection', async () => {
  // Start connected, then disconnect
  mockWalletHooks(mockWalletState.connected);
  const { rerender } = renderWithProviders(<Component />);

  mockWalletHooks(mockWalletState.disconnected);
  rerender(<Component />);

  // Verify graceful handling
});
```

## Performance Testing Guidelines

### Component Rendering Benchmarks

```typescript
bench('WalletConnect component initial render', () => {
  renderWithProviders(<WalletConnect />);
});

bench('Dashboard with large dataset rendering', () => {
  renderWithProviders(<App />, { initialRoute: '/dashboard' });
});
```

### Bundle Size Monitoring

Monitor and alert on:
- Total bundle size increases >10%
- Individual component size increases >20%
- New dependencies without justification

### Memory Leak Detection

```typescript
bench('Memory usage for large component trees', () => {
  const components = [];

  // Render multiple instances
  for (let i = 0; i < 50; i++) {
    components.push(renderWithProviders(<Component />));
  }

  // Cleanup and measure
  components.forEach(component => component.unmount());
});
```

## Continuous Integration

### Test Execution Strategy

1. **Pre-commit**: Fast unit tests only
2. **Pull Request**: Full test suite including integration
3. **Main Branch**: Full suite + performance benchmarks
4. **Release**: Full suite + E2E + performance regression detection

### Coverage Reporting

- Generate HTML coverage reports
- Track coverage trends over time
- Block PRs that decrease coverage significantly
- Require tests for new features

### Performance Monitoring

- Track performance metrics in CI
- Alert on performance regressions
- Generate performance comparison reports
- Monitor bundle size changes

## Debugging Failed Tests

### Common Issues and Solutions

1. **Timing Issues**
   ```typescript
   // Use waitFor for async operations
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument();
   });
   ```

2. **Mock State Issues**
   ```typescript
   // Clear mocks between tests
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

3. **Component Not Found**
   ```typescript
   // Use debug to see rendered output
   const { debug } = render(<Component />);
   debug();
   ```

### Test Debugging Tools

- `screen.debug()` - Show current DOM state
- `console.log()` - Add debugging output
- `waitFor()` with custom timeout for slow operations
- `act()` for triggering state updates

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Add screenshot comparison tests
2. **Accessibility Testing**: Automated a11y validation
3. **Cross-browser Testing**: Multi-browser E2E tests
4. **Real Device Testing**: Mobile device simulation
5. **Load Testing**: High-traffic scenario simulation

### Testing Infrastructure

1. **Parallel Test Execution**: Faster CI/CD pipeline
2. **Test Result Analytics**: Track flaky tests and trends
3. **Automated Test Generation**: AI-assisted test creation
4. **Performance Baselines**: Historical performance comparison

## Resources and References

### Documentation Links

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Guide](https://testing-library.com/docs/react-testing-library/intro/)
- [IOTA DApp Kit Testing](https://docs.iota.org/dapp-kit/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

### Best Practices

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

---

This documentation serves as the definitive guide for testing in the IOTA DeFi Protocol frontend. All team members should follow these guidelines to maintain high code quality and reliable test coverage.