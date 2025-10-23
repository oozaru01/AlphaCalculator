# Binance Trading Calculator - TamperMonkey Script

I release this for no reason, make public this for no reason. 
This main.js script targets specifically Binance Alpha point farming.
I will not be responsible for any restriction place by Binance on your accounts.

## Overview
A TamperMonkey userscript that provides real-time trading calculations and automation for Binance spot trading. The script analyzes the order book to suggest optimal buy/sell prices with minimal loss.

## Features

### 1. **Real-Time Price Display**
- Shows current market price from live candlestick data
- Updates every 10ms for real-time accuracy
- Multiple fallback sources for price data

### 2. **Smart Price Calculation**
- Analyzes order book (Limit Transactions)
- Calculates optimal buy/sell prices based on recent trades
- Separates buy orders (green) and sell orders (red)
- Uses median prices for better accuracy
- Target: ~0.02-0.04% loss per trade cycle

### 3. **Balance Display**
- Shows current USDT balance in real-time
- Updates automatically

### 4. **Trading Buttons**

#### Buy Section:
- **Fill Button** (Light Green): Fills the buy price field only
- **Buy Button** (Dark Green): Auto-fills price AND submits buy order

#### Sell Section:
- **Fill Button** (Light Blue): Fills the sell price field only
- **Sell Button** (Dark Blue): Auto-fills price AND submits sell order

### 5. **Draggable Overlay**
- Click and drag the overlay to move it anywhere on screen
- Positioned at top-left by default

### 6. **Loss Percentage Display**
- Shows expected loss percentage per trade cycle
- Calculated as: (Sell Price - Buy Price) / Buy Price × 100

## Installation

1. Install TamperMonkey extension in your browser
2. Create new script
3. Copy contents from `Tamper.txt`
4. Save and enable the script
5. Navigate to binance.com trading page

## How It Works

### Price Calculation Algorithm

1. **Data Collection**:
   - Reads chart close price (primary source)
   - Reads main market price display (fallback)
   - Analyzes order book from Limit Transactions panel

2. **Order Book Analysis**:
   - Identifies buy orders (green color indicator)
   - Identifies sell orders (red color indicator)
   - Collects recent 20 trades

3. **Price Optimization**:
   - Calculates median of buy orders
   - Calculates median of sell orders
   - Sets buy price: 0.01% below median buy
   - Sets sell price: 0.01% above median sell

4. **Fallback Strategy**:
   - If insufficient order book data:
   - Buy: 0.02% below current price
   - Sell: 0.02% above current price

## XPath References

### Key Elements:
- **Market Price**: `/html/body/div[4]/div/div[2]/div/div/div[2]/div[1]`
- **Order Book**: `/html/body/div[4]/div/div[3]/div/div[7]/div/div/div`
- **Balance**: `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[1]/div[1]/div/div/div[2]/div`
- **Buy Limit Input**: `#limitPrice`
- **Sell Limit Input**: `.h-auto > div:nth-child(5) > div:nth-child(2) > div:nth-child(2) > input:nth-child(1)`
- **Buy Button**: `/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button`
- **Sell Button**: `.h-auto > div:nth-child(5) button`

## Usage Tips

### For Quick Trading:
1. Watch the overlay for optimal prices
2. Click "Buy" button when ready
3. Wait for order to fill
4. Click "Sell" button to close position

### For Manual Control:
1. Use "Fill" buttons to populate price fields
2. Adjust amount manually
3. Submit orders manually

### Best Practices:
- Monitor the loss percentage
- Ensure sufficient balance before trading
- Watch for order fills in the order history
- Adjust strategy based on market volatility

## Technical Details

### Update Frequency:
- Price updates: Every 10ms
- Balance updates: Every 10ms
- Order book analysis: Every 10ms

### React Integration:
- Uses native React setter for input fields
- Triggers proper React events (input, change, blur)
- Ensures Binance form validation works correctly

### Human-Like Behavior:
- Focuses input before filling
- 100ms delay before setting value
- 200ms delay before clicking submit button
- Visual feedback with checkmark (✓)

## Troubleshooting

### Prices Not Updating:
- Check if chart is visible
- Verify order book panel is open
- Refresh the page

### Fill Button Not Working:
- Ensure you're on the spot trading page
- Check if limit order form is visible
- Verify XPath selectors match current page structure

### Auto-Buy/Sell Not Working:
- Confirm balance is sufficient
- Check if buttons are enabled on Binance
- Verify order form is properly filled

## Disclaimer

This script is for educational purposes. Use at your own risk. Always:
- Test with small amounts first
- Monitor your trades
- Understand the risks of automated trading
- Comply with Binance terms of service

## Version History

- **v2**: Current version with order book analysis and auto-trading
- **v1**: Basic price calculation with fixed percentages
