# Development Guide - Binance Trading Calculator

## Quick Start

### Installation
1. Install TamperMonkey browser extension
2. Create new userscript
3. Copy contents of `main.js`
4. Save and enable script
5. Navigate to Binance trading page

### File Structure
```
AlphaCalculator/
├── main.js           # Main userscript
├── CONTEXT.md        # Project context and architecture
├── DEVELOPMENT_GUIDE.md  # This file
└── README.md         # Project history and changes
```

## Code Architecture

### Main Components

#### 1. Overlay System
```javascript
makeOverlay(id, title, position)
```
Creates draggable UI widget with:
- Fixed positioning with high z-index (99999999)
- Drag-and-drop functionality
- Dark theme styling
- Dynamic content area

#### 2. XPath Utilities
```javascript
getXPathElement(xpath)           // Get single element
waitForXPath(xpath, timeout)     // Wait for element to appear
```
Used for reliable element selection on dynamic Binance UI.

#### 3. React Integration
```javascript
setReactValue(input, value)
```
Properly updates React-controlled inputs by:
1. Using native property setter
2. Dispatching input/change/blur events
3. Ensuring React state synchronization

#### 4. Human Simulation
```javascript
simulateMouseMove(element)       // Hover simulation
humanClick(element)              // Click with random variance
randomDelay(min, max)            // Random timing
```

### Data Flow

```
User Action (Start) 
    ↓
Safety Checks (Balance, Max Loss, Rate Limit)
    ↓
Price Calculation (Order Book Analysis)
    ↓
Checkbox Verification (Reverse Order)
    ↓
Form Filling (Buy Price → Amount → Sell Price)
    ↓
Trade Execution (Click Buy → Confirm)
    ↓
Completion Monitoring (Check Open Orders)
    ↓
Data Storage (localStorage)
    ↓
Delay (2-4s random)
    ↓
Next Trade or Complete
```

## Key Algorithms

### 1. Order Book Analysis
```javascript
function calculateOptimalPrices() {
    // 1. Get current market price
    const { currentPrice } = getMarketData();
    
    // 2. Parse order book
    const buyOrders = [];  // Orders below current price
    const sellOrders = []; // Orders above current price
    
    // 3. Sort orders
    buyOrders.sort((a, b) => b.price - a.price);  // Highest first
    sellOrders.sort((a, b) => a.price - b.price); // Lowest first
    
    // 4. Calculate optimal prices
    const bestBid = buyOrders[0].price;
    const bestAsk = sellOrders[0].price;
    
    buyPrice = bestBid + (tickSize * 2);  // Just above best bid
    sellPrice = bestBid;                   // At best bid
    
    // 5. Validate and return
    return { buy, sell, loss, spread };
}
```

### 2. Trade Completion Detection
```javascript
async function waitForTradeCompletion() {
    // Wait minimum 3 seconds
    await new Promise(r => setTimeout(r, 3000));
    
    // Check for up to 7 more seconds
    const maxWait = 7000;
    const start = Date.now();
    
    while (Date.now() - start < maxWait) {
        const orderSection = getXPathElement(OPEN_ORDERS_XPATH);
        
        // Success conditions
        if (orderSection.textContent.includes('No Ongoing Orders')) {
            return 'completed';
        }
        if (orderSection.textContent.includes('Sell') && 
            !orderSection.textContent.includes('Buy')) {
            return 'completed';
        }
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Timeout: cancel stuck buy order
    if (orderSection.textContent.includes('Buy')) {
        cancelBuyOrder();
        return 'cancelled';
    }
    
    return 'timeout';
}
```

### 3. Safety Check System
```javascript
// Before each trade
if (!checkMaxLoss()) {
    stop('Max loss limit reached');
}
if (!checkRateLimit()) {
    stop('Rate limit reached');
}
if (!checkBalance(amount)) {
    stop('Insufficient balance');
}
```

## Common Modifications

### Change Trade Delay
```javascript
// In executeBulkTrades(), find:
const delay = 2000 + Math.random() * 2000;  // 2-4 seconds

// Modify to:
const delay = 5000 + Math.random() * 5000;  // 5-10 seconds
```

### Adjust Price Calculation
```javascript
// In calculateOptimalPrices(), modify:
buyPrice = bestBid + (tickSize * 2);   // More aggressive
buyPrice = bestBid + (tickSize * 10);  // Less aggressive

sellPrice = bestBid;                    // Minimum loss
sellPrice = bestBid * 0.999;           // More loss tolerance
```

### Change Update Frequency
```javascript
// At bottom of main(), find:
setInterval(updateDisplay, 10);  // 10ms = 100 updates/second

// Modify to:
setInterval(updateDisplay, 100);  // 100ms = 10 updates/second
```

### Add New Safety Check
```javascript
function checkVolatility() {
    const prices = getRecentPrices();
    const volatility = calculateStdDev(prices);
    return volatility < 0.01;  // Less than 1% volatility
}

// Add to executeBulkTrades():
if (!checkVolatility()) {
    statusEl.textContent = 'STOPPED: High volatility detected';
    break;
}
```

## Debugging

### Enable Console Logging
```javascript
// Add at start of functions:
console.log('Function called:', arguments);

// Add before critical operations:
console.log('Buy price:', buyPrice, 'Sell price:', sellPrice);
console.log('Order section text:', orderSection.textContent);
```

### Test Without Execution
```javascript
// Comment out actual trade execution:
// humanClick(buyButton);
console.log('Would click buy button');

// Or add dry-run mode:
const DRY_RUN = true;
if (!DRY_RUN) {
    humanClick(buyButton);
}
```

