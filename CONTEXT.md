# YellowDoge Dark Mode - Context Documentation

## Project Overview
TamperMonkey userscript renamed "YellowDoge Dark Mode" for discretion. Automated cryptocurrency trading on Binance with real-time price tracking, optimal buy/sell calculations, and bulk trade execution with Telegram notifications.

## Core Features

### 1. Real-Time Price Tracking
- Updates every 100ms from WebSocket/DOM sources
- WebSocket interception for live price data (window.livePrice)
- Chart hover triggering every 100ms (always active)
- Multiple fallback price sources

### 2. Automated Trading with Reverse Order
- **Fill Button**: Populates form fields with calculated prices
- **Buy Button**: Single trade execution
- **Bulk Trading**: Sequential trades with 3-second countdown
- **Reverse Order**: Must be checked - creates simultaneous Buy + Sell limit orders

### 3. Safety Features
- **Max Loss Limit**: Stops when total loss exceeds threshold (default: 2 USDT)
- **Balance Check**: Verifies sufficient balance before each trade
- **Trade Prerequisites**: Holdings < $0.5 and no open orders before each trade
- **Price Movement Detection**: Cancels if price moves >0.2% from entry

### 4. Trade Management
- Buy orders: Cancelled after 10 seconds if stuck
- Sell orders: Cleanup after 5 seconds of Sell-only status (Buy filled)
- 200ms verification delay before cleanup to prevent race conditions
- Holdings verification after cleanup via Holdings tab
- Cancelled trades wait 2 seconds before next trade

### 5. Loss Tracking
- Calculated via balance delta: balanceBeforeTrade - balanceAfterTrade
- Stored in localStorage with trade history
- Manual adjustment capability (cleared after each trade)
- Cleanup sell losses excluded from Total Loss
- Real-time display updates after each completed trade

### 6. Telegram Notifications
- Bot Token: `8394008255:AAH7r1AHxSYx8iFFP32mfUOvOWg3o_NocxA`
- Chat ID: `@LeonTradingBot`
- Summary report (default) or detailed trade-by-trade report (checkbox)
- Includes token name, nickname, session stats, balance changes

### 7. Console Logging Control
- Checkbox to enable/disable verbose logging
- Unchecked by default to reduce noise
- Controls price updates and debugging statements

## Trade Flow

### Startup Sequence
```
1. Click Start Button
2. Verify Reverse Order checkbox is checked
3. Display 3-second countdown ("Starting in 3...", "2...", "1...")
4. Check prerequisites:
   - Switch to Holdings tab
   - Check if token holdings > $0.5
   - If yes: Cancel All orders → Execute cleanup sell → Update balanceBeforeTrade
   - Switch back to Open Orders tab
5. Begin trade loop
```

### Per-Trade Flow
```
1. Check if paused (wait loop)
2. Prerequisites check:
   - Switch to Holdings tab
   - Verify token value < $0.5
   - If > $0.5: Cancel All → Cleanup sell → Update balanceBeforeTrade → Continue to next iteration
   - Switch to Open Orders tab
   - Verify no open orders for current token
   - If orders exist: Skip trade, wait 2s, continue
3. Safety checks:
   - Max loss limit
   - Balance >= trade amount
4. Calculate fresh prices (0.03% below/above market)
5. Ensure Reverse Order checked
6. Fill form fields:
   - Buy Price → Amount → Sell Price (with 3 retry verification)
7. Click Buy button → Confirm
8. Wait 2 seconds for order processing
9. Monitor trade completion (waitForTradeCompletion):
   - Check Open Orders every 1 second
   - Track order status: Buy+Sell, Buy only, Sell only, No orders
   - Price movement check: Cancel if >0.2% from entry
   - Buy stuck >10s: Cancel order
   - Sell-only status >5s: Wait 200ms → Verify still stuck → Execute cleanup
   - Success: "No Ongoing Orders" detected
10. Calculate loss via balance delta
11. Save trade to localStorage
12. Clear manual loss adjustment
13. Update Total Loss display
14. Random delay 1-4 seconds
15. Next trade
```

### Cleanup Sell Process
```
1. Cancel All existing orders
2. Switch to Sell tab
3. Uncheck Reverse Order (sell tokens for USDT)
4. Set slider to 100%
5. Set aggressive sell price (0.5% below market)
6. Click Sell button → Confirm
7. Switch back to Buy tab
8. Re-check Reverse Order
9. Wait for completion
10. Verify token sold via Holdings tab (USD value < $0.01)
11. Update balanceBeforeTrade to exclude cleanup loss
```

### Session Completion
```
1. Calculate session stats
2. Send Telegram notification (if trades completed)
3. Reset UI buttons
4. Display completion message
```

## Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                         START BUTTON CLICKED                     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Reverse Order Checked?  │
                    └────────┬────────┬───────┘
                            NO       YES
                             │        │
                    ┌────────▼──┐     │
                    │   ERROR   │     │
                    └───────────┘     │
                                      │
                         ┌────────────▼────────────┐
                         │  3-Second Countdown     │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │ Initial Holdings Check  │
                         │  (Switch to Holdings)   │
                         └────────┬────────┬───────┘
                                 >$0.5    <$0.5
                                  │        │
                    ┌─────────────▼──┐     │
                    │  Cancel All +  │     │
                    │  Cleanup Sell  │     │
                    └─────────────┬──┘     │
                                  │        │
                         ┌────────▼────────▼────────┐
                         │ Switch to Open Orders    │
                         └────────────┬─────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────┐
│                         TRADE LOOP START                           │
│                    (For each trade 1 to N)                         │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Paused? Wait Loop    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Holdings Check (<$0.5)  │
                    └────────┬────────┬───────┘
                            >$0.5    <$0.5
                             │        │
                ┌────────────▼──┐     │
                │  Cancel All + │     │
                │ Cleanup Sell  │     │
                └────────────┬──┘     │
                             │        │
                    ┌────────▼────────▼────────┐
                    │ Open Orders Check        │
                    └────────┬────────┬────────┘
                          Orders    No Orders
                            │         │
                    ┌───────▼──┐      │
                    │   SKIP   │      │
                    └───────┬──┘      │
                            │         │
                    ┌───────▼─────────▼────────┐
                    │   Safety Checks          │
                    │ (Max Loss, Balance)      │
                    └────────┬────────┬────────┘
                            FAIL     PASS
                             │        │
                    ┌────────▼──┐     │
                    │   STOP    │     │
                    └───────────┘     │
                                      │
                         ┌────────────▼────────────┐
                         │  Calculate Prices       │
                         │  (0.03% spread)         │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  Fill Form Fields       │
                         │  Buy→Amount→Sell        │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  Click Buy + Confirm    │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  Wait 2s for Processing │
                         └────────────┬────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────┐
│                    WAIT FOR COMPLETION LOOP                        │
│                    (Check every 1 second)                          │
└────────┬───────────┬───────────┬───────────┬────────────┬─────────┘
         │           │           │           │            │
    Buy+Sell    Buy Only   Sell Only   No Orders   Price Moved
         │           │           │           │            │
         │      ┌────▼────┐      │           │       ┌────▼────┐
         │      │ >10s?   │      │           │       │ Cancel  │
         │      └──┬───┬──┘      │           │       │   All   │
         │        YES  NO        │           │       └────┬────┘
         │         │   │         │           │            │
         │    ┌────▼─┐ │         │           │            │
         │    │Cancel│ │         │           │            │
         │    │ Buy  │ │         │           │            │
         │    └────┬─┘ │         │           │            │
         │         │   │         │           │            │
         │    ┌────▼───▼─────────▼───────────▼────────────▼────┐
         │    │              CONTINUE LOOP                      │
         │    └─────────────────────────────────────────────────┘
         │
    ┌────▼────────┐
    │ Sell Only   │
    │   >5s?      │
    └──┬───┬──────┘
      YES  NO
       │   │
  ┌────▼─┐ │
  │Wait  │ │
  │200ms │ │
  └────┬─┘ │
       │   │
  ┌────▼─┐ │
  │Still │ │
  │Stuck?│ │
  └──┬─┬─┘ │
    YES NO │
     │  │  │
┌────▼┐ │  │
│Clean│ │  │
│ up  │ │  │
│Sell │ │  │
└────┬┘ │  │
     │  │  │
┌────▼──▼──▼──────────────────────────────────────────────────────┐
│                    TRADE COMPLETED                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │  Calculate Loss         │
                │  (Balance Delta)        │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │  Save to localStorage   │
                │  Clear Manual Override  │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │  Update Total Loss UI   │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │  Random Delay 1-4s      │
                └────────────┬────────────┘
                             │
                             │
              ┌──────────────▼──────────────┐
              │   More Trades?              │
              └──────┬──────────────┬───────┘
                    YES            NO
                     │              │
         ┌───────────▼──┐  ┌────────▼────────┐
         │ NEXT TRADE   │  │ Send Telegram   │
         │ (Loop Back)  │  │  Notification   │
         └──────────────┘  └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   SESSION END   │
                           └─────────────────┘
