const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { LimitQueue } = require("../utils/limit-queue");
const { log } = require("../utils/logger");
const { getDatabase } = require("../database/init"); // Import getDatabase

// Extend dayjs with UTC plugin
dayjs.extend(utc);

// Constants for status (align with your Heartbeat model or constants file)
const UP = 1;
const DOWN = 0;
const PENDING = 2;
const MAINTENANCE = 3;

/**
 * Calculates and stores uptime statistics for monitors.
 */
class UptimeCalculator {
  /**
   * @private
   * @type {Map<number, UptimeCalculator>}
   */
  static list = new Map();

  /**
   * For testing purposes, allows setting a specific date.
   * @type {dayjs.Dayjs | null}
   */
  static currentDate = null;

  /**
   * Monitor ID associated with this calculator instance.
   * @type {number}
   */
  monitorID;

  /**
   * Recent 24-hour uptime data (minutely intervals).
   * Key: Unix timestamp (seconds) for the start of the minute.
   * @type {LimitQueue<number, object>}
   */
  minutelyUptimeDataList = new LimitQueue(24 * 60);

  /**
   * Recent 30-day uptime data (hourly intervals).
   * Key: Unix timestamp (seconds) for the start of the hour.
   * @type {LimitQueue<number, object>}
   */
  hourlyUptimeDataList = new LimitQueue(30 * 24);

  /**
   * Recent 365-day uptime data (daily intervals).
   * Key: Unix timestamp (seconds) for the start of the day (UTC).
   * @type {LimitQueue<number, object>}
   */
  dailyUptimeDataList = new LimitQueue(365);

  // --- Configuration ---
  statMinutelyKeepHours = 24;
  statHourlyKeepDays = 30;
  statDailyKeepDays = 365; // Keep daily stats for a year

  /**
   * Gets or creates an UptimeCalculator instance for a specific monitor.
   * @param {number} monitorID The ID of the monitor.
   * @returns {Promise<UptimeCalculator>} The UptimeCalculator instance.
   */
  static async getUptimeCalculator(monitorID) {
    if (!monitorID) {
      throw new Error("Monitor ID is required");
    }

    if (!UptimeCalculator.list.has(monitorID)) {
      const calculator = new UptimeCalculator(monitorID);
      await calculator.init();
      UptimeCalculator.list.set(monitorID, calculator);
    }
    return UptimeCalculator.list.get(monitorID);
  }

  /**
   * Removes a monitor's calculator instance from the cache.
   * @param {number} monitorID The ID of the monitor.
   */
  static remove(monitorID) {
    UptimeCalculator.list.delete(monitorID);
  }

  /**
   * Creates a new UptimeCalculator instance.
   * @param {number} monitorID The ID of the monitor.
   */
  constructor(monitorID) {
    this.monitorID = monitorID;

    // Override getCurrentDate for testing if needed
    if (process.env.NODE_ENV === "test") {
      this.getCurrentDate = () =>
        UptimeCalculator.currentDate || dayjs.utc();
    }
  }

