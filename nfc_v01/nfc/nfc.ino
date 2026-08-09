#include <Wire.h>
#include <Adafruit_PN532.h>

#define PN532_IRQ   (2)
#define PN532_RESET (3)

Adafruit_PN532 nfc(PN532_IRQ, PN532_RESET);

// State variables
String pendingPayload = "https://gearshift-one.vercel.app/portal/miguelalmeida";
String pendingType = "URL"; // "URL" or "TEXT"
bool hasPendingWrite = true;
bool autoReadOnTap = false;

void setup(void) {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  Serial.println("STATUS:INIT");
  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("ERROR:PN532_NOT_FOUND");
    while (1) {
      delay(1000);
    }
  }
  
  nfc.SAMConfig();
  Serial.println("STATUS:READY");
  Serial.println("Initializing PN532 for NTAG215...");
  Serial.println("Place your NTAG215 card to update...");
  Serial.println("INFO:Pending Payload=" + pendingPayload);
}

void parseSerialCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd.startsWith("WRITE:URL:")) {
    pendingPayload = cmd.substring(10);
    pendingType = "URL";
    hasPendingWrite = true;
    Serial.println("OK:SET_URL:" + pendingPayload);
  } else if (cmd.startsWith("WRITE:TEXT:")) {
    pendingPayload = cmd.substring(11);
    pendingType = "TEXT";
    hasPendingWrite = true;
    Serial.println("OK:SET_TEXT:" + pendingPayload);
  } else if (cmd == "READ") {
    autoReadOnTap = true;
    Serial.println("OK:WAITING_CARD_READ");
  } else if (cmd == "STATUS") {
    Serial.println("STATUS:READY");
    Serial.println("INFO:Pending Payload=" + pendingPayload + " (" + pendingType + ")");
  } else if (cmd == "CLEAR") {
    hasPendingWrite = false;
    Serial.println("OK:CLEARED");
  } else {
    Serial.println("ERROR:UNKNOWN_COMMAND");
  }
}

