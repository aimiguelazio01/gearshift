// NFC Card Writer Studio - Web Serial Controller & NDEF Generator

let port = null;
let reader = null;
let inputStream = null;
let inputDone = null;
let activeType = 'URL';

// DOM Elements
const btnUsbSwitch = document.getElementById('btn-usb-switch');
const portStatusBadge = document.getElementById('port-status-badge');
const portStatusText = document.getElementById('port-status-text');
const baudSelect = document.getElementById('baud-select');
const payloadInput = document.getElementById('payload-input');
const byteCounter = document.getElementById('byte-counter');
const capacityFill = document.getElementById('capacity-fill');
const tabUrl = document.getElementById('tab-url');
const tabText = document.getElementById('tab-text');
const fieldDesc = document.getElementById('field-label-desc');
const ndefPageGrid = document.getElementById('ndef-page-grid');
const terminalOutput = document.getElementById('terminal-output');
const btnWrite = document.getElementById('btn-write');
const btnRead = document.getElementById('btn-read');
const btnClearLog = document.getElementById('btn-clear-log');
const cmdInput = document.getElementById('cmd-input');
const btnCmdSend = document.getElementById('btn-cmd-send');
const btnLangToggle = document.getElementById('btn-lang-toggle');
const btnCloseApp = document.getElementById('btn-close-app');

// Internationalization i18n
let currentLang = 'pt';
const translations = {
  pt: {
    app_subtitle: "NFC Card Writer Studio • Controlador Série NTAG215 & PN532",
    btn_usb: "Conectar Porta USB",
    btn_usb_disconnect: "Desconectar USB",
    status_connected: "Conectado",
    status_disconnected: "Desconectado",
    card_title: "Gravador de Cartões NFC NTAG215",
    field_label: "Endereço Web (URL) da App do Cliente",
    btn_write: "Write Card",
    step1: "Passo 1: Verifique a URL do cliente e clique em <strong>Write Card</strong>.",
    step2: "Passo 2: Encoste fisicamente o seu cartão NTAG215 no leitor PN532 para gravar!",
    monitor_title: "Monitor Série USB em Tempo Real (Serial Monitor)",
    btn_clear: "Limpar Consola",
    btn_send: "Enviar",
    btn_close: "Fechar",
    waiting_title: "A aguardar gravação...",
    waiting_desc: "A compilar código e a enviar para o leitor PN532... Encoste o seu cartão NTAG215 agora!",
    btn_cancel_waiting: "Cancelar",
    cmd_placeholder: "Enviar comando série (ex: WRITE:URL:http://localhost:3000/portal/joaoferreira ou STATUS)...",
    system_ready: "Sistema pronto. Clique em 'Conectar Porta USB' para ligar ao leitor PN532 ou envie diretamente para o Arduino.",
    lang_btn: "🇵🇹 PT"
  },
  en: {
    app_subtitle: "NFC Card Writer Studio • NTAG215 & PN532 Serial Controller",
    btn_usb: "Connect USB Port",
    btn_usb_disconnect: "Disconnect USB",
    status_connected: "Connected",
    status_disconnected: "Disconnected",
    card_title: "NFC Card Writer (NTAG215)",
    field_label: "Client App Web Address (URL)",
    btn_write: "Write Card",
    step1: "Step 1: Verify client URL and click <strong>Write Card</strong>.",
    step2: "Step 2: Touch your physical NTAG215 card against the PN532 reader module to write!",
    monitor_title: "Real-Time USB Serial Monitor",
    btn_clear: "Clear Console",
    btn_send: "Send",
    btn_close: "Close",
    waiting_title: "Waiting...",
    waiting_desc: "Compiling code and flashing PN532 reader... Touch your NTAG215 card now!",
    btn_cancel_waiting: "Cancel",
    cmd_placeholder: "Type raw serial command (e.g. WRITE:URL:http://localhost:3000/portal/joaoferreira or STATUS)...",
    system_ready: "System ready. Click 'Connect USB Port' to select your Arduino board serial port or flash directly.",
    lang_btn: "🇬🇧 EN"
  }
};

function applyLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];
  
  const txtAppSubtitle = document.getElementById('txt-app-subtitle');
  if (txtAppSubtitle) txtAppSubtitle.innerText = t.app_subtitle;
  
  const txtBtnUsb = document.getElementById('txt-btn-usb');
  if (txtBtnUsb) txtBtnUsb.innerText = port ? t.btn_usb_disconnect : t.btn_usb;

  const portStatusText = document.getElementById('port-status-text');
  if (portStatusText) portStatusText.innerText = port ? t.status_connected : t.status_disconnected;

  const fieldLabelDesc = document.getElementById('field-label-desc');
  if (fieldLabelDesc) fieldLabelDesc.innerText = t.field_label;

  const txtBtnWrite = document.getElementById('txt-btn-write');
  if (txtBtnWrite) txtBtnWrite.innerText = t.btn_write;

  const txtMonitorTitle = document.getElementById('txt-monitor-title');
  if (txtMonitorTitle) {
    const iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
    txtMonitorTitle.innerHTML = `${iconSvg} ${t.monitor_title}`;
  }

  const btnClearLog = document.getElementById('btn-clear-log');
  if (btnClearLog) btnClearLog.innerText = t.btn_clear;

  const txtBtnSend = document.getElementById('txt-btn-send');
  if (txtBtnSend) txtBtnSend.innerText = t.btn_send;

  const txtBtnClose = document.getElementById('txt-btn-close');
  if (txtBtnClose) txtBtnClose.innerText = t.btn_close;

  const txtWaitingTitle = document.getElementById('txt-waiting-title');
  if (txtWaitingTitle) txtWaitingTitle.innerText = t.waiting_title;

  const txtWaitingDesc = document.getElementById('txt-waiting-desc');
  if (txtWaitingDesc) txtWaitingDesc.innerText = t.waiting_desc;

  const txtBtnCancelWaiting = document.getElementById('txt-btn-cancel-waiting');
  if (txtBtnCancelWaiting) txtBtnCancelWaiting.innerText = t.btn_cancel_waiting;

  const cmdInput = document.getElementById('cmd-input');
  if (cmdInput) cmdInput.placeholder = t.cmd_placeholder;

  const bannerText = document.getElementById('banner-text');
  if (bannerText && !bannerText.dataset.custom) {
    bannerText.innerHTML = `<strong>Passo 1 / Step 1:</strong> ${t.step1.replace(/Passo 1: |Step 1: /, '')}<br><strong>Passo 2 / Step 2:</strong> ${t.step2.replace(/Passo 2: |Step 2: /, '')}`;
  }

  if (btnLangToggle) btnLangToggle.innerHTML = `<span>${t.lang_btn}</span>`;
}

// Close Application Handler
function handleCloseApp() {
  if (port) {
    disconnectUsb().catch(() => {});
  }
  // Close the window tab
  window.close();
  // Fallback if browser prevents closing main tab: navigate back to workshop app
  setTimeout(() => {
    window.location.href = 'http://localhost:3000/customers';
  }, 300);
}

// Check Web Serial Browser Compatibility
if (!('serial' in navigator)) {
  appendLog("[Warning] Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera over HTTPS/localhost.", "err");
  if (btnUsbSwitch) {
    btnUsbSwitch.disabled = true;
    btnUsbSwitch.title = "Web Serial API unavailable in this browser";
  }
}

// Event Listeners
if (btnUsbSwitch) btnUsbSwitch.addEventListener('click', toggleUsbConnection);
if (tabUrl) tabUrl.addEventListener('click', () => setType('URL'));
if (tabText) tabText.addEventListener('click', () => setType('TEXT'));
if (payloadInput) payloadInput.addEventListener('input', updateVisualizer);
if (btnWrite) btnWrite.addEventListener('click', handleWriteCommand);
if (btnRead) btnRead.addEventListener('click', () => sendSerialCommand('READ'));
if (btnClearLog) btnClearLog.addEventListener('click', () => { if (terminalOutput) terminalOutput.innerHTML = ''; });
if (btnCmdSend) btnCmdSend.addEventListener('click', () => {
  if (cmdInput && cmdInput.value.trim()) {
    sendSerialCommand(cmdInput.value.trim());
    cmdInput.value = '';
  }
});
if (cmdInput) cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && cmdInput.value.trim()) {
    sendSerialCommand(cmdInput.value.trim());
    cmdInput.value = '';
  }
});
if (btnLangToggle) btnLangToggle.addEventListener('click', () => {
  applyLanguage(currentLang === 'pt' ? 'en' : 'pt');
});
if (btnCloseApp) btnCloseApp.addEventListener('click', handleCloseApp);

