console.log("Browser Pay Extension content script loaded");

// CSS for the payment view modal
const injectPaymentViewStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .breez-payment-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .breez-payment-modal {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 24px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .breez-payment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    .breez-payment-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .breez-payment-details {
      margin-bottom: 20px;
    }
    .breez-payment-details-item {
      margin-bottom: 12px;
    }
    .breez-payment-details-label {
      font-weight: 500;
      margin-bottom: 4px;
      color: #555;
    }
    .breez-payment-details-value {
      word-break: break-all;
      background: #f7f7f7;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .breez-payment-amount {
      margin-bottom: 20px;
    }
    .breez-payment-amount-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .breez-payment-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .breez-payment-button {
      padding: 10px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      font-size: 14px;
    }
    .breez-payment-cancel {
      background-color: #f1f1f1;
      color: #333;
    }
    .breez-payment-pay {
      background-color: #0070f3;
      color: white;
    }
    .breez-payment-pay:disabled {
      background-color: #88b7f3;
      cursor: not-allowed;
    }
    .breez-payment-error {
      color: #e53935;
      margin-top: 12px;
      font-size: 14px;
    }
    .breez-payment-success {
      color: #43a047;
      margin-top: 12px;
      font-size: 14px;
    }
    .breez-payment-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 12px;
    }
    .breez-payment-spinner {
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top: 3px solid #0070f3;
      width: 16px;
      height: 16px;
      animation: breez-spin 1s linear infinite;
    }
    @keyframes breez-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

// Inject the styles when the content script loads
injectPaymentViewStyles();

// Helper function to handle messaging with timeout
function sendMessageWithTimeout(message: any, timeout = 5000): Promise<any> {
  return new Promise((resolve) => {
    // Set a timeout in case the message port closes
    const timer = setTimeout(() => {
      console.warn("Message response timed out");
      resolve({ error: "timeout" });
    }, timeout);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);

        // Check for runtime errors
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          resolve({ error: chrome.runtime.lastError });
          return;
        }

        resolve(response);
      });
    } catch (err) {
      clearTimeout(timer);
      console.error("Error sending message:", err);
      resolve({ error: err });
    }
  });
}

