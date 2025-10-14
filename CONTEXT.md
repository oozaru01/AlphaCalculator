# Binance Trading Calculator - Context Documentation

## Project Overview
TamperMonkey userscript for automated cryptocurrency trading on Binance with real-time price analysis, optimal buy/sell calculations, and bulk trade execution.

## Core Features

### 1. Real-Time Price Analysis
- Updates every 10ms from multiple sources (chart close price, ticker, order book)
- Calculates optimal buy/sell prices based on order book depth
- Displays market spread and loss estimates

### 2. Automated Trading
- **Fill Button**: Populates form fields with calculated prices
- **Buy Button**: Fills fields + executes single trade with confirmation
- **Bulk Trading**: Executes multiple trades sequentially with configurable count

### 3. Safety Features
- **Max Loss Limit**: Stops trading when total loss exceeds threshold (default: 10 USDT)
- **Balance Check**: Verifies sufficient balance before each trade
- **Rate Limiting**: Max trades per hour (default: 30) to avoid exchange flags
- **Slippage Protection**: Alerts if fill price differs >0.1% from expected

### 4. Trade Management
- Monitors trade completion by checking "No Ongoing Orders" text
- Auto-cancels stuck buy orders after 10 seconds
- Waits indefinitely for sell orders to complete
- Random 2-4 second delays between trades for human-like behavior

## Technical Architecture

### Key Functions

#### Price Calculation
```javascript
calculateOptimalPrices()
```
- Parses trading book with volume and time weighting
- Volume weight: Larger trades get more influence
- Time decay: Recent trades weighted higher (0.95^index)
- Filters top 30% most significant trades
- Buy price: Lowest significant sell price
- Sell price: Highest significant buy price
- Creates potential profit instead of loss by trading within spread

#### Trade Execution
```javascript
executeBulkTrades()
```
- Ensures "Reverse Order" checkbox is checked
- Calculates fresh prices before each trade
- Fills: Buy Price → Amount → Sell Price (with verification)
- Stores trade data in localStorage
- Implements all safety checks

#### Fee Calculation
```javascript
getTradingFeeUSDT(marketPrice)
```
- Extracts fee from UI (e.g., "0.116095 AOP")
- Parses numeric value using parseFloat()
- Converts to USDT: feeTokens * marketPrice
- Adds to total loss for each trade

#### Safety Checks
```javascript
checkMaxLoss()      // Total loss < max limit
checkRateLimit()    // Trades in last hour < max
checkBalance()      // Available balance >= trade amount
```

### XPath Locations

| Element | XPath |
|---------|-------|
| Market Price | `/html/body/div[4]/div/div[2]/div/div/div[2]/div[1]` |
| Order Book | `/html/body/div[4]/div/div[3]/div/div[7]/div/div/div` |
| Balance | `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[1]/div[1]/div/div/div[2]/div` |
| Buy Price Input | `#limitPrice` |
| Amount Input | `input#limitTotal` (first) |
| Sell Price Input | `input#limitTotal` (second) |
| Buy Button | `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button` |
| Confirm Button | `/html/body/div[4]/div[2]/div/div/button` |
| Reverse Order Checkbox | `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[5]/div[1]/div[1]/div` |
| Open Orders | `/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div` |
| Cancel Button | `/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div` |
| Cancel Confirm | `/html/body/div[4]/div[2]/div/div/div[2]/button` |
| Trading Fee | `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[2]/div[2]` |

### React Integration
Must use native property setters for React inputs:
```javascript
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
).set;
nativeInputValueSetter.call(input, value);
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
input.dispatchEvent(new Event('blur', { bubbles: true }));
```

### Timing Configuration
- Mouse simulation: 20-50ms delays
- Confirmation dialogs: 150-200ms
- UI updates: 10ms interval
- Trade completion wait: 2s minimum, checks every 1s indefinitely
- Buy order cancel timeout: 10s
- Between trades: 2-4s random delay

## Data Storage

