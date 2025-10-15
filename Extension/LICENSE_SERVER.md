# License Server Implementation

## Simple Node.js License Server

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// Store licenses (use database in production)
const licenses = {
  'DEMO-1234-5678-ABCD': {
    expiry: Date.now() + 30*24*60*60*1000, // 30 days
    hwid: null,
    active: true
  }
};

app.post('/api/validate', (req, res) => {
  const {key, hwid} = req.body;
  const license = licenses[key];
  
  if (!license || !license.active) {
    return res.json({valid: false, error: 'Invalid license'});
  }
  
  if (license.expiry && Date.now() > license.expiry) {
    return res.json({valid: false, error: 'License expired'});
  }
  
  // Bind to hardware ID
  if (!license.hwid) {
    license.hwid = hwid;
  } else if (license.hwid !== hwid) {
    return res.json({valid: false, error: 'License already activated on another device'});
  }
  
  res.json({
    valid: true,
    expiry: license.expiry
  });
});

app.listen(3000, () => console.log('License server running on port 3000'));
```

## Deploy Options:
1. **Vercel/Netlify**: Free serverless hosting
2. **AWS Lambda**: Scalable serverless
3. **DigitalOcean**: Simple VPS ($5/month)

## Security Enhancements:
- Add HTTPS only
- Rate limiting
- IP whitelisting
- Encrypted license keys
- Database for license storage
