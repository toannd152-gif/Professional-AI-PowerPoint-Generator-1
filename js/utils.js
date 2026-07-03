/*
============================================================

AI PowerPoint Generator

utils.js

Utility Library

============================================================
*/

/**
 * Generate UUID
 */
export function uuid() {

    if (window.crypto && crypto.randomUUID) {

        return crypto.randomUUID();

    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(

        /[xy]/g,

        function (c) {

            const r = Math.random() * 16 | 0;

            const v = c === "x"
                ? r
                : (r & 0x3 | 0x8);

            return v.toString(16);

        }

    );

}

/**
 * Deep Clone
 */
export function clone(data) {

    return structuredClone(data);

}

/**
 * Is Empty
 */
export function isEmpty(value) {

    if (value === null) return true;

    if (value === undefined) return true;

    if (value === "") return true;

    if (Array.isArray(value))
        return value.length === 0;

    if (typeof value === "object")
        return Object.keys(value).length === 0;

    return false;

}

/**
 * Delay
 */
export function sleep(ms) {

    return new Promise(resolve => {

        setTimeout(resolve, ms);

    });

}

/**
 * Debounce
 */
export function debounce(callback, delay = 300) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(() => {

            callback(...args);

        }, delay);

    };

}

/**
 * Throttle
 */
export function throttle(callback, delay = 100) {

    let waiting = false;

    return (...args) => {

        if (waiting) return;

        callback(...args);

        waiting = true;

        setTimeout(() => {

            waiting = false;

        }, delay);

    };

}

/**
 * DOM Selector
 */
export function $(selector, root = document) {

    return root.querySelector(selector);

}

/**
 * DOM Selector All
 */
export function $$(selector, root = document) {

    return [...root.querySelectorAll(selector)];

}

/**
 * Create Element
 */
export function create(tag, className = "") {

    const element = document.createElement(tag);

    if (className) {

        element.className = className;

    }

    return element;

}

/**
 * Remove Children
 */
export function clear(element) {

    while (element.firstChild) {

        element.removeChild(element.firstChild);

    }

}

/**
 * Download File
 */
export function download(blob, filename) {

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = filename;

    link.click();

    URL.revokeObjectURL(url);

}

/**
 * Format Bytes
 */
export function formatBytes(bytes) {

    if (bytes === 0) return "0 Bytes";

    const units = [

        "Bytes",

        "KB",

        "MB",

        "GB",

        "TB"

    ];

    const i = Math.floor(

        Math.log(bytes) /

        Math.log(1024)

    );

    return (

        bytes /

        Math.pow(1024, i)

    ).toFixed(2)

    + " "

    + units[i];

}

/**
 * Format Date
 */
export function formatDate(date = new Date()) {

    return new Intl.DateTimeFormat(

        "vi-VN",

        {

            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit"

        }

    ).format(date);

}

/**
 * Read Text File
 *
 * Prefers the standard Blob.text() (works in browsers AND in
 * Node tests with mock files); falls back to FileReader for
 * older browser File objects.
 */
export function readText(file) {

    if (typeof file?.text === "function") {

        return Promise.resolve(file.text());

    }

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result);

        };

        reader.onerror = reject;

        reader.readAsText(file);

    });

}

/**
 * Read ArrayBuffer
 */
export function readArrayBuffer(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result);

        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);

    });

}

/**
 * Read DataURL
 */
export function readDataURL(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result);

        };

        reader.onerror = reject;

        reader.readAsDataURL(file);

    });

}

/**
 * Random Integer
 */
export function random(min, max) {

    return Math.floor(

        Math.random() *

        (max - min + 1)

    ) + min;

}

/**
 * Clamp
 */
export function clamp(value, min, max) {

    return Math.min(

        Math.max(value, min),

        max

    );

}

/**
 * Capitalize
 */
export function capitalize(text) {

    if (!text) return "";

    return text.charAt(0).toUpperCase()

        + text.slice(1);

}

/**
 * Logger
 */
export function log(...args) {

    console.log(

        "[AI PPT]",

        ...args

    );

}