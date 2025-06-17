document.addEventListener('DOMContentLoaded', () => {
  const mnemonicForm = document.getElementById('mnemonic-form');
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  const saveMnemonicButton = document.getElementById('save-mnemonic') as HTMLButtonElement;
  const mnemonicError = document.getElementById('mnemonic-error');
  const walletSection = document.getElementById('wallet-section');
  
  // Settings elements
  const showSettingsButton = document.getElementById('show-settings');
  const settingsSection = document.getElementById('settings-section');
  const resetMnemonicButton = document.getElementById('reset-mnemonic') as HTMLButtonElement;
  const backToWalletButton = document.getElementById('back-to-wallet');
  const settingsMessage = document.getElementById('settings-message');

  // Check if mnemonic is set when popup opens
  checkMnemonicAndUpdateUI();

  if (saveMnemonicButton) {
    saveMnemonicButton.addEventListener('click', saveMnemonic);
  }
  
  // Add settings button listeners
  if (showSettingsButton) {
    showSettingsButton.addEventListener('click', showSettings);
  }
  
  if (resetMnemonicButton) {
    resetMnemonicButton.addEventListener('click', resetMnemonic);
  }
  
  if (backToWalletButton) {
    backToWalletButton.addEventListener('click', backToWallet);
  }

  // Function to check if mnemonic is set and update UI accordingly
  function checkMnemonicAndUpdateUI() {
    chrome.runtime.sendMessage({ type: 'CHECK_MNEMONIC' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking mnemonic:', chrome.runtime.lastError);
        return;
      }

      if (response && response.hasMnemonic) {
        // Mnemonic is set, show wallet section
        if (mnemonicForm) mnemonicForm.classList.add('hidden');
        if (walletSection) walletSection.classList.remove('hidden');
        if (settingsSection) settingsSection.classList.add('hidden');
      } else {
        // No mnemonic set, show mnemonic form
        if (mnemonicForm) mnemonicForm.classList.remove('hidden');
        if (walletSection) walletSection.classList.add('hidden');
        if (settingsSection) settingsSection.classList.add('hidden');
      }
    });
  }
  
  // Function to show settings section
  function showSettings() {
    if (walletSection) walletSection.classList.add('hidden');
    if (settingsSection) settingsSection.classList.remove('hidden');
    
    // Hide any previous messages
    if (settingsMessage) settingsMessage.classList.add('hidden');
  }
  
  // Function to go back to wallet view
  function backToWallet() {
    if (settingsSection) settingsSection.classList.add('hidden');
    if (walletSection) walletSection.classList.remove('hidden');
  }
  
  // Function to reset mnemonic
  function resetMnemonic() {
    if (resetMnemonicButton) {
      resetMnemonicButton.textContent = 'Resetting...';
      resetMnemonicButton.disabled = true;
    }
    
    chrome.runtime.sendMessage({ type: 'RESET_MNEMONIC' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error resetting mnemonic:', chrome.runtime.lastError);
        showSettingsMessage('Failed to reset mnemonic. Please try again.', 'error');
        
        if (resetMnemonicButton) {
          resetMnemonicButton.textContent = 'Reset Mnemonic';
          resetMnemonicButton.disabled = false;
        }
        
        return;
      }
      
      if (response && response.success) {
        showSettingsMessage('Mnemonic has been reset successfully.', 'success');
        
        // Short delay before showing the mnemonic form
        setTimeout(() => {
          checkMnemonicAndUpdateUI();
        }, 1500);
      } else {
        showSettingsMessage('Failed to reset mnemonic. Please try again.', 'error');
        
        if (resetMnemonicButton) {
          resetMnemonicButton.textContent = 'Reset Mnemonic';
          resetMnemonicButton.disabled = false;
        }
      }
    });
  }
  
  // Function to display messages in the settings section
  function showSettingsMessage(text: string, type: 'success' | 'error') {
    if (!settingsMessage) return;
    
    settingsMessage.textContent = text;
    settingsMessage.className = `message ${type}`;
    settingsMessage.classList.remove('hidden');
  }

  // Function to save mnemonic and initialize SDK
  function saveMnemonic() {
    if (!mnemonicInput || !mnemonicError) return;
    
    const mnemonic = mnemonicInput.value.trim();
    
    // Simple validation - check if it's roughly a 12-24 word mnemonic
    const wordCount = mnemonic.split(/\s+/).filter(Boolean).length;
    
    if (wordCount < 12 || wordCount > 24) {
      mnemonicError.textContent = 'Please enter a valid mnemonic (12-24 words)';
      mnemonicError.classList.remove('hidden');
      return;
    }
    
    mnemonicError.classList.add('hidden');
    
    // Show loading state
    if (saveMnemonicButton) {
      saveMnemonicButton.textContent = 'Initializing...';
      saveMnemonicButton.disabled = true;
    }
    
    // Send mnemonic to background script
    chrome.runtime.sendMessage({ 
      type: 'SET_MNEMONIC',
      mnemonic: mnemonic
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error saving mnemonic:', chrome.runtime.lastError);
        
        if (mnemonicError) {
          mnemonicError.textContent = 'Failed to initialize wallet';
          mnemonicError.classList.remove('hidden');
        }
        
        if (saveMnemonicButton) {
          saveMnemonicButton.textContent = 'Initialize Wallet';
          saveMnemonicButton.disabled = false;
        }
        
        return;
      }

      if (response && response.success) {
        // SDK initialized successfully
        checkMnemonicAndUpdateUI();
      } else {
        // SDK initialization failed
        if (mnemonicError) {
          mnemonicError.textContent = 'Failed to initialize wallet with this mnemonic';
          mnemonicError.classList.remove('hidden');
        }
        
        if (saveMnemonicButton) {
          saveMnemonicButton.textContent = 'Initialize Wallet';
          saveMnemonicButton.disabled = false;
        }
      }
    });
  }
});