// Function to show the payment view
function showPaymentView(url: string, paymentDetails: any): HTMLElement {
  // Create the modal container
  const overlay = document.createElement("div");
  overlay.className = "breez-payment-overlay";

  // Create the modal content
  const modal = document.createElement("div");
  modal.className = "breez-payment-modal";

  // Create the header
  const header = document.createElement("div");
  header.className = "breez-payment-header";

  const title = document.createElement("h2");
  title.className = "breez-payment-title";
  title.textContent = paymentDetails.type || "Lightning Payment";

  header.appendChild(title);
  modal.appendChild(header);

  // Create the payment details section
  const detailsSection = document.createElement("div");
  detailsSection.className = "breez-payment-details";

  // Add payment description
  const descriptionDetail = document.createElement("div");
  descriptionDetail.className = "breez-payment-details-item";

  const descriptionLabel = document.createElement("div");
  descriptionLabel.className = "breez-payment-details-label";
  descriptionLabel.textContent = "Description";

  const descriptionValue = document.createElement("div");
  descriptionValue.className = "breez-payment-details-value";
  descriptionValue.textContent = paymentDetails.description;

  descriptionDetail.appendChild(descriptionLabel);
  descriptionDetail.appendChild(descriptionValue);
  detailsSection.appendChild(descriptionDetail);

  // Create amount input if needed
  let amountInput: HTMLInputElement | null = null;
  if (paymentDetails.needsAmount) {
    const amountSection = document.createElement("div");
    amountSection.className = "breez-payment-amount";

    const amountLabel = document.createElement("div");
    amountLabel.className = "breez-payment-details-label";
    amountLabel.textContent = "Amount";

    amountInput = document.createElement("input");
    amountInput.className = "breez-payment-amount-input";
    amountInput.type = "number";
    amountInput.min = paymentDetails.minAmount ? paymentDetails.minAmount.toString() : "1";
    amountInput.max = paymentDetails.maxAmount ? paymentDetails.maxAmount.toString() : undefined;
    amountInput.value = paymentDetails.minAmount ? paymentDetails.minAmount.toString() : "";
    amountInput.placeholder = "Enter amount in satoshis";

    amountSection.appendChild(amountLabel);
    amountSection.appendChild(amountInput);
    modal.appendChild(amountSection);
  } else if (paymentDetails.amount) {
    const amountDetail = document.createElement("div");
    amountDetail.className = "breez-payment-details-item";

    const amountLabel = document.createElement("div");
    amountLabel.className = "breez-payment-details-label";
    amountLabel.textContent = "Amount";

    const amountValue = document.createElement("div");
    amountValue.className = "breez-payment-details-value";
    amountValue.textContent = `${paymentDetails.amount} sats`;

    amountDetail.appendChild(amountLabel);
    amountDetail.appendChild(amountValue);
    detailsSection.appendChild(amountDetail);
  }

  // Create the action buttons
  const actionsSection = document.createElement("div");
  actionsSection.className = "breez-payment-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "breez-payment-button breez-payment-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    closeModal(false);
  });

  const payBtn = document.createElement("button");
  payBtn.className = "breez-payment-button breez-payment-pay";
  payBtn.textContent = "Pay";
  payBtn.addEventListener("click", async () => {
    if (amountInput && !amountInput.value) {
      showError("Please enter an amount");
      return;
    }

    const amount = amountInput
      ? parseInt(amountInput.value, 10)
      : paymentDetails.amount;
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    await processPayment(url, amount);
  });

  actionsSection.appendChild(cancelBtn);
  actionsSection.appendChild(payBtn);

  // Status message element
  const statusMessage = document.createElement("div");
  statusMessage.className = "breez-payment-error";
  statusMessage.style.display = "none";

  // Loading indicator
  const loadingSection = document.createElement("div");
  loadingSection.className = "breez-payment-loading";
  loadingSection.style.display = "none";

  const spinner = document.createElement("div");
  spinner.className = "breez-payment-spinner";

  const loadingText = document.createElement("span");
  loadingText.textContent = "Processing payment...";

  loadingSection.appendChild(spinner);
  loadingSection.appendChild(loadingText);

  // Assemble the modal
  modal.appendChild(detailsSection);
  modal.appendChild(actionsSection);
  modal.appendChild(statusMessage);
  modal.appendChild(loadingSection);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Function to show error messages
  function showError(message: string) {
    statusMessage.textContent = message;
    statusMessage.className = "breez-payment-error";
    statusMessage.style.display = "block";
  }

  // Function to show success messages
  function showSuccess(message: string) {
    statusMessage.textContent = message;
    statusMessage.className = "breez-payment-success";
    statusMessage.style.display = "block";
  }

  // Function to show/hide loading indicator
  function showLoading(isLoading: boolean) {
    loadingSection.style.display = isLoading ? "flex" : "none";
    payBtn.disabled = isLoading;
    cancelBtn.disabled = isLoading;
  }

  // Function to close the modal
  function closeModal(wasSuccessful: boolean) {
    overlay.remove();
    if (!wasSuccessful) {
      window.location.href = url;
    }
  }

  // Function to process the payment
  async function processPayment(paymentUrl: string, amount: number) {
    showLoading(true);
    statusMessage.style.display = "none";

    try {
      const response = await sendMessageWithTimeout({
        type: "PROCESS_PAYMENT",
        url: paymentUrl,
        amount: amount,
      });

      showLoading(false);

      if (response.error) {
        showError(`Payment failed: ${response.error}`);
        return;
      }

      if (response.success) {
        showSuccess("Payment successful!");
        // Close modal after 2 seconds on success
        setTimeout(() => {
          closeModal(true);
        }, 2000);
      } else {
        showError(`Payment failed: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      showLoading(false);
      showError(`Error processing payment: ${error}`);
    }
  }

  return overlay;
}

// Function to intercept link clicks
document.addEventListener("click", async function (event) {
  // Find if the clicked element is a link or has a link parent
  const element = event.target as HTMLElement;
  const anchor =
    element.tagName === "A"
      ? (element as HTMLAnchorElement)
      : element.closest("a");

  // If it's not a link or doesn't have an href, ignore it
  if (!anchor || !anchor.href) {
    return;
  }

  // Store the URL to use it later (in case we lose reference to the element)
  const url = anchor.href;

  // Prevent default navigation until we check if it's a payment link
  event.preventDefault();

  try {
    // Send URL to background script for checking with timeout
    const response = await sendMessageWithTimeout({
      type: "CHECK_PAYMENT_URL",
      url: url,
    });

    // Check if we got an error or timeout
    if (response?.error) {
      console.warn(
        "Error or timeout occurred, continuing with normal navigation"
      );
      window.location.href = url;
      return;
    }

    if (response && response.isValid && response.details) {
      console.log("Valid payment URL detected:", url);
      console.log("Payment details:", response.details);

      // Show the payment view with the details we already have
      showPaymentView(url, response.details);
    } else {
      // Not a payment URL, continue with normal navigation
      console.log("Not a payment URL, continuing with normal navigation");
      window.location.href = url;
    }
  } catch (error) {
    // Fallback for any uncaught errors
    console.error("Uncaught error when processing link:", error);
    window.location.href = url;
  }
});

// Check SDK status when content script loads with improved error handling
sendMessageWithTimeout({ type: "GET_SDK_STATUS" })
  .then((response) => {
    if (response?.error) {
      console.warn("Error checking SDK status:", response.error);
      return;
    }
    console.log("Breez SDK initialized status:", response?.initialized);
  })
  .catch((error) => {
    console.error("Failed to check SDK status:", error);
  });

export {};
