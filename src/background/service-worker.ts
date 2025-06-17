// Import Breez SDK
import init, {
  BindingLiquidSdk,
  ConnectRequest,
  connect,
  defaultConfig,
} from "@breeztech/breez-sdk-liquid";

// SDK instance
let initializedWasm = false;
let sdk: BindingLiquidSdk | null = null;

// Function to check if a URL is a valid payment URL and return payment details
async function validateAndGetPaymentDetails(url: string): Promise<any> {
  try {
    if (!sdk || !initializedWasm) {
      console.log("SDK not initialized, cannot parse URL");
      return { isValid: false };
    }

    try {
      // Parse the URL to get payment details
      const parseResult = await sdk.parse(url);

      if (!parseResult || !parseResult.type) {
        console.log("Not a valid payment URL - no type detected");
        return { isValid: false };
      }

      // Format the details according to the payment type
      let details: any = {
        type: parseResult.type,
        needsAmount: false,
      };

      if (parseResult.type === "bolt11") {
        const invoice = parseResult.invoice;
        details.type = "BOLT11";
        details.amount = invoice.amountMsat
          ? invoice.amountMsat / 1000
          : undefined;
        details.description = invoice.description || "BOLT11 Invoice Payment";
        details.needsAmount = !invoice.amountMsat;
      } else if (parseResult.type === "bolt12Offer") {
        const offer = parseResult.offer;
        details.type = "BOLT12 Offer";
        details.minAmount = offer.minAmount
          ? offer.minAmount.type === "bitcoin"
            ? Number(offer.minAmount.amountMsat) / 1000
            : undefined
          : undefined;
        details.description = offer.description || "BOLT12 Offer Payment";
        details.needsAmount = true;
      } else if (parseResult.type === "lnUrlPay") {
        const lnurlPay = parseResult.data;
        details.type = "LNURL-Pay";
        details.minAmount = lnurlPay.minSendable / 1000; // Convert msats to sats
        details.maxAmount = lnurlPay.maxSendable / 1000; // Convert msats to sats
        details.description =
          metadataPlainText(lnurlPay.metadataStr) || "LNURL-Pay Request";
        details.needsAmount = true;
      } else {
        return { isValid: false };
      }

      console.log("Valid payment URL detected with details:", details);
      return { isValid: true, details };
    } catch (error) {
      // If parsing throws an error, it's not a valid payment URL
      console.log("Not a valid payment URL:", error);
      return { isValid: false };
    }
  } catch (error) {
    console.error("Error in validateAndGetPaymentDetails:", error);
    return { isValid: false };
  }
}

function metadataPlainText(metadata: string): string | undefined {
  const parsedMetadata = JSON.parse(metadata);
  if (
    !parsedMetadata ||
    !Array.isArray(parsedMetadata) ||
    parsedMetadata.length === 0
  ) {
    return undefined;
  }

  for (const item of parsedMetadata) {
    if (item[0] === "text/plain") {
      return item[1];
    }
  }
}

