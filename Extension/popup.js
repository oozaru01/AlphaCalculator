document.getElementById('activate').addEventListener('click', async () => {
  const key = document.getElementById('licenseKey').value.trim();
  const status = document.getElementById('status');
  
  if (!key) {
    status.className = 'status invalid';
    status.textContent = 'Please enter a license key';
    return;
  }
  
  status.className = 'status';
  status.textContent = 'Validating...';
  
  const result = await chrome.runtime.sendMessage({
    action: 'validateLicense',
    key: key
  });
  
  if (result.valid) {
    status.className = 'status valid';
    status.textContent = '✓ License activated successfully!';
    setTimeout(() => window.close(), 2000);
  } else {
    status.className = 'status invalid';
    status.textContent = result.error || 'Invalid license key';
  }
});

// Show current status
chrome.storage.local.get(['license', 'expiry'], (data) => {
  const status = document.getElementById('status');
  if (data.license) {
    const expiry = data.expiry ? new Date(data.expiry).toLocaleDateString() : 'Lifetime';
    status.className = 'status valid';
    status.textContent = `Active until: ${expiry}`;
  }
});