// Quick Presets
document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = chip.getAttribute('data-preset');
    payloadInput.value = val;
    if (val.startsWith('http://') || val.startsWith('https://')) {
      setType('URL');
    } else {
      setType('TEXT');
    }
    updateVisualizer();
    showToast(`Loaded preset: ${val}`);
  });
});

// Toggle Type URL vs TEXT
function setType(type) {
  activeType = type;
  if (type === 'URL') {
    if (tabUrl) tabUrl.classList.add('active');
    if (tabText) tabText.classList.remove('active');
    if (fieldDesc) fieldDesc.innerText = 'Endereço Web (URL) da App do Cliente';
    if (payloadInput) payloadInput.placeholder = 'http://localhost:3000/portal/nomecliente';
  } else {
    if (tabText) tabText.classList.add('active');
    if (tabUrl) tabUrl.classList.remove('active');
    if (fieldDesc) fieldDesc.innerText = 'Texto Simples para o Cartão NFC';
    if (payloadInput) payloadInput.placeholder = 'Escreva a mensagem aqui...';
  }
  updateVisualizer();
}

// Live NDEF Visualizer & Byte Counter Calculator
function updateVisualizer() {
  const rawData = payloadInput.value || '';
  const bytes = [];

  if (activeType === 'URL') {
    let prefixCode = 0x04; // Default to https:// scheme
    let cleanData = rawData;

    if (rawData.startsWith('https://www.')) {
      prefixCode = 0x02;
      cleanData = rawData.substring(12);
    } else if (rawData.startsWith('http://www.')) {
      prefixCode = 0x01;
      cleanData = rawData.substring(11);
    } else if (rawData.startsWith('https://')) {
      prefixCode = 0x04;
      cleanData = rawData.substring(8);
    } else if (rawData.startsWith('http://')) {
      prefixCode = 0x03;
      cleanData = rawData.substring(7);
    } else {
      prefixCode = 0x04;
      cleanData = rawData;
    }

    const uriLen = cleanData.length;
    const recordPayloadLen = 1 + uriLen;
    const ndefMsgLen = 4 + recordPayloadLen;

    bytes.push(0x03, ndefMsgLen, 0xD1, 0x01, recordPayloadLen, 0x55, prefixCode);
    for (let i = 0; i < uriLen; i++) {
      bytes.push(cleanData.charCodeAt(i));
    }
    bytes.push(0xFE);

  } else { // TEXT
    const textLen = rawData.length;
    const recordPayloadLen = 1 + 2 + textLen;
    const ndefMsgLen = 4 + recordPayloadLen;

    bytes.push(0x03, ndefMsgLen, 0xD1, 0x01, recordPayloadLen, 0x54, 0x02, 0x65, 0x6E); // 'e', 'n'
    for (let i = 0; i < textLen; i++) {
      bytes.push(rawData.charCodeAt(i));
    }
    bytes.push(0xFE);
  }

  // Update Counters & Progress Bar
  const totalBytes = bytes.length;
  const maxCapacity = 504; // NTAG215 User Data limit
  if (byteCounter) byteCounter.innerText = `${totalBytes} / ${maxCapacity} Bytes`;
  const pct = Math.min(100, (totalBytes / maxCapacity) * 100);
  if (capacityFill) {
    capacityFill.style.width = `${pct}%`;
    if (totalBytes > maxCapacity) {
      capacityFill.style.background = 'var(--danger)';
      if (byteCounter) byteCounter.style.color = 'var(--danger)';
    } else {
      capacityFill.style.background = 'var(--primary-gradient)';
      if (byteCounter) byteCounter.style.color = 'var(--primary)';
    }
  }

  // Render NTAG215 Page Grid (if present)
  if (ndefPageGrid) {
    ndefPageGrid.innerHTML = '';
    const totalPages = Math.ceil(bytes.length / 4);

    for (let page = 0; page < Math.max(totalPages, 7); page++) {
      const pageNum = 4 + page;
      const pageBytes = [];
      let asciiStr = '';

      for (let b = 0; b < 4; b++) {
        const idx = page * 4 + b;
        if (idx < bytes.length) {
          const val = bytes[idx];
          pageBytes.push(val.toString(16).padStart(2, '0').toUpperCase());
          asciiStr += (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
        } else {
          pageBytes.push('00');
          asciiStr += '.';
        }
      }

      const pageBox = document.createElement('div');
      pageBox.className = 'page-box';
      pageBox.innerHTML = `
        <div class="page-box-header">
          <span>Page ${pageNum}</span>
          <span>0x${pageNum.toString(16).toUpperCase()}</span>
        </div>
        <div class="page-bytes">${pageBytes.join(' ')}</div>
        <div class="page-ascii">${asciiStr}</div>
      `;
      ndefPageGrid.appendChild(pageBox);
    }
  }
}

// Toggle USB Serial Connection
async function toggleUsbConnection() {
  if (port) {
    await disconnectUsb();
  } else {
    await connectUsb();
  }
}

async function connectUsb() {
  try {
    port = await navigator.serial.requestPort();
    const baudRate = parseInt(baudSelect.value);
    await port.open({ baudRate });

    portStatusBadge.classList.add('connected');
    portStatusText.innerText = 'Connected';
    btnUsbSwitch.classList.add('connected');
    btnUsbSwitch.querySelector('span').innerText = 'Disconnect USB';

    appendLog(`[USB] Connected to port at ${baudRate} baud`, "info");
    showToast("USB Port Connected Successfully!", "success");

    readSerialLoop();
  } catch (err) {
    console.error(err);
    appendLog(`[USB Error] ${err.message}`, "err");
    showToast("Failed to connect USB Port", "error");
  }
}

async function disconnectUsb() {
  if (reader) {
    await reader.cancel();
  }
  if (port) {
    await port.close();
    port = null;
  }

  portStatusBadge.classList.remove('connected');
  portStatusText.innerText = 'Disconnected';
  btnUsbSwitch.classList.remove('connected');
  btnUsbSwitch.querySelector('span').innerText = 'Connect USB Port';

  appendLog("[USB] Serial port disconnected", "info");
  showToast("USB Port Disconnected");
}

// Serial Stream Reader Loop
async function readSerialLoop() {
  const textDecoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(textDecoder.writable);
  inputStream = textDecoder.readable;
  reader = inputStream.getReader();

  let lineBuffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop(); // Keep incomplete tail line in buffer

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine) {
            handleIncomingSerialLine(cleanLine);
          }
        }
      }
    }
  } catch (err) {
    appendLog(`[Serial Read Error] ${err.message}`, "err");
  } finally {
    reader.releaseLock();
  }
}

