/**
 * ZipWriter
 * Minimal ZIP archive writer (STORE method, no compression).
 * No external dependencies — works in browser and Node.
 */

const CRC_TABLE = (() => {

    const table = new Uint32Array(256);

    for (let n = 0; n < 256; n++) {

        let c = n;

        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }

        table[n] = c >>> 0;

    }

    return table;

})();

function crc32(bytes) {

    let crc = 0xFFFFFFFF;

    for (let i = 0; i < bytes.length; i++) {
        crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;

}

export class ZipWriter {

    constructor() {

        this.entries = [];

    }

    /**
     * Add a text file (UTF-8).
     */
    addText(name, text) {

        const data = new TextEncoder().encode(text);

        this.entries.push({ name, data });

    }

    /**
     * Build the archive -> Uint8Array
     */
    build() {

        const encoder = new TextEncoder();

        const localParts = [];
        const centralParts = [];

        let offset = 0;

        for (const entry of this.entries) {

            const nameBytes = encoder.encode(entry.name);
            const crc = crc32(entry.data);
            const size = entry.data.length;

            /*
            Local file header
            */
            const local = new DataView(new ArrayBuffer(30));

            local.setUint32(0, 0x04034b50, true);   // signature
            local.setUint16(4, 20, true);           // version needed
            local.setUint16(6, 0x0800, true);       // UTF-8 flag
            local.setUint16(8, 0, true);            // method: store
            local.setUint16(10, 0, true);           // time
            local.setUint16(12, 0x21, true);        // date (1980-01-01)
            local.setUint32(14, crc, true);
            local.setUint32(18, size, true);        // compressed
            local.setUint32(22, size, true);        // uncompressed
            local.setUint16(26, nameBytes.length, true);
            local.setUint16(28, 0, true);           // extra length

            localParts.push(
                new Uint8Array(local.buffer),
                nameBytes,
                entry.data
            );

            /*
            Central directory header
            */
            const central = new DataView(new ArrayBuffer(46));

            central.setUint32(0, 0x02014b50, true);
            central.setUint16(4, 20, true);         // version made by
            central.setUint16(6, 20, true);         // version needed
            central.setUint16(8, 0x0800, true);
            central.setUint16(10, 0, true);
            central.setUint16(12, 0, true);
            central.setUint16(14, 0x21, true);
            central.setUint32(16, crc, true);
            central.setUint32(20, size, true);
            central.setUint32(24, size, true);
            central.setUint16(28, nameBytes.length, true);
            central.setUint32(42, offset, true);    // local header offset

            centralParts.push(
                new Uint8Array(central.buffer),
                nameBytes
            );

            offset += 30 + nameBytes.length + size;

        }

        const centralSize = centralParts
            .reduce((sum, part) => sum + part.length, 0);

        /*
        End of central directory
        */
        const eocd = new DataView(new ArrayBuffer(22));

        eocd.setUint32(0, 0x06054b50, true);
        eocd.setUint16(8, this.entries.length, true);
        eocd.setUint16(10, this.entries.length, true);
        eocd.setUint32(12, centralSize, true);
        eocd.setUint32(16, offset, true);

        const total =
            offset + centralSize + 22;

        const out = new Uint8Array(total);

        let pos = 0;

        for (const part of [...localParts, ...centralParts, new Uint8Array(eocd.buffer)]) {
            out.set(part, pos);
            pos += part.length;
        }

        return out;

    }

}