bool writeNtag215Payload(String data, String type) {
  uint8_t payloadBytes[500];
  uint16_t payloadLen = 0;
  
  if (type == "URL") {
    uint8_t prefixCode = 0x04; // Default to 0x04 (https://)
    String cleanData = data;
    
    if (data.startsWith("https://www.")) {
      prefixCode = 0x02;
      cleanData = data.substring(12);
    } else if (data.startsWith("http://www.")) {
      prefixCode = 0x01;
      cleanData = data.substring(11);
    } else if (data.startsWith("https://")) {
      prefixCode = 0x04;
      cleanData = data.substring(8);
    } else if (data.startsWith("http://")) {
      prefixCode = 0x03;
      cleanData = data.substring(7);
    } else {
      prefixCode = 0x04; // Default scheme https:// if user omitted protocol
      cleanData = data;
    }

    uint8_t uriStringLen = cleanData.length();
    uint8_t recordPayloadLen = 1 + uriStringLen; // 1 prefix byte + string length
    uint8_t ndefMsgLen = 4 + recordPayloadLen;  // 0xD1, 0x01, PL, 0x55 + recordPayload

    // Construct raw bytes sequence starting at Page 4
    payloadBytes[0] = 0x03; // NDEF TLV tag
    payloadBytes[1] = ndefMsgLen;
    payloadBytes[2] = 0xD1; // Header (MB=1, ME=1, SR=1, TNF=1)
    payloadBytes[3] = 0x01; // Type Length ('U')
    payloadBytes[4] = recordPayloadLen;
    payloadBytes[5] = 0x55; // Record Type 'U' (0x55)
    payloadBytes[6] = prefixCode;

    for (uint8_t i = 0; i < uriStringLen; i++) {
      payloadBytes[7 + i] = cleanData.charAt(i);
    }
    
    payloadLen = 7 + uriStringLen;
    payloadBytes[payloadLen++] = 0xFE; // Terminator TLV tag
    
  } else { // TEXT
    uint8_t textLen = data.length();
    uint8_t recordPayloadLen = 1 + 2 + textLen; // status byte(0x02) + "en" + text
    uint8_t ndefMsgLen = 4 + recordPayloadLen;

    payloadBytes[0] = 0x03; // NDEF TLV tag
    payloadBytes[1] = ndefMsgLen;
    payloadBytes[2] = 0xD1; // Header
    payloadBytes[3] = 0x01; // Type Length ('T')
    payloadBytes[4] = recordPayloadLen;
    payloadBytes[5] = 0x54; // Record Type 'T' (0x54)
    payloadBytes[6] = 0x02; // UTF-8 status + lang code len (2)
    payloadBytes[7] = 'e';
    payloadBytes[8] = 'n';

    for (uint8_t i = 0; i < textLen; i++) {
      payloadBytes[9 + i] = data.charAt(i);
    }

    payloadLen = 9 + textLen;
    payloadBytes[payloadLen++] = 0xFE; // Terminator TLV
  }

  // Ensure NTAG215 Capability Container (Page 3) is initialized for NDEF compatibility
  uint8_t ccPage[4] = { 0xE1, 0x10, 0x6D, 0x00 };
  nfc.ntag2xx_WritePage(3, ccPage);

  // Calculate pages required for NDEF payload starting at Page 4
  uint8_t totalPages = (payloadLen + 3) / 4;
  uint8_t pageBuffer[4];

  for (uint8_t page = 0; page < totalPages; page++) {
    for (uint8_t b = 0; b < 4; b++) {
      uint16_t byteIdx = page * 4 + b;
      pageBuffer[b] = (byteIdx < payloadLen) ? payloadBytes[byteIdx] : 0x00;
    }
    
    uint8_t pageNum = 4 + page;
    if (!nfc.ntag2xx_WritePage(pageNum, pageBuffer)) {
      Serial.println("ERROR:WRITE_PAGE_FAILED:" + String(pageNum));
      return false;
    }
  }

  return true;
}

void readNtag215Card() {
  uint8_t data[4];
  String readContent = "";
  Serial.print("READ:DATA:");
  
  for (uint8_t page = 4; page < 16; page++) {
    if (nfc.ntag2xx_ReadPage(page, data)) {
      for (uint8_t i = 0; i < 4; i++) {
        if (data[i] >= 32 && data[i] <= 126) {
          readContent += (char)data[i];
        } else {
          readContent += ".";
        }
      }
    } else {
      break;
    }
  }
  Serial.println(readContent);
}

void loop(void) {
  // Check for incoming serial commands
  while (Serial.available() > 0) {
    String incoming = Serial.readStringUntil('\n');
    parseSerialCommand(incoming);
  }

  // Scan for card if pending write or auto read requested
  if (hasPendingWrite || autoReadOnTap) {
    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;

    // Use non-blocking scan / small timeout (100ms)
    bool success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 100);

    if (success) {
      Serial.print("CARD:DETECTED:UID=");
      for (uint8_t i = 0; i < uidLength; i++) {
        if (uid[i] < 0x10) Serial.print("0");
        Serial.print(uid[i], HEX);
      }
      Serial.println();

      if (hasPendingWrite) {
        Serial.println("STATUS:WRITING...");
        Serial.println("NTAG215 found! Rewriting data blocks...");
        if (writeNtag215Payload(pendingPayload, pendingType)) {
          Serial.println("SUCCESS! '" + pendingPayload + "' is fully updated.");
          Serial.println("SUCCESS:WRITTEN:" + pendingPayload);
          hasPendingWrite = false;
        } else {
          Serial.println("ERROR:WRITE_FAILED");
        }
      }

      if (autoReadOnTap) {
        readNtag215Card();
        autoReadOnTap = false;
      }

      delay(2000); // Cool-down to avoid repeated triggers
    }
  }

  delay(50);
}
