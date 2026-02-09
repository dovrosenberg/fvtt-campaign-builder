/**
 * Service for creating/handling zip files for exports.
 */

/**
 * Calculates CRC-32 checksum for data.
 * @param data - The data to calculate CRC-32 for
 * @returns The CRC-32 checksum
 */
const calculateCRC32 = (data: Uint8Array): number => {
  // CRC-32 table
  const crcTable = new Uint32Array(256);
  
  // Generate CRC-32 table
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    crcTable[i] = crc;
  }
  
  // Calculate CRC-32
  let crc = 0 ^ (-1);
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
  }
  
  return (crc ^ (-1)) >>> 0;
};

/**
 * Creates ZIP data from files using a simple ZIP implementation.
 * @param files - Array of files to include in the ZIP
 * @returns ZIP data as Uint8Array
 */
const createZipData = async (files: Array<{ name: string; content: Uint8Array }>): Promise<Uint8Array> => {
  const encoder = new TextEncoder();
  const zipChunks: Uint8Array[] = [];
  
  // Simple ZIP file format
  let centralDirectoryOffset = 0;
  let centralDirectory: Uint8Array[] = [];
  
  for (const file of files) {
    // Calculate CRC-32
    const crc32 = calculateCRC32(file.content);
    
    // File header
    const fileHeader = new Uint8Array(30 + file.name.length);
    const view = new DataView(fileHeader.buffer);
    
    // Local file header signature
    view.setUint32(0, 0x04034b50, true);
    
    // Version needed (20)
    view.setUint16(4, 20, true);
    
    // Flags (0)
    view.setUint16(6, 0, true);
    
    // Compression method (0 = stored)
    view.setUint16(8, 0, true);
    
    // Mod time and date (dummy values)
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    
    // CRC-32
    view.setUint32(14, crc32, true);
    
    // Compressed size
    view.setUint32(18, file.content.length, true);
    
    // Uncompressed size
    view.setUint32(22, file.content.length, true);
    
    // File name length
    view.setUint16(26, file.name.length, true);
    
    // Extra field length (0)
    view.setUint16(28, 0, true);
    
    // File name
    fileHeader.set(encoder.encode(file.name), 30);
    
    // Write file header and content
    zipChunks.push(fileHeader);
    zipChunks.push(file.content);
    
    // Central directory entry
    const cdEntry = new Uint8Array(46 + file.name.length);
    const cdView = new DataView(cdEntry.buffer);
    
    // Central directory signature
    cdView.setUint32(0, 0x02014b50, true);
    
    // Version made by (20)
    cdView.setUint16(4, 20, true);
    
    // Version needed (20)
    cdView.setUint16(6, 20, true);
    
    // Flags (0)
    cdView.setUint16(8, 0, true);
    
    // Compression method (0)
    cdView.setUint16(10, 0, true);
    
    // Mod time and date
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    
    // CRC-32
    cdView.setUint32(16, crc32, true);
    
    // Compressed size
    cdView.setUint32(20, file.content.length, true);
    
    // Uncompressed size
    cdView.setUint32(24, file.content.length, true);
    
    // File name length
    cdView.setUint16(28, file.name.length, true);
    
    // Extra field length (0)
    cdView.setUint16(30, 0, true);
    
    // Comment length (0)
    cdView.setUint16(32, 0, true);
    
    // Disk number start (0)
    cdView.setUint16(34, 0, true);
    
    // Internal file attributes (0)
    cdView.setUint16(36, 0, true);
    
    // External file attributes (0)
    cdView.setUint32(38, 0, true);
    
    // Relative offset of local header
    cdView.setUint32(42, centralDirectoryOffset, true);
    
    // File name
    cdEntry.set(encoder.encode(file.name), 46);
    
    centralDirectory.push(cdEntry);
    centralDirectoryOffset += fileHeader.length + file.content.length;
  }
  
  // Calculate central directory size and offset
  const centralDirectoryData = new Uint8Array(
    centralDirectory.reduce((acc, chunk) => acc + chunk.length, 0)
  );
  let offset = 0;
  for (const chunk of centralDirectory) {
    centralDirectoryData.set(chunk, offset);
    offset += chunk.length;
  }
  
  // End of central directory record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  
  // End of central dir signature
  eocdView.setUint32(0, 0x06054b50, true);
  
  // Number of this disk (0)
  eocdView.setUint16(4, 0, true);
  
  // Disk with start of central directory (0)
  eocdView.setUint16(6, 0, true);
  
  // Number of central directory records on this disk
  eocdView.setUint16(8, files.length, true);
  
  // Total number of central directory records
  eocdView.setUint16(10, files.length, true);
  
  // Size of central directory
  eocdView.setUint32(12, centralDirectoryData.length, true);
  
  // Offset of central directory
  eocdView.setUint32(16, centralDirectoryOffset, true);
  
  // Comment length (0)
  eocdView.setUint16(20, 0, true);
  
  // Combine all parts
  const totalSize = zipChunks.reduce((acc, chunk) => acc + chunk.length, 0) +
                   centralDirectoryData.length + eocd.length;
  
  const result = new Uint8Array(totalSize);
  offset = 0;
  
  for (const chunk of zipChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  result.set(centralDirectoryData, offset);
  offset += centralDirectoryData.length;
  
  result.set(eocd, offset);
  
  return result;
};

const ZipFileService = {
  createZipData,
};

export default ZipFileService;