// Waiting Modal Popup Controls
const btnCancelWaiting = document.getElementById('btn-cancel-waiting');
let waitingModalTimer = null;

function showWaitingModal(subText) {
  const modal = document.getElementById('waiting-modal-overlay');
  const sub = document.getElementById('txt-waiting-sub');
  if (sub && subText) sub.innerText = subText;
  if (modal) modal.classList.remove('hidden');

  // Clear existing timer if any
  if (waitingModalTimer) clearTimeout(waitingModalTimer);

  // Automatically close the popup window after 5 seconds
  waitingModalTimer = setTimeout(() => {
    hideWaitingModal();
  }, 5000);
}

function hideWaitingModal() {
  const modal = document.getElementById('waiting-modal-overlay');
  if (modal) modal.classList.add('hidden');
  if (waitingModalTimer) {
    clearTimeout(waitingModalTimer);
    waitingModalTimer = null;
  }
}

if (btnCancelWaiting) {
  btnCancelWaiting.addEventListener('click', hideWaitingModal);
}

// Parse Incoming Arduino Serial Feedback
function handleIncomingSerialLine(line) {
  appendLog(`<< ${line}`, "rx");

  const bannerText = document.getElementById('banner-text');

  if (line.startsWith('CARD:DETECTED')) {
    showToast(`⚡ Card Detected! ${line.split(':')[2] || ''}`, "info");
    showWaitingModal("⚡ Cartão detetado! A escrever dados NTAG215...");
    if (bannerText) {
      bannerText.innerHTML = `<strong>⚡ Card Detected:</strong> Writing payload to NTAG215 card...`;
    }
  } else if (line.startsWith('SUCCESS:WRITTEN') || line.includes('is fully updated')) {
    showToast("✅ NFC Card Successfully Written!", "success");
    showWaitingModal("✅ Gravação Concluída com Sucesso!");
    setTimeout(() => {
      hideWaitingModal();
    }, 1200);
    if (bannerText) {
      bannerText.innerHTML = `<strong style="color: var(--success);">✅ Success!</strong> NFC Card Written successfully. You can tap another card or update the payload.`;
    }
  } else if (line.startsWith('ERROR:')) {
    showToast(`❌ Error: ${line.substring(6)}`, "error");
    hideWaitingModal();
    if (bannerText) {
      bannerText.innerHTML = `<strong style="color: var(--danger);">❌ Error:</strong> ${line.substring(6)}. Check reader wiring and card position.`;
    }
  } else if (line.startsWith('READ:DATA:')) {
    showToast("📖 Card Read Complete!", "info");
  }
}

