# Magic Number Algorithm - Design Document

## Overview
Adaptive algorithm to identify optimal buy/sell percentages for each trading pair based on real-time market behavior and order fill success rates.

## Concept
- **BuyMagicNumber**: Percentage above market price that guarantees immediate order fill
- **SellMagicNumber**: Percentage below market price that guarantees immediate order fill
- Each trading pair has unique magic numbers stored in localStorage
- Numbers adapt based on order fill success/failure patterns

## Algorithm Logic

### Initial Values
- BuyMagicNumber: Start at 1.0001 (0.01% above market)
- SellMagicNumber: Start at 0.9999 (0.01% below market)
- Target: 10 consecutive successful fills within 5 seconds

### Adjustment Strategy

#### When Order Fills Within 5 Seconds (Success)
1. Increment consecutive success counter
2. If consecutive successes >= 10:
   - Magic number is validated
   - Try to optimize (decrease buy margin, increase sell margin)
3. If consecutive successes < 10:
   - Continue with current magic number

#### When Order Doesn't Fill Within 5 Seconds (Failure)
1. Reset consecutive success counter to 0
2. Adjust magic number to be more aggressive:
   - BuyMagicNumber: Increase by 0.0001 (0.01%)
   - SellMagicNumber: Decrease by 0.0001 (0.01%)
3. Retry with new magic number

#### Optimization Phase (After 10 Consecutive Successes)
1. Try to reduce margin (more profitable):
   - BuyMagicNumber: Decrease by 0.00005 (0.005%)
   - SellMagicNumber: Increase by 0.00005 (0.005%)
2. If optimization fails (order doesn't fill):
   - Revert to previous validated magic number
   - Mark as "optimized" and stop further optimization for 100 trades

## Data Structure

### localStorage Schema
```javascript
{
  "magicNumbers": {
    "BTCUSDT": {
      "buyMagic": 1.0003,
      "sellMagic": 0.9997,
      "consecutiveSuccesses": 8,
      "totalTrades": 156,
      "lastUpdated": "2025-01-15T10:30:00Z",
      "isOptimized": false,
      "optimizationAttempts": 2
    },
    "ETHUSDT": {
      "buyMagic": 1.0002,
      "sellMagic": 0.9998,
      "consecutiveSuccesses": 10,
      "totalTrades": 89,
      "lastUpdated": "2025-01-15T09:15:00Z",
      "isOptimized": true,
      "optimizationAttempts": 0
    }
  }
}
```

## Implementation Plan

### Phase 1: Data Storage
- Create localStorage manager for magic numbers
- Implement get/set functions for trading pairs
- Add migration for existing users

### Phase 2: Order Fill Detection
- Track order placement timestamp
- Monitor order status every 500ms
- Detect fill within 5-second window
- Record success/failure

### Phase 3: Adaptive Algorithm
- Implement adjustment logic
- Update magic numbers based on results
- Track consecutive successes
- Handle optimization phase

### Phase 4: UI Integration
- Display current magic numbers in overlay
- Show consecutive success count
- Add manual override option
- Display "Learning" vs "Optimized" status

### Phase 5: Analytics
- Track magic number history
- Calculate average fill time
- Display success rate per pair
- Export data for analysis

## Benefits
1. **Pair-Specific Optimization**: Each trading pair has unique liquidity/volatility
2. **Adaptive to Market Conditions**: Adjusts automatically as market changes
3. **Profit Maximization**: Finds minimum margin needed for guaranteed fills
4. **Reduced Slippage**: Avoids overly aggressive pricing
5. **Data-Driven**: Based on actual order fill performance

## Safety Measures
1. Maximum magic number limits (e.g., 1.01 / 0.99 = 1% max)
2. Minimum consecutive successes before optimization
3. Revert mechanism if optimization fails
4. Manual override capability
5. Per-pair isolation (one pair's failure doesn't affect others)

## Future Enhancements
1. Time-of-day analysis (different magic numbers for different hours)
2. Volatility-based adjustments
3. Machine learning for pattern recognition
4. Multi-exchange support
5. Cloud sync for magic numbers across devices
