const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function makeCrcTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);

  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw RGBA pixels
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowBytes));

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) / 2;

  // Colors
  const bg = [0x24, 0x17, 0x0f, 0xff]; // Espresso #24170F
  const gold = [0xd6, 0xa5, 0x64, 0xff]; // Gold #D6A564
  const cream = [0xff, 0xf9, 0xf1, 0xff]; // Cream #FFF9F1

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowBytes);
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background
      let color = bg;

      // Inner emblem geometry
      const rRatio = dist / maxR;

      if (!isMaskable && rRatio > 0.92) {
        // Transparent outside rounded icon bounds
        color = [0, 0, 0, 0];
      } else if (Math.abs(rRatio - 0.82) < 0.02) {
        // Gold border ring
        color = gold;
      } else if (dist < maxR * 0.5) {
        // Inner emblem core
        const angle = Math.atan2(dy, dx);
        if (Math.abs(dx) < maxR * 0.12 && dy > -maxR * 0.35 && dy < maxR * 0.25) {
          // Central arch
          color = cream;
        } else if (Math.abs(dx) > maxR * 0.22 && Math.abs(dx) < maxR * 0.32 && dy > -maxR * 0.28 && dy < maxR * 0.25) {
          // Minarets
          color = gold;
        } else if (dy < -maxR * 0.2 && dist < maxR * 0.3) {
          // Dome
          color = gold;
        }
      }

      rawData[pxOffset] = color[0];
      rawData[pxOffset + 1] = color[1];
      rawData[pxOffset + 2] = color[2];
      rawData[pxOffset + 3] = color[3];
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressedData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');

console.log('Generating PWA PNG icons with custom AWKUM branding logo...');

const pwa192 = createPng(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Created public/pwa-192x192.png');

const pwa512 = createPng(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Created public/pwa-512x512.png');

const pwaMaskable = createPng(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('Created public/pwa-maskable-512x512.png');

const appleTouch = createPng(180, 180, true);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
console.log('Created public/apple-touch-icon.png');

console.log('All PWA branding PNG icons generated successfully!');