### localStorage Schema
```javascript
{
  "binanceTrades": [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "tradeNumber": 1,
      "buyPrice": "0.00012345",
      "sellPrice": "0.00012340",
      "amount": 1,
      "lossPercent": "0.004",
      "feeUSDT": "0.000010",
      "lossUSDT": "0.000014",
      "result": "completed",
      "slippage": "0.001"
    }
  ]
}
```

## UI Components

### Overlay Display
- Draggable widget (top-left by default)
- Real-time balance, market price, buy/sell prices
- Loss percentage and USDT estimate
- Spread percentage indicator
- Max loss and rate limit inputs
- Trade count input with Start/Pause buttons
- Status and total loss displays

### Button Functions
- **Fill**: Populates all form fields
- **Buy**: Single trade execution
- **Start**: Begin bulk trades
- **Pause/Resume**: Toggle bulk execution

## Trade Success Criteria
A trade is considered successful when:
1. "No Ongoing Orders" text appears (both Buy and Sell completed)
2. Waits indefinitely checking every 1 second
3. Cancels stuck Buy orders after 10 seconds if still pending

## Loss Minimization Strategy

### Trading Book Analysis
1. Parse recent trades from trading book with prices and volumes
2. Extract Buy trades (green) and Sell trades (red) using color detection
3. Calculate weight for each trade: volume * timeDecay (0.95^index)
4. Sort by weight to identify most significant trades

### Volume-Weighted Algorithm
- **Weight Calculation**: amount * Math.pow(0.95, index)
- **Top 30% Filter**: Only considers most significant trades
- **Buy Price**: Lowest price from top 30% sell trades
- **Sell Price**: Highest price from top 30% buy trades
- **Validation**: Ensure sell > buy for profit potential

### Fee Integration
- Extracts trading fee from UI (e.g., "0.116095 AOP")
- Converts to USDT: feeTokens * marketPrice
- Adds to loss calculation: (amount * lossPercent / 100) + feeUSDT
- Included in total loss tracking

### Result
- Traditional method: ~0.02% loss per trade + fees
- Volume-weighted method: ~0.005-0.015% profit/loss + fees
- **Potential profit by trading within spread**

## Error Handling

### Retry Logic
- Confirm button: 5 attempts with 50ms incremental delays
- Cancel confirm: 3 attempts with 50ms incremental delays
- Price calculation: Continues on error, logs to console

### Failure Modes
- **Price Error**: Skips trade, waits 2s, continues
- **Insufficient Balance**: Stops execution immediately
- **Max Loss Reached**: Stops execution immediately
- **Rate Limit Hit**: Stops execution, displays wait message
- **Stuck Buy Order**: Auto-cancels after 10s timeout

## Human-Like Behavior

### Mouse Simulation
- Random position variance: ±4px from center
- Event sequence: mouseover → mouseenter → mousemove → mousedown → mouseup → click
- Random delays between events

### Timing Randomization
- Click delays: 20-50ms
- Confirmation delays: 150-200ms
- Between trades: 2000-4000ms
- Field focus delays: 100-200ms

## Configuration Defaults
- Trade Amount: 1 USDT
- Bulk Trades: 10
- Max Loss: 10 USDT
- Max Trades/Hour: 30
- Update Interval: 10ms

## Important Notes

### Duplicate ID Issue
Both Amount and Sell Price fields share `id="limitTotal"`. Solution:
```javascript
const limitTotalInputs = document.querySelectorAll('input#limitTotal');
const amountInput = limitTotalInputs[0];  // First occurrence
const sellPriceInput = limitTotalInputs[1];  // Second occurrence
```

### Reverse Order Checkbox
Must be checked before every trade. The checkbox enables the sell order to be placed simultaneously with the buy order.

### Trade Completion Detection
- Minimum 2s wait before checking
- Checks every 1s indefinitely until completion
- Success: "No Ongoing Orders" text appears
- Stuck orders: Cancels Buy order after 10s if still pending
- Continues waiting for Sell orders (normal flow)

## Future Enhancement Ideas
- Emergency stop button
- Export trade history to CSV
- Sound notifications
- Volatility detection
- Time-based trading windows
- Multi-pair support
- Profit target mode
- Dynamic amount adjustment based on balance
