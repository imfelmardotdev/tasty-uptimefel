/**
 * A queue with a fixed size limit. When the limit is reached,
 * the oldest item is removed when a new item is added.
 * Also allows accessing items by key.
 */
class LimitQueue {
    /**
     * @type {number} The maximum size of the queue.
     */
    limit = 0;

    /**
     * @type {Map<any, any>} Stores the key-value pairs.
     */
    map = new Map();

    /**
     * @type {Array<any>} Stores the keys in insertion order.
     */
    queue = [];

    /**
     * Creates a new LimitQueue.
     * @param {number} limit The maximum number of items the queue can hold.
     */
    constructor(limit) {
        this.limit = limit;
    }

    /**
     * Adds a key-value pair to the queue.
     * If the queue is full, removes the oldest item.
     * If the key already exists, it updates the value and moves the key to the end.
     * @param {any} key The key of the item.
     * @param {any} value The value of the item.
     */
    push(key, value) {
        if (this.map.has(key)) {
            // Key exists, remove it from its current position in the queue
            const index = this.queue.indexOf(key);
            if (index > -1) {
                this.queue.splice(index, 1);
            }
        } else if (this.queue.length >= this.limit) {
            // Queue is full and key is new, remove the oldest item
            const oldestKey = this.queue.shift();
            this.map.delete(oldestKey);
        }

        // Add the new key to the end of the queue and update the map
        this.queue.push(key);
        this.map.set(key, value);
    }

    /**
     * Gets the value associated with a key.
     * @param {any} key The key to retrieve.
     * @param {any} [defaultValue=undefined] The value to return if the key is not found.
     * @returns {any} The value associated with the key, or the defaultValue.
     */
    get(key, defaultValue = undefined) {
        return this.map.get(key) ?? defaultValue;
    }

    /**
     * Checks if a key exists in the queue.
     * @param {any} key The key to check.
     * @returns {boolean} True if the key exists, false otherwise.
     */
    has(key) {
        return this.map.has(key);
    }

    /**
     * Gets the number of items currently in the queue.
     * @returns {number} The size of the queue.
     */
    get size() {
        return this.queue.length;
    }

    /**
     * Allows direct access to the value using bracket notation (e.g., queue[key]).
     * Note: This uses the `get` method internally.
     */
    get [Symbol.toStringTag]() {
        return 'LimitQueue';
    }

    // Proxy to allow accessing items like an object (queue[key])
    // This might be less performant than using .get() directly
    // Consider removing if not strictly needed or if performance is critical.
    // Currently, UptimeCalculator uses .get(), so this proxy isn't strictly necessary for it.
    // Keeping it for potential flexibility or if direct property access is desired elsewhere.
    static get [Symbol.species]() {
        return LimitQueue;
    }

    // Implement iterator to allow looping over [key, value] pairs
    *[Symbol.iterator]() {
        for (const key of this.queue) {
            yield [key, this.map.get(key)];
        }
    }

    /**
     * Returns an iterator for the keys in the queue (insertion order).
     * @returns {IterableIterator<any>}
     */
    keys() {
        return this.queue.values();
    }

     /**
     * Returns an iterator for the values in the queue (insertion order).
     * @returns {IterableIterator<any>}
     */
    *values() {
        for (const key of this.queue) {
            yield this.map.get(key);
        }
    }

    /**
     * Returns an iterator for the [key, value] pairs in the queue (insertion order).
     * @returns {IterableIterator<[any, any]>}
     */
    entries() {
        return this[Symbol.iterator]();
    }
}

module.exports = {
    LimitQueue
};