// Function to process a payment
async function processPayment(url: string, amount?: number): Promise<any> {
  try {
    if (!sdk || !initializedWasm) {
      throw new Error("SDK not initialized");
    }

    // Parse the URL to get payment details
    const parseResult = await sdk.parse(url);

    if (!parseResult) {
      throw new Error("Failed to parse payment URL");
    }

    if (
      !amount &&
      (parseResult.type === "bolt12Offer" || parseResult.type === "lnUrlPay")
    ) {
      throw new Error("Amount is required for LNURL-Pay");
    }

    // Process payment according to type
    if (parseResult.type === "bolt11" || parseResult.type === "bolt12Offer") {
      // Pay BOLT11/BOLT12
      const prepareResponse = await sdk.prepareSendPayment({
        destination: url,
        amount: amount
          ? { type: "bitcoin", receiverAmountSat: amount }
          : undefined,
      });

      const response = await sdk.sendPayment({
        prepareResponse,
      });
      console.log("Payment response:", response);
      return {
        success: true,
      };
    } else if (parseResult.type === "lnUrlPay") {
      // Pay LNURL-Pay
      const prepareResponse = await sdk.prepareLnurlPay({
        data: parseResult.data,
        bip353Address: parseResult.bip353Address,
        amount: { type: "bitcoin", receiverAmountSat: amount! },
      });

      const response = await sdk.lnurlPay({
        prepareResponse: prepareResponse,
      });
      console.log("LNURL-Pay response:", response);
      return {
        success: true,
      };
    } else {
      throw new Error(`Unsupported payment type: ${parseResult.type}`);
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    throw error;
  }
}

async function initSdk(mnemonic?: string) {
  try {
    if (!initializedWasm) {
      // Initialize the Breez SDK WASM module
      await init();
      initializedWasm = true;
    }

    console.log("Initializing Breez SDK...");

    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_BREEZ_API_KEY;

    if (!apiKey || apiKey === "your_actual_api_key_here") {
      console.error("Please set a valid API key in the .env file");
      return false;
    }

    // If no mnemonic provided, try to get it from storage
    if (!mnemonic) {
      const result = await chrome.storage.local.get("mnemonic");
      mnemonic = result.mnemonic;

      if (!mnemonic) {
        console.log("No mnemonic found in storage");
        return false;
      }
    }

    // Create a proper connection request with config
    const config = defaultConfig("mainnet", apiKey);

    // Connect to the SDK
    const connectRequest: ConnectRequest = {
      mnemonic: mnemonic,
      config: config,
    };

    sdk = await connect(connectRequest);
    console.log("Breez SDK initialized successfully");

    // Example: Get wallet info
    try {
      const info = await sdk.getInfo();
      console.log("Wallet info:", info);
    } catch (error) {
      console.error("Error getting wallet info:", error);
    }

    return true;
  } catch (error) {
    console.error("Failed to initialize Breez SDK:", error);
    return false;
  }
}

// Check if we have a stored mnemonic and initialize SDK
async function checkAndInitSdk() {
  try {
    const result = await chrome.storage.local.get("mnemonic");
    if (result.mnemonic) {
      return await initSdk(result.mnemonic);
    } else {
      console.log(
        "No mnemonic found in storage, waiting for user to provide one"
      );
      return false;
    }
  } catch (error) {
    console.error("Error checking for mnemonic:", error);
    return false;
  }
}

// Disconnect SDK and clear mnemonic
async function disconnectSdk() {
  try {
    // Close the SDK if it's initialized
    if (sdk) {
      await sdk.disconnect();
      sdk = null;
      console.log("SDK disconnected successfully");
    }

    // Clear the mnemonic from storage
    await chrome.storage.local.remove("mnemonic");
    console.log("Mnemonic removed from storage");

    return true;
  } catch (error) {
    console.error("Error disconnecting SDK:", error);
    return false;
  }
}

// Call this on startup
checkAndInitSdk();

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SDK_STATUS") {
    sendResponse({ initialized: sdk !== null });
    return true;
  }

  if (message.type === "SET_MNEMONIC") {
    const mnemonic = message.mnemonic;
    // Store mnemonic
    chrome.storage.local.set({ mnemonic }, async () => {
      const success = await initSdk(mnemonic);
      sendResponse({ success });
    });
    return true; // Required to use sendResponse asynchronously
  }

  if (message.type === "RESET_MNEMONIC") {
    disconnectSdk().then((success) => {
      sendResponse({ success });
    });
    return true; // Required to use sendResponse asynchronously
  }

  // Handler to check if a URL is a valid payment URL AND return payment details
  if (message.type === "CHECK_PAYMENT_URL") {
    const url = message.url.replace("lightning:", "");
    console.log("Received URL to check:", url);

    // Check if the URL is a valid payment URL and get details in one go
    validateAndGetPaymentDetails(url)
      .then((result) => {
        console.log("URL validation and details result:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Error validating URL:", error);
        sendResponse({ isValid: false, error: error.toString() });
      });

    return true; // Required for async sendResponse
  }

  // Handler to process payments
  if (message.type === "PROCESS_PAYMENT") {
    const url = message.url.replace("lightning:", "");
    const amount = message.amount;
    console.log(`Processing payment for ${url} with amount ${amount}`);

    // Process the payment
    processPayment(url, amount)
      .then((result) => {
        console.log("Payment result:", result);
        sendResponse({ success: true, ...result });
      })
      .catch((error) => {
        console.error("Payment error:", error);
        sendResponse({
          success: false,
          message: error.toString(),
          error: error.toString(),
        });
      });

    return true; // Required for async sendResponse
  }

  // Check if mnemonic is set
  if (message.type === "CHECK_MNEMONIC") {
    chrome.storage.local.get("mnemonic", (result) => {
      sendResponse({ hasMnemonic: !!result.mnemonic });
    });
    return true; // Required to use sendResponse asynchronously
  }
});

// Handle service worker lifecycle events
self.addEventListener("activate", (_event) => {
  console.log("Service worker activated");
});

// Keep the service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log("Browser started, initializing service worker");
  checkAndInitSdk();
});

export {};
