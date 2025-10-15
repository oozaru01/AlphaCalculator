// License validation service
const LICENSE_API = 'https://your-license-server.com/api/validate';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'validateLicense') {
    validateLicense(request.key).then(sendResponse);
    return true;
  }
});

async function validateLicense(licenseKey) {
  try {
    const response = await fetch(LICENSE_API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        key: licenseKey,
        hwid: await getHWID()
      })
    });
    const data = await response.json();
    
    if (data.valid) {
      await chrome.storage.local.set({
        license: licenseKey,
        expiry: data.expiry,
        validated: Date.now()
      });
    }
    return data;
  } catch (error) {
    return {valid: false, error: 'Connection failed'};
  }
}

async function getHWID() {
  const stored = await chrome.storage.local.get('hwid');
  if (stored.hwid) return stored.hwid;
  
  const hwid = crypto.randomUUID();
  await chrome.storage.local.set({hwid});
  return hwid;
}

// Periodic validation every 24h
chrome.alarms.create('validateLicense', {periodInMinutes: 1440});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'validateLicense') {
    const {license} = await chrome.storage.local.get('license');
    if (license) await validateLicense(license);
  }
});