// Send Serial Command to Arduino (Supports Hardware Web Serial + Demo Simulation)
async function sendSerialCommand(cmdStr) {
  if (!port || !port.writable) {
    // Demo / Interactive Simulation when hardware serial port is not active
    appendLog(`>> ${cmdStr}`, "tx");
    if (cmdStr.startsWith("WRITE:URL:")) {
      const urlWritten = cmdStr.substring(10);
      setTimeout(() => appendLog("<< NTAG215 found! Rewriting data blocks...", "rx"), 200);
      setTimeout(() => {
        appendLog(`<< SUCCESS! '${urlWritten}' is fully updated.`, "rx");
        showToast(`✅ NFC Card Successfully Written with '${urlWritten}'!`, "success");
      }, 500);
    } else if (cmdStr.startsWith("WRITE:TEXT:")) {
      const textWritten = cmdStr.substring(11);
      setTimeout(() => appendLog("<< NTAG215 found! Rewriting data blocks...", "rx"), 200);
      setTimeout(() => {
        appendLog(`<< SUCCESS! '${textWritten}' is fully updated.`, "rx");
        showToast("✅ NFC Card Successfully Written!", "success");
      }, 500);
    } else if (cmdStr === "READ") {
      setTimeout(() => appendLog("<< NTAG215 found! Reading page data...", "rx"), 200);
      setTimeout(() => {
        appendLog(`<< READ:DATA:${payloadInput.value}`, "rx");
        showToast("📖 Card Read Complete!", "info");
      }, 500);
    } else {
      setTimeout(() => appendLog(`<< OK:EXEC:${cmdStr}`, "rx"), 200);
    }
    return;
  }

  try {
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    await writer.write(encoder.encode(cmdStr + '\n'));
    writer.releaseLock();

    appendLog(`>> ${cmdStr}`, "tx");
  } catch (err) {
    appendLog(`[USB Write Error] ${err.message}`, "err");
  }
}