  /**
   * Initializes the calculator by loading recent stats from the database using raw SQL.
   */
  async init() {
    const db = getDatabase();
    if (!db) {
        log.error(`[UptimeCalculator] Database not initialized for monitor ${this.monitorID}`);
        return;
    }
    const now = this.getCurrentDate();

    const loadStats = (table, cutoffKey, list) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ${table} WHERE website_id = ? AND timestamp > ? ORDER BY timestamp ASC`;
            db.all(sql, [this.monitorID, cutoffKey], (err, rows) => {
                if (err) return reject(err);
                rows.forEach(stat => list.push(stat.timestamp, this._statToObject(stat)));
                resolve();
            });
        });
    };

    try {
        // Load minutely data (last 24 hours)
        const minutelyCutoff = this.getMinutelyKey(now.subtract(this.statMinutelyKeepHours, "hour"));
        await loadStats('stat_minutely', minutelyCutoff, this.minutelyUptimeDataList);

        // Load hourly data (last 30 days)
        const hourlyCutoff = this.getHourlyKey(now.subtract(this.statHourlyKeepDays, "day"));
        await loadStats('stat_hourly', hourlyCutoff, this.hourlyUptimeDataList);

        // Load daily data (last 365 days)
        const dailyCutoff = this.getDailyKey(now.subtract(this.statDailyKeepDays, "day"));
        await loadStats('stat_daily', dailyCutoff, this.dailyUptimeDataList);

        log.debug(`UptimeCalculator initialized for monitor ${this.monitorID}`);
    } catch (error) {
        log.error(`[UptimeCalculator] Error during init for monitor ${this.monitorID}:`, error);
        // Depending on severity, you might want to throw or just log
    }
  }

  /**
   * Updates the uptime statistics based on a new heartbeat.
   * @param {object} heartbeatData The heartbeat data.
   * @param {number} heartbeatData.status The status code (UP, DOWN, PENDING, MAINTENANCE).
   * @param {number | null} [heartbeatData.ping] The ping time in ms.
   * @param {string | null} [heartbeatData.message] Associated message.
   * @param {dayjs.Dayjs | null} [heartbeatData.timestamp] The timestamp of the heartbeat (defaults to now).
   * @returns {Promise<void>}
   */
  async update(heartbeatData) {
    const { status, ping = null, message = null } = heartbeatData;
    const date = heartbeatData.timestamp || this.getCurrentDate();

    const flatStatus = this._flatStatus(status);

    if (flatStatus === DOWN && ping !== null && ping > 0) {
      log.warn(
        `UptimeCalculator [Monitor ${this.monitorID}]: Ping value ignored for DOWN status.`
      );
    }

    // Get keys for different time granularities
    const minuteKey = this.getMinutelyKey(date);
    const hourKey = this.getHourlyKey(date);
    const dayKey = this.getDailyKey(date);

    // Get or initialize data objects for the current time slots
    const minuteData = this.minutelyUptimeDataList.get(minuteKey);
    const hourData = this.hourlyUptimeDataList.get(hourKey);
    const dailyData = this.dailyUptimeDataList.get(dayKey);

    // --- Update Counts ---
    if (status === MAINTENANCE) {
      minuteData.maintenance_count++;
      hourData.maintenance_count++;
      dailyData.maintenance_count++;
    } else if (flatStatus === UP) {
      minuteData.up_count++;
      hourData.up_count++;
      dailyData.up_count++;

      // --- Update Ping Stats (only for UP status) ---
      if (ping !== null && !isNaN(ping)) {
        this._updatePingStats(minuteData, ping);
        this._updatePingStats(hourData, ping);
        this._updatePingStats(dailyData, ping);
      }
    } else if (flatStatus === DOWN) {
      minuteData.down_count++;
      hourData.down_count++;
      dailyData.down_count++;
    }

    // --- Persist to Database using raw SQL ---
    const db = getDatabase();
    if (!db) {
        log.error(`[UptimeCalculator] Database not initialized for update on monitor ${this.monitorID}`);
        return;
    }
    try {
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION', (err) => { if (err) reject(err); });

                // Upsert Minutely Stat
                const upsertMinutelySql = `
                    INSERT INTO stat_minutely (website_id, timestamp, up_count, down_count, maintenance_count, avg_ping, min_ping, max_ping, extras, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT(website_id, timestamp) DO UPDATE SET
                        up_count = excluded.up_count,
                        down_count = excluded.down_count,
                        maintenance_count = excluded.maintenance_count,
                        avg_ping = excluded.avg_ping,
                        min_ping = excluded.min_ping,
                        max_ping = excluded.max_ping,
                        extras = excluded.extras,
                        updated_at = CURRENT_TIMESTAMP
                `;
                db.run(upsertMinutelySql, [
                    this.monitorID, minuteKey, minuteData.up_count, minuteData.down_count, minuteData.maintenance_count,
                    minuteData.avg_ping, minuteData.min_ping, minuteData.max_ping, minuteData.extras ? JSON.stringify(minuteData.extras) : null
                ], (err) => { if (err) reject(err); });

                 // Upsert Hourly Stat
                 const upsertHourlySql = `
                    INSERT INTO stat_hourly (website_id, timestamp, up_count, down_count, maintenance_count, avg_ping, min_ping, max_ping, extras, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT(website_id, timestamp) DO UPDATE SET
                        up_count = excluded.up_count,
                        down_count = excluded.down_count,
                        maintenance_count = excluded.maintenance_count,
                        avg_ping = excluded.avg_ping,
                        min_ping = excluded.min_ping,
                        max_ping = excluded.max_ping,
                        extras = excluded.extras,
                        updated_at = CURRENT_TIMESTAMP
                `;
                 db.run(upsertHourlySql, [
                     this.monitorID, hourKey, hourData.up_count, hourData.down_count, hourData.maintenance_count,
                     hourData.avg_ping, hourData.min_ping, hourData.max_ping, hourData.extras ? JSON.stringify(hourData.extras) : null
                 ], (err) => { if (err) reject(err); });

                 // Upsert Daily Stat
                 const upsertDailySql = `
                    INSERT INTO stat_daily (website_id, timestamp, up_count, down_count, maintenance_count, avg_ping, min_ping, max_ping, extras, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT(website_id, timestamp) DO UPDATE SET
                        up_count = excluded.up_count,
                        down_count = excluded.down_count,
                        maintenance_count = excluded.maintenance_count,
                        avg_ping = excluded.avg_ping,
                        min_ping = excluded.min_ping,
                        max_ping = excluded.max_ping,
                        extras = excluded.extras,
                        updated_at = CURRENT_TIMESTAMP
                `;
                 db.run(upsertDailySql, [
                     this.monitorID, dayKey, dailyData.up_count, dailyData.down_count, dailyData.maintenance_count,
                     dailyData.avg_ping, dailyData.min_ping, dailyData.max_ping, dailyData.extras ? JSON.stringify(dailyData.extras) : null
                 ], (err) => { if (err) reject(err); });


                // Insert Heartbeat
                const insertHeartbeatSql = `
                    INSERT INTO heartbeats (website_id, timestamp, status, ping, message)
                    VALUES (?, ?, ?, ?, ?)
                `;
                db.run(insertHeartbeatSql, [
                    this.monitorID, date.toISOString(), status, ping, message
                ], (err) => { if (err) reject(err); });

                db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    } catch (error) {
        log.error(`[UptimeCalculator] Transaction failed for monitor ${this.monitorID}. Rolling back.`, error);
        await new Promise((resolve, reject) => {
            db.run('ROLLBACK', (err) => {
                // Log rollback error but prioritize original error
                if (err) log.error(`[UptimeCalculator] Rollback failed for monitor ${this.monitorID}:`, err);
                resolve(); // Resolve even if rollback fails to allow original error throw
            });
        });
        log.error(
            `UptimeCalculator [Monitor ${this.monitorID}]: Failed to update stats/heartbeat`,
        error
      );
      throw error; // Re-throw error after rollback
    }

    // --- Cleanup Old Data (Optional - can be moved to a separate job) ---
    // This can be intensive, consider a background job if performance is critical
    // await this.cleanupOldStats();
  }

  /**
   * Calculates the key (Unix timestamp) for the minutely interval.
   * @param {dayjs.Dayjs} date The date object.
   * @returns {number} The Unix timestamp for the start of the minute.
   */
  getMinutelyKey(date) {
    const key = date.utc().startOf("minute").unix();
    if (!this.minutelyUptimeDataList.has(key)) {
      this.minutelyUptimeDataList.push(key, this._createEmptyStat());
    }
    return key;
  }

  /**
   * Calculates the key (Unix timestamp) for the hourly interval.
   * @param {dayjs.Dayjs} date The date object.
   * @returns {number} The Unix timestamp for the start of the hour.
   */
  getHourlyKey(date) {
    const key = date.utc().startOf("hour").unix();
    if (!this.hourlyUptimeDataList.has(key)) {
      this.hourlyUptimeDataList.push(key, this._createEmptyStat());
    }
    return key;
  }

  /**
   * Calculates the key (Unix timestamp) for the daily interval.
   * @param {dayjs.Dayjs} date The date object.
   * @returns {number} The Unix timestamp for the start of the day (UTC).
   */
  getDailyKey(date) {
    const key = date.utc().startOf("day").unix();
    if (!this.dailyUptimeDataList.has(key)) {
      this.dailyUptimeDataList.push(key, this._createEmptyStat());
    }
    return key;
  }

  /**
   * Gets uptime and average ping data for a specified number of periods.
   * @param {number} numPeriods The number of periods (minutes, hours, or days).
   * @param {'minute' | 'hour' | 'day'} type The type of period.
   * @returns {{ uptime: number, avgPing: number | null }}
   */
  getUptimeData(numPeriods, type = "day") {
    const dataList = this._getDataListByType(type);
    const keyFunction = this._getKeyFunctionByType(type);
    const periodSeconds = this._getPeriodSeconds(type);

    if (!dataList || !keyFunction || !periodSeconds) {
      throw new Error(`Invalid type specified: ${type}`);
    }

    // Validate numPeriods against cache size
    if (numPeriods > dataList.limit) {
       log.warn(`Requested period (${numPeriods} ${type}s) exceeds cache limit (${dataList.limit}). Result may be incomplete.`);
       numPeriods = dataList.limit; // Cap at cache limit
    }


    const nowKey = keyFunction(this.getCurrentDate());
    const startKey = nowKey - periodSeconds * (numPeriods - 1);

    let totalUp = 0;
    let totalDown = 0;
    let totalPingSum = 0;
    let pingCount = 0; // Count only periods with valid pings

    for (let key = startKey; key <= nowKey; key += periodSeconds) {
      const data = dataList.get(key, null); // Get data, return null if not found
      if (data) {
        totalUp += data.up_count || 0;
        totalDown += data.down_count || 0;
        if (data.avg_ping !== null && data.up_count > 0) {
          totalPingSum += data.avg_ping * data.up_count; // Weight average by up_count
          pingCount += data.up_count;
        }
      }
    }

    const totalChecks = totalUp + totalDown;
    const uptime = totalChecks === 0 ? 1 : totalUp / totalChecks; // Default to 100% if no checks
    const avgPing = pingCount === 0 ? null : totalPingSum / pingCount;

    return {
      uptime: parseFloat(uptime.toFixed(4)), // Format to 4 decimal places
      avgPing: avgPing !== null ? parseFloat(avgPing.toFixed(2)) : null, // Format to 2 decimal places
    };
  }

   /**
   * Gets an array of raw stat data for a specified number of periods.
   * @param {number} numPeriods The number of periods (minutes, hours, or days).
   * @param {'minute' | 'hour' | 'day'} type The type of period.
   * @returns {Array<object>} Array of stat objects, ordered oldest to newest.
   */
  getStatsArray(numPeriods, type = "day") {
    const dataList = this._getDataListByType(type);
    const keyFunction = this._getKeyFunctionByType(type);
    const periodSeconds = this._getPeriodSeconds(type);

    if (!dataList || !keyFunction || !periodSeconds) {
        throw new Error(`Invalid type specified: ${type}`);
    }

     // Validate numPeriods against cache size
     if (numPeriods > dataList.limit) {
        log.warn(`Requested period (${numPeriods} ${type}s) exceeds cache limit (${dataList.limit}). Result may be incomplete.`);
        numPeriods = dataList.limit; // Cap at cache limit
     }

    const nowKey = keyFunction(this.getCurrentDate());
    const startKey = nowKey - periodSeconds * (numPeriods - 1);
    const results = [];

    for (let key = startKey; key <= nowKey; key += periodSeconds) {
        const data = dataList.get(key, null);
        // Return a copy, add timestamp, and ensure default values if data is missing
        results.push({
            timestamp: key,
            ...(data || this._createEmptyStat()),
        });
    }
    return results;
  }


  /**
   * Gets the current date, respecting the static override for testing.
   * @returns {dayjs.Dayjs} Current UTC date.
   */
  getCurrentDate() {
    return dayjs.utc();
  }

  /**
   * Removes statistics data older than the configured retention periods.
   * Consider running this as a separate background job for performance.
   */
  async cleanupOldStats() {
    const db = getDatabase();
    if (!db) {
        log.error(`[UptimeCalculator] Database not initialized for cleanup on monitor ${this.monitorID}`);
        return;
    }
    const now = this.getCurrentDate();

    const runDelete = (table, cutoffKey) => {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM ${table} WHERE website_id = ? AND timestamp < ?`;
            db.run(sql, [this.monitorID, cutoffKey], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    try {
        const minutelyCutoff = this.getMinutelyKey(now.subtract(this.statMinutelyKeepHours, "hour"));
        await runDelete('stat_minutely', minutelyCutoff);

        const hourlyCutoff = this.getHourlyKey(now.subtract(this.statHourlyKeepDays, "day"));
        await runDelete('stat_hourly', hourlyCutoff);

        const dailyCutoff = this.getDailyKey(now.subtract(this.statDailyKeepDays, "day"));
        await runDelete('stat_daily', dailyCutoff);

        // Optionally cleanup old heartbeats too
        // const heartbeatCutoff = now.subtract(this.statDailyKeepDays, 'day').toISOString();
        // await new Promise((resolve, reject) => {
        //     db.run('DELETE FROM heartbeats WHERE website_id = ? AND timestamp < ?', [this.monitorID, heartbeatCutoff], (err) => {
        //         if (err) reject(err); else resolve();
        //     });
        // });

        log.info(`UptimeCalculator [Monitor ${this.monitorID}]: Old stats cleaned up.`);
    } catch (error) {
        log.error(
            `UptimeCalculator [Monitor ${this.monitorID}]: Failed to cleanup old stats`,
        error
      );
    }
  }

  // --- Private Helper Methods ---

  /** Converts a raw DB row stat object to a plain object for the cache. */
  _statToObject(statRow) {
      // Assumes column names match the properties needed (_createEmptyStat)
      return {
          up_count: statRow.up_count,
          down_count: statRow.down_count,
          maintenance_count: statRow.maintenance_count,
          avg_ping: statRow.avg_ping,
          min_ping: statRow.min_ping,
          max_ping: statRow.max_ping,
          extras: statRow.extras ? JSON.parse(statRow.extras) : null, // Parse extras if they exist
      };
  }

  /** Creates an empty stat object for initializing cache entries. */
  _createEmptyStat() {
    return {
      up_count: 0,
      down_count: 0,
      maintenance_count: 0,
      avg_ping: null,
      min_ping: null,
      max_ping: null,
      extras: null,
    };
  }

  /** Simplifies status to UP or DOWN for uptime calculation. */
  _flatStatus(status) {
    switch (status) {
      case UP:
      case MAINTENANCE: // Treat maintenance as UP for uptime %
        return UP;
      case DOWN:
      case PENDING: // Treat pending as DOWN for uptime %
        return DOWN;
      default:
        log.warn(`UptimeCalculator: Encountered unknown status code ${status}`);
        return DOWN; // Default to DOWN if unknown
    }
  }

  /** Updates ping statistics within a stat data object. */
  _updatePingStats(statData, newPing) {
    if (statData.up_count === 1) {
      // First UP beat in this period
      statData.avg_ping = newPing;
      statData.min_ping = newPing;
      statData.max_ping = newPing;
    } else {
      // Subsequent UP beats
      statData.avg_ping =
        (statData.avg_ping * (statData.up_count - 1) + newPing) /
        statData.up_count;
      statData.min_ping =
        statData.min_ping === null
          ? newPing
          : Math.min(statData.min_ping, newPing);
      statData.max_ping =
        statData.max_ping === null
          ? newPing
          : Math.max(statData.max_ping, newPing);
    }
  }

   /** Returns the appropriate data list based on type. */
   _getDataListByType(type) {
    switch (type) {
        case "minute": return this.minutelyUptimeDataList;
        case "hour": return this.hourlyUptimeDataList;
        case "day": return this.dailyUptimeDataList;
        default: return null;
    }
  }

  /** Returns the appropriate key generation function based on type. */
  _getKeyFunctionByType(type) {
      switch (type) {
          case "minute": return this.getMinutelyKey.bind(this);
          case "hour": return this.getHourlyKey.bind(this);
          case "day": return this.getDailyKey.bind(this);
          default: return null;
      }
  }

  /** Returns the duration of a period in seconds based on type. */
  _getPeriodSeconds(type) {
      switch (type) {
          case "minute": return 60;
          case "hour": return 3600;
          case "day": return 86400;
          default: return null;
      }
  }
}

module.exports = UptimeCalculator;
