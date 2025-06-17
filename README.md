# Browser Pay Extension 

⚠️ **IMPORTANT**: This application is for demonstration purposes only.

A browser Chrome extension that demonstrates how to pay Lightning links using the Breez SDK.

## Prerequisites

Before running this application, you'll need:

1. [Node.js](https://nodejs.org/) (v22 or higher)
2. A Breez SDK API key (get one from [Breez SDK](https://breez.technology/request-api-key/#contact-us-form-sdk))
3. A BIP39 mnemonic phrase

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dangeross/dhd-2025-browser-pay-extension.git
   cd dhd-2025-browser-pay-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your values:
   ```bash
   cp example.env .env
   ```

4. Edit the `.env` file with your Breez API key:
   ```
   VITE_BREEZ_API_KEY=your_breez_api_key_here
   ```

### Build

```bash
npm run build
```

The build output will be in the `dist` directory.

## Loading the Extension in Chrome

1. Build the extension using `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by clicking the toggle in the top right
4. Click "Load unpacked" and select the `dist` directory
5. The extension should now be loaded and active

## Usage

1. Click on the extension icon in the browser toolbar to open the popup
2. Enter a Mnemonic if not already set
3. Open a web page that contains Lightning links. You can use [this demo page](demo-links.html) as an example.
4. Click one of the links to open the Payment modal.