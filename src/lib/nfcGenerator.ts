/**
 * Helper to generate Adafruit PN532 / Arduino C++ sketch code
 * to write any client app portal URL onto an NTAG215 NFC card.
 */
export function generateArduinoNFCCode(url: string, customerName: string): string {
  let prefixByte = 0x00;
  let remainder = url;

  if (url.startsWith('https://www.')) {
    prefixByte = 0x02;
    remainder = url.slice(12);
  } else if (url.startsWith('http://www.')) {
    prefixByte = 0x01;
    remainder = url.slice(11);
  } else if (url.startsWith('https://')) {
    prefixByte = 0x04;
    remainder = url.slice(8);
  } else if (url.startsWith('http://')) {
    prefixByte = 0x03;
    remainder = url.slice(7);
  }

  // 1 (prefix byte) + ASCII bytes of remainder
  const payloadLen = 1 + remainder.length;
  const tlvLen = 3 + payloadLen;

  const fullBytes: number[] = [
    0x03, // NDEF Message TLV Tag
    tlvLen,
    0xD1, // NDEF Record Header (MB=1, ME=1, SR=1, TNF=1)
    0x01, // Type Length = 1 ('U')
    payloadLen,
    0x55, // Record Type: 'U' (URI)
    prefixByte,
  ];

  for (let i = 0; i < remainder.length; i++) {
    fullBytes.push(remainder.charCodeAt(i));
  }
  fullBytes.push(0xFE); // NDEF Terminator TLV

  // Pad to multiple of 4
  while (fullBytes.length % 4 !== 0) {
    fullBytes.push(0x00);
  }

  // Generate Arduino page write calls
  const pageWrites: string[] = [];
  let startPage = 4;
  for (let i = 0; i < fullBytes.length; i += 4) {
    const chunk = fullBytes.slice(i, i + 4);
    const hexArray = chunk.map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(', ');
    const asciiComment = chunk.map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
    pageWrites.push(`    uint8_t page${startPage}[] = { ${hexArray} }; // ${asciiComment}`);
    startPage++;
  }

  const writeCalls: string[] = [];
  for (let p = 4; p < startPage; p++) {
    writeCalls.push(`    nfc.ntag2xx_WritePage(${p}, page${p});`);
  }

  return `/*
 * AutoWorkshop NFC Writer for NTAG215
 * Customer: ${customerName}
 * Target Portal Link: ${url}
 * Module: PN532 (I2C)
 */

#include <Wire.h>
#include <Adafruit_PN532.h>

#define PN532_IRQ   (2)
#define PN532_RESET (3)

Adafruit_PN532 nfc(PN532_IRQ, PN532_RESET);

void setup(void) {
  Serial.begin(115200);
  while (!Serial) delay(10);

  Serial.println("Initializing PN532 for NTAG215...");
  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("PN532 module not found.");
    while (1);
  }
  nfc.SAMConfig();
  Serial.println("Place NTAG215 card to write Client App link...");
}

void loop(void) {
  uint8_t success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  
  uint8_t uidLength;
  
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);
  
  if (success) {
    Serial.println("Card found! Flashing NDEF Link for ${customerName}...");

${pageWrites.join('\n')}

${writeCalls.join('\n')}

    Serial.println("SUCCESS! Client App link written onto NFC Card.");
    Serial.println("URL: ${url}");
    
    while(1) { delay(1000); }
  }
  delay(2000);
}
`;
}
