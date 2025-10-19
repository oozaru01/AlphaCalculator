// License check before running
(async function() {
  const license = await checkLicense();
  if (!license.valid) {
    showLicenseError(license.message);
    return;
  }
  
  // Your trading calculator code here
  initTradingCalculator();
})();

async function checkLicense() {
  const data = await chrome.storage.local.get(['license', 'expiry', 'validated']);
  
  if (!data.license) {
    return {valid: false, message: 'No license key found'};
  }
  
  if (data.expiry && Date.now() > data.expiry) {
    return {valid: false, message: 'License expired'};
  }
  
  // Revalidate if >24h since last check
  if (!data.validated || Date.now() - data.validated > 86400000) {
    const result = await chrome.runtime.sendMessage({
      action: 'validateLicense',
      key: data.license
    });
    return result;
  }
  
  return {valid: true};
}

function showLicenseError(message) {
  const div = document.createElement('div');
  Object.assign(div.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#ff4444',
    color: 'white',
    padding: '30px',
    borderRadius: '10px',
    zIndex: 999999,
    fontSize: '18px',
    textAlign: 'center'
  });
  div.innerHTML = `
    <div style="font-weight:bold; margin-bottom:10px;">License Error</div>
    <div>${message}</div>
    <div style="margin-top:15px; font-size:14px;">Click extension icon to activate</div>
  `;
  document.body.appendChild(div);
}

function initTradingCalculator() {
  // Paste your TamperMonkey script code here
  // Remove the ==UserScript== header section
  
  console.log('Trading Calculator initialized with valid license');
  
  // Example: Your existing code
  // makeOverlay(...);
  // etc.
}