function handleWriteCommand() {
  let data = payloadInput.value.trim();
  if (!data) {
    showToast("Please enter text or a URL first", "error");
    return;
  }

  // Auto-prepend https:// for URL type if no scheme is present
  if (activeType === 'URL' && !data.match(/^https?:\/\//i)) {
    data = 'https://' + data;
    payloadInput.value = data;
    updateVisualizer();
  }

  const cmd = `WRITE:${activeType}:${data}`;
  const bannerText = document.getElementById('banner-text');

  showWaitingModal("Encoste o seu cartão NTAG215 no leitor PN532 agora...");

  if (port && port.writable) {
    // Web Serial is connected: Send payload command directly over USB Serial
    sendSerialCommand(cmd);
    appendLog(`[USB] Payload set to "${data}". TAP your NTAG215 card on the PN532 reader now!`, "info");
    showToast("📲 Payload set! Tap your NTAG215 card on reader to write.", "info");
    if (bannerText) {
      bannerText.innerHTML = `<strong>📲 Ready to Write:</strong> Tap your physical NTAG215 card against the PN532 reader module now!`;
    }
  } else {
    // Web Serial not connected: Update .ino source and upload sketch via backend server
    appendLog(`[App] USB Port not connected directly in browser. Flashing payload via background upload...`, "info");
    syncArduinoSource(data, activeType);
  }
}

// Sync the Arduino .ino source file AND upload to board
async function syncArduinoSource(payload, type) {
  const bannerText = document.getElementById('banner-text');
  showWaitingModal("A compilar código e a enviar para o Arduino (COM4)...");
  try {
    // Step 1: Update the .ino source file
    appendLog(`[Arduino] Updating nfc.ino with: "${payload}"...`, "info");
    const updateRes = await fetch('/api/update-ino', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, type })
    });
    const updateResult = await updateRes.json();
    if (!updateResult.success) {
      appendLog(`[Arduino Error] ${updateResult.error}`, "err");
      hideWaitingModal();
      return;
    }
    appendLog(`[Arduino] Source updated. Compiling & uploading sketch...`, "info");
    showToast("⚙️ Compiling & uploading to Arduino...", "info");
    showWaitingModal("⚙️ A gravar no Arduino... Quase pronto!");
    if (bannerText) {
      bannerText.innerHTML = `<strong>⚙️ Flashing Arduino:</strong> Compiling & uploading updated sketch...`;
    }

    // Step 2: Compile and upload to the board
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const uploadResult = await uploadRes.json();

    if (uploadResult.success) {
      appendLog(`[Arduino] ✅ Code uploaded to Arduino! NOW TAP your NTAG215 card on the PN532 reader module to write!`, "info");
      showToast("✅ Code uploaded! Tap card on PN532 reader to write", "success");
      showWaitingModal("👉 ENCOSTE O CARTÃO NTAG215 ao leitor PN532!");
      // Auto dismiss modal after 3.5 seconds if card was already touching
      setTimeout(() => {
        hideWaitingModal();
      }, 3500);
      if (bannerText) {
        bannerText.innerHTML = `<strong>👉 STEP 2:</strong> Tap your physical NTAG215 card against the PN532 reader module to write "${payload}"!`;
      }
    } else {
      appendLog(`[Arduino Error] ${uploadResult.error || 'Upload failed'}`, "err");
      showToast(`❌ Upload failed. Connect USB Port in browser or free COM port.`, "error");
      hideWaitingModal();
      if (bannerText) {
        bannerText.innerHTML = `<strong style="color: var(--danger);">❌ Upload Failed:</strong> Make sure COM port is not locked or click "Connect USB Port" to write directly over Web Serial.`;
      }
    }
  } catch (err) {
    appendLog(`[Arduino Error] ${err.message}`, "err");
    showToast("❌ Failed to update Arduino", "error");
    hideWaitingModal();
  }
}

// Helper: Append log line to console terminal
function appendLog(msg, type = "rx") {
  const timeStr = new Date().toLocaleTimeString();
  const lineEl = document.createElement('div');
  lineEl.className = 'log-line';
  lineEl.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-msg ${type}">${escapeHtml(msg)}</span>
  `;
  terminalOutput.appendChild(lineEl);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function showToast(msg, type = "info") {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === "success") toast.style.borderLeftColor = "var(--success)";
  if (type === "error") toast.style.borderLeftColor = "var(--danger)";
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// URL Query Parameter Parsing for auto-loading customer portal URL
const urlParams = new URLSearchParams(window.location.search);
const initialUrl = urlParams.get('url') || urlParams.get('payload');
if (initialUrl) {
  payloadInput.value = initialUrl;
  setType('URL');
  updateVisualizer();
  appendLog(`[App] Loaded customer portal URL: ${initialUrl}`, "info");
  if (urlParams.get('autowrite') === 'true') {
    setTimeout(() => {
      handleWriteCommand();
    }, 500);
  }
} else {
  updateVisualizer();
}