```

## Technical Architecture

### Key Functions

#### executeBulkTrades()
Main trade loop with:
- Reverse Order validation
- 3-second countdown
- Initial holdings cleanup
- Per-trade prerequisites
- Safety checks
- Trade execution
- Completion monitoring
- Telegram notifications

#### waitForTradeCompletion(entryPrice)
Monitors trade status:
- Checks Open Orders every 1s
- Logs status every 3s
- Price movement detection (>0.2%)
- Buy timeout (10s)
- Sell-only timeout (5s with 200ms verification)
- Returns: 'completed', 'cancelled', 'cleanup', 'price_moved', 'timeout'

#### cleanupStuckSellOrder()
Aggressive token liquidation:
- Cancel All existing orders
- Switch to Sell tab
- Uncheck Reverse Order
- Set 100% slider
- Aggressive price (0.5% below market)
- Execute sell
- Switch back to Buy tab
- Re-check Reverse Order

#### verifyTokenSold()
Confirms cleanup success:
- Switch to Holdings tab
- Find token row
- Check USD value in column 3
- Return true if < $0.01
- Switch back to Open Orders

#### calculateOptimalPrices()
Price calculation:
- Get current price from window.livePrice or DOM
- Buy: currentPrice * 0.9997 (0.03% below)
- Sell: currentPrice * 1.0003 (0.03% above)
- Total spread: ~0.06%

### XPath Locations

| Element | XPath/Selector |
|---------|----------------|
| Token Name | `/html/body/div[4]/div/div[2]/div/div/div[1]/div[3]/div[1]` |
| Market Price | `/html/body/div[4]/div/div[2]/div/div/div[2]/div[1]` |
| Balance | `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[1]/div[1]/div/div/div[2]/div` |
| Buy Price Input | `#limitPrice` |
| Amount Input | `input#limitTotal` (first) |
| Sell Price Input | `input#limitTotal` (second) |
| Buy Button | `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button` |
| Confirm Button | `/html/body/div[4]/div[2]/div/div/button` |
| Reverse Order Checkbox | `div[role="checkbox"]` + text "Reverse Order" |
| Open Orders | `/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div` |
| Cancel All Button | `/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div` |
| Cancel Confirm | `/html/body/div[4]/div[2]/div/div/div[2]/button` |
| Holdings Tab | `#bn-tab-holdings` |
| Open Orders Tab | `#bn-tab-orderOrder > div:nth-child(1)` |
| Holdings USD Value | `td:nth-child(3) .text-TertiaryText` |
| Sell Tab | `div.bn-tab__buySell:nth-child(2)` |
| Buy Tab | `div.bn-tab__buySell:nth-child(1)` |

### React Integration
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
- Display updates: 100ms interval
- Auto-hover trigger: 100ms (always active)
- Trade completion check: 1s interval
- Buy order timeout: 10s
- Sell-only timeout: 5s
- Cleanup verification delay: 200ms
- Post-cancellation wait: 2s
- Between trades: 1-4s random
- Startup countdown: 3s

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
      "actualLoss": "0.000014",
      "result": "completed",
      "slippage": "0.001"
    }
  ],
  "manualLossAdjustment": "0.5",  // Cleared after each trade
  "traderNickname": "Trader"
}
```

## UI Components

### Overlay Display
- Title: "🐕 YellowDoge - [TOKEN]"
- Draggable (pauses auto-hover on mouseenter)
- Nickname input (saved to localStorage)
- Market/Buy/Sell prices with color coding
- Total Loss display (red, bold)
- Set Loss input + Update button
- Trade amount input
- Fill/Buy buttons (single trade)
- Max Loss and Delay inputs
- Bulk trades input + Start/Pause/Stop/Clear buttons
- Test Telegram button
- Detailed Report checkbox
- Console Log checkbox (unchecked by default)
- Status display
- Log output textarea

## Trade Success Criteria
- "No Ongoing Orders" text appears
- OR cleanup executed and token verified sold
- Balance delta calculated for loss tracking
- Trade saved to localStorage
- Manual loss adjustment cleared

## Error Handling

### Retry Logic
- Confirm button: 5 attempts with 50ms delays
- Cancel confirm: 3 attempts with 50ms delays
- Sell price verification: 3 attempts with 150ms delays

### Failure Modes
- **Price Error**: Skip trade, wait 2s
- **Insufficient Balance**: Stop execution
- **Max Loss Reached**: Stop execution
- **Holdings > $0.5**: Cancel All + Cleanup sell
- **Open Orders Exist**: Skip trade, wait 2s
- **Stuck Buy Order**: Cancel after 10s
- **Stuck Sell Order**: Cleanup after 5s (Sell-only)
- **Price Moved >0.2%**: Cancel All orders

## Configuration Defaults
- Trade Amount: 1 USDT
- Bulk Trades: 10
- Max Loss: 2 USDT
- Trade Delay: 2s
- Update Interval: 100ms
- Price Spread: 0.06% (0.03% each side)

## Important Notes

### Reverse Order Checkbox
- Must be checked for Buy orders (creates simultaneous Sell)
- Must be unchecked for cleanup Sell (sell tokens for USDT)
- Detection: `div[role="checkbox"]` with aria-checked attribute

### Loss Tracking
- Calculated from balance delta, not price difference
- Cleanup sell losses excluded (balanceBeforeTrade updated after cleanup)
- Manual adjustment cleared after each trade to allow accumulation
- Real-time UI update after each completed trade

### Holdings Verification
- Checks USD value in Holdings tab column 3
- Token considered sold if value < $0.01
- Switches between tabs for verification

### Console Logging
- Controlled by checkbox (unchecked by default)
- Reduces verbose output from price tracking
- Debugging statements only shown when enabled
