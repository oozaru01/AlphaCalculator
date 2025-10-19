# Binance Trading Calculator - Chrome Extension

## Security Features

### 1. **Code Protection**
- Extension code is packaged and harder to extract
- Can be obfuscated before distribution
- Updates controlled by you

### 2. **License System**
- Server-side validation
- Hardware ID binding (one device per license)
- Expiry date enforcement
- Real-time activation check

### 3. **Distribution Control**
- Not on Chrome Web Store = no public access
- Direct distribution to customers only
- Can revoke licenses remotely

## Installation for Customers

1. Download extension ZIP file
2. Extract to folder
3. Open Chrome → Extensions → Enable Developer Mode
4. Click "Load unpacked" → Select extension folder
5. Click extension icon → Enter license key
6. Navigate to binance.com

## Building for Distribution

### Step 1: Add Your Trading Code
Edit `content.js` and paste your TamperMonkey script into `initTradingCalculator()` function.

### Step 2: Obfuscate (Optional)
```bash
npm install -g javascript-obfuscator
javascript-obfuscator content.js --output content.js
```

### Step 3: Create Icon
Add a 48x48 PNG icon as `icon.png`

### Step 4: Package
Zip the entire Extension folder and distribute to customers.

## License Server Setup

1. Deploy the license server (see LICENSE_SERVER.md)
2. Update `LICENSE_API` in `background.js` with your server URL
3. Generate license keys for customers
4. Provide keys with purchase

## License Key Format
```
XXXX-XXXX-XXXX-XXXX
```

Generate with:
```javascript
crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g).join('-')
```

## Advantages Over TamperMonkey

| Feature | TamperMonkey | Extension |
|---------|--------------|-----------|
| Code visible | ✓ Easy to copy | ✗ Harder to extract |
| License system | ✗ Not possible | ✓ Full control |
| Auto-updates | ✗ Manual | ✓ Controlled |
| Distribution | Public script | Private ZIP |
| Monetization | Difficult | Easy |
| Security | Low | High |

## Pricing Strategy

- **Monthly**: $29/month
- **Yearly**: $199/year (save 43%)
- **Lifetime**: $499 (one-time)

## Customer Support

Provide customers with:
1. Installation guide
2. License key
3. Support email/Discord
4. Video tutorial

## Anti-Piracy Measures

1. **HWID Binding**: One license = one device
2. **Online Validation**: Requires internet connection
3. **Expiry Checks**: Time-limited licenses
4. **Remote Revocation**: Disable stolen keys
5. **Obfuscation**: Makes reverse engineering harder

## Next Steps

1. Set up license server
2. Add your trading code to content.js
3. Test thoroughly
4. Obfuscate code
5. Create sales page
6. Set up payment processor (Stripe/PayPal)
7. Automate license delivery