### Monitor XPath Changes
```javascript
// Test if XPath still works:
const element = getXPathElement(XPATH);
if (!element) {
    console.error('XPath failed:', XPATH);
    alert('UI changed - XPath needs update');
}
```

## Performance Optimization

### Reduce DOM Queries
```javascript
// Bad: Query every time
function updatePrice() {
    document.getElementById('buy-price').textContent = price;
}

// Good: Cache reference
const buyPriceEl = document.getElementById('buy-price');
function updatePrice() {
    buyPriceEl.textContent = price;
}
```

### Batch Updates
```javascript
// Bad: Multiple reflows
el1.textContent = value1;
el2.textContent = value2;
el3.textContent = value3;

// Good: Single reflow
const fragment = document.createDocumentFragment();
// ... build fragment
container.appendChild(fragment);
```

### Throttle Updates
```javascript
let lastUpdate = 0;
function updateDisplay() {
    const now = Date.now();
    if (now - lastUpdate < 100) return;  // Max 10 updates/second
    lastUpdate = now;
    // ... update logic
}
```

## Testing Checklist

### Before Deployment
- [ ] Test single trade execution
- [ ] Test bulk trade execution (small count)
- [ ] Verify all safety checks trigger correctly
- [ ] Test pause/resume functionality
- [ ] Verify localStorage data structure
- [ ] Test with insufficient balance
- [ ] Test with max loss reached
- [ ] Test with rate limit reached
- [ ] Verify Reverse Order checkbox always checked
- [ ] Verify both Amount and Sell Price fields filled
- [ ] Test trade cancellation on timeout
- [ ] Verify slippage detection
- [ ] Test UI responsiveness during execution

### Edge Cases
- [ ] Network disconnection during trade
- [ ] Binance UI update/change
- [ ] Multiple tabs open
- [ ] Browser refresh during execution
- [ ] localStorage quota exceeded
- [ ] Invalid price data from order book
- [ ] Zero balance scenario
- [ ] Extremely high volatility

## Security Considerations

### Never Store Sensitive Data
```javascript
// DON'T:
localStorage.setItem('apiKey', key);
localStorage.setItem('password', pass);

// DO:
// Only store trade statistics
localStorage.setItem('binanceTrades', JSON.stringify(trades));
```

### Validate All Inputs
```javascript
const amount = parseFloat(input.value);
if (isNaN(amount) || amount <= 0) {
    alert('Invalid amount');
    return;
}
```

### Rate Limiting
```javascript
// Prevent abuse
const MAX_TRADES_PER_HOUR = 30;
const tradesLastHour = getTradesInLastHour();
if (tradesLastHour >= MAX_TRADES_PER_HOUR) {
    stop('Rate limit protection');
}
```

## Troubleshooting

### Issue: Sell Price Not Filling
**Cause**: Duplicate `id="limitTotal"` on both Amount and Sell Price fields  
**Solution**: Use `querySelectorAll('input#limitTotal')` and access by index

### Issue: Checkbox Not Staying Checked
**Cause**: Not verifying checkbox state before trade  
**Solution**: Call `ensureCheckboxChecked()` before every trade

### Issue: Trade Stuck in "Waiting"
**Cause**: Order completion detection failing  
**Solution**: Check XPath for Open Orders section, verify text matching

### Issue: High Slippage Warnings
**Cause**: Market moving too fast or low liquidity  
**Solution**: Increase tick size multiplier or add volatility check

### Issue: Balance Not Updating
**Cause**: XPath changed or element not found  
**Solution**: Verify balance XPath, check console for errors

## Best Practices

### 1. Always Use Async/Await
```javascript
// Good
async function executeTrade() {
    await fillFields();
    await clickButton();
    await waitForCompletion();
}

// Bad
function executeTrade() {
    fillFields();
    clickButton();
    waitForCompletion();
}
```

### 2. Error Handling
```javascript
try {
    const prices = calculateOptimalPrices();
    if (!prices) throw new Error('Price calculation failed');
    // ... continue
} catch (e) {
    console.error('Trade error:', e);
    statusEl.textContent = 'Error: ' + e.message;
    return;
}
```

### 3. Defensive Programming
```javascript
// Always check element exists
const button = getXPathElement(BUTTON_XPATH);
if (!button) {
    console.error('Button not found');
    return;
}

// Validate data before use
if (!prices || !prices.buy || !prices.sell) {
    console.error('Invalid price data');
    return;
}
```

### 4. Clear Variable Names
```javascript
// Bad
const x = document.getElementById('limitTotal');
const y = x[0];

// Good
const limitTotalInputs = document.querySelectorAll('input#limitTotal');
const amountInput = limitTotalInputs[0];
const sellPriceInput = limitTotalInputs[1];
```

## Version Control

### Commit Message Format
```
feat: Add slippage protection
fix: Correct sell price field selection
refactor: Optimize order book parsing
docs: Update XPath locations
```

### Backup Before Changes
```javascript
// Add version comment at top
// Version: 2.1.0
// Last Updated: 2024-01-01
// Changes: Added rate limiting
```

## Resources

### Binance API Documentation
- Order types: https://binance-docs.github.io/apidocs/spot/en/#order-book
- Trading rules: https://www.binance.com/en/trade-rule

### TamperMonkey Documentation
- API: https://www.tampermonkey.net/documentation.php
- Best practices: https://www.tampermonkey.net/faq.php

### JavaScript References
- Async/Await: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- DOM Events: https://developer.mozilla.org/en-US/docs/Web/Events
- XPath: https://developer.mozilla.org/en-US/docs/Web/XPath
