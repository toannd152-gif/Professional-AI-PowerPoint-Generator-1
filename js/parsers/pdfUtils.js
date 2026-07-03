/*
================================================

PDF Utilities

================================================
*/

/**
 * Read File -> ArrayBuffer
 */
export function readArrayBuffer(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result);

        };

        reader.onerror = () => {

            reject(reader.error);

        };

        reader.readAsArrayBuffer(file);

    });

}

/**
 * Read File -> Text
 */
export function readText(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result);

        };

        reader.onerror = () => {

            reject(reader.error);

        };

        reader.readAsText(file);

    });

}

/**
 * Convert Uint8Array -> String
 */
export function uint8ToString(uint8Array) {

    return new TextDecoder("utf-8").decode(uint8Array);

}