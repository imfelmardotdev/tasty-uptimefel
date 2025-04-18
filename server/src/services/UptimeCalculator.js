const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { LimitQueue } = require("../utils/limit-queue");
const { log } = require("../utils/logger");
const { getDatabase } = require("../database/init"); // Import getDatabase (pg Pool)

// Extend dayjs with UTC plugin
dayjs.extend(utc);

// Constants for status
const UP = 1;
const DOWN = 0;
const PENDING = 2; // Assuming PENDING is treated as DOWN for uptime
const MAINTENANCE = 3; // Assuming MAINTENANCE is treated as UP for uptime

/**
 * Calculates and stores uptime statistics for monitors.
 * NOTE: This refactored version uses pg Pool and async/await.
 */
class UptimeCalculator {
  /** @type {Map<number, UptimeCalculator>} */
  static list = new Map();
  /** @type {dayjs.Dayjs | null} */
  static currentDate = null; // For testing

  /** @type {number} */
  monitorID;
  /** @type {LimitQueue<number, object>} */
  minutelyUptimeDataList = new LimitQueue(24 * 60);
  /** @type {LimitQueue<number, object>} */
  hourlyUptimeDataList = new LimitQueue(30 * 24);
  /** @type {LimitQueue<number, object>} */
  dailyUptimeDataList = new LimitQueue(365);

  // --- Configuration ---
  statMinutelyKeepHours = 24;
  statHourlyKeepDays = 30;
  statDailyKeepDays = 365;

  static async getUptimeCalculator(monitorID) {
    if (!monitorID) throw new Error("Monitor ID is required");
    if (!UptimeCalculator.list.has(monitorID)) {
      const calculator = new UptimeCalculator(monitorID);
      await calculator.init();
      UptimeCalculator.list.set(monitorID, calculator);
    }
    return UptimeCalculator.list.get(monitorID);
  }

  static remove(monitorID) {
    UptimeCalculator.list.delete(monitorID);
  }

  constructor(monitorID) {
    this.monitorID = monitorID;
    if (process.env.NODE_ENV === "test") {
      this.getCurrentDate = () => UptimeCalculator.currentDate || dayjs.utc();
    }
  }

  /** Initializes by loading recent stats from the database using pg Pool. */
  async init() {
    const db = getDatabase(); // Get pg Pool
    if (!db) {
      log.error(`[UptimeCalculator] Database pool not initialized for monitor ${this.monitorID}`);
      return;
    }
    const now = this.getCurrentDate();

    // Helper to load stats using pg Pool
    const loadStats = async (table, cutoffKey, list) => {
      // Use $1, $2 placeholders for pg
      const sql = `SELECT * FROM ${table} WHERE website_id = $1 AND timestamp > to_timestamp($2) ORDER BY timestamp ASC`;
      try {
        // Convert Unix timestamp cutoffKey back to timestamp for query if needed, or adjust query/keys
        // Assuming keys are stored as Unix timestamps, convert cutoffKey to timestamp for comparison
        const result = await db.query(sql, [this.monitorID, cutoffKey]);
        result.rows.forEach(stat => {
            // Convert DB timestamp back to Unix timestamp (seconds) for the key
            const statTimestampKey = dayjs(stat.timestamp).unix();
            list.push(statTimestampKey, this._statToObject(stat));
        });
      } catch (err) {
        // Handle potential "relation does not exist" error gracefully during initial setup
        if (err.code === '42P01') {
             log.warn(`[UptimeCalculator] Table ${table} does not exist yet for monitor ${this.monitorID}. Skipping initial load.`);
        } else {
            log.error(`[UptimeCalculator] DB Error loading ${table} for monitor ${this.monitorID}:`, err);
            throw err; // Re-throw other errors
        }
      }
    };

    try {
      const minutelyCutoff = this.getMinutelyKey(now.subtract(this.statMinutelyKeepHours, "hour"));
      await loadStats('stat_minutely', minutelyCutoff, this.minutelyUptimeDataList);

      const hourlyCutoff = this.getHourlyKey(now.subtract(this.statHourlyKeepDays, "day"));
      await loadStats('stat_hourly', hourlyCutoff, this.hourlyUptimeDataList);

      const dailyCutoff = this.getDailyKey(now.subtract(this.statDailyKeepDays, "day"));
      await loadStats('stat_daily', dailyCutoff, this.dailyUptimeDataList);

      log.debug(`UptimeCalculator initialized for monitor ${this.monitorID}`);
    } catch (error) {
      log.error(`[UptimeCalculator] Error during init for monitor ${this.monitorID}:`, error);
    }
  }

  /** Updates uptime statistics based on a new heartbeat. */
  async update(heartbeatData) {
    const { status, ping = null, message = null } = heartbeatData;
    const date = heartbeatData.timestamp || this.getCurrentDate();
    const flatStatus = this._flatStatus(status);

    if (flatStatus === DOWN && ping !== null && ping > 0) {
      log.warn(`UptimeCalculator [Monitor ${this.monitorID}]: Ping value ignored for DOWN status.`);
    }

    const minuteKey = this.getMinutelyKey(date);
    const hourKey = this.getHourlyKey(date);
    const dayKey = this.getDailyKey(date);

    const minuteData = this.minutelyUptimeDataList.get(minuteKey);
    const hourData = this.hourlyUptimeDataList.get(hourKey);
    const dailyData = this.dailyUptimeDataList.get(dayKey);

    // Update Counts
    if (status === MAINTENANCE) {
      minuteData.maintenance_count++; hourData.maintenance_count++; dailyData.maintenance_count++;
    } else if (flatStatus === UP) {
      minuteData.up_count++; hourData.up_count++; dailyData.up_count++;
      if (ping !== null && !isNaN(ping)) {
        this._updatePingStats(minuteData, ping);
        this._updatePingStats(hourData, ping);
        this._updatePingStats(dailyData, ping);
      }
    } else if (flatStatus === DOWN) {
      minuteData.down_count++; hourData.down_count++; dailyData.down_count++;
    }

    // Persist to Database using pg Pool and Transaction
    const db = getDatabase();
    if (!db) {
      log.error(`[UptimeCalculator] Database pool not initialized for update on monitor ${this.monitorID}`);
      return;
    }
    const client = await db.connect(); // Get client from pool for transaction
    try {
      await client.query('BEGIN');

      // Upsert Minutely Stat (using pg syntax)
      const upsertMinutelySql = `
          INSERT INTO stat_minutely (website_id, timestamp, up_count, down_count, maintenance_count, avg_ping, min_ping, max_ping, extras)
          VALUES ($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT(website_id, timestamp) DO UPDATE SET
              up_count = stat_minutely.up_count + excluded.up_count, -- Accumulate counts correctly
              down_count = stat_minutely.down_count + excluded.down_count,
              maintenance_count = stat_minutely.maintenance_count + excluded.maintenance_count,
              -- Recalculate avg/min/max on conflict based on existing and new data
              avg_ping = CASE WHEN stat_minutely.up_count + excluded.up_count > 0
                              THEN ((COALESCE(stat_minutely.avg_ping, 0) * stat_minutely.up_count) + (COALESCE(excluded.avg_ping, 0) * excluded.up_count)) / (stat_minutely.up_count + excluded.up_count)
                              ELSE NULL END,
              min_ping = LEAST(COALESCE(stat_minutely.min_ping, excluded.min_ping, 2147483647), COALESCE(excluded.min_ping, stat_minutely.min_ping, 2147483647)),
              max_ping = GREATEST(COALESCE(stat_minutely.max_ping, excluded.max_ping, -1), COALESCE(excluded.max_ping, stat_minutely.max_ping, -1)),
              extras = excluded.extras, -- Or merge JSONB: stat_minutely.extras || excluded.extras
              updated_at = CURRENT_TIMESTAMP
      `;
       // Prepare params for insert (initial values for this heartbeat)
       const minuteParams = [
           this.monitorID, minuteKey,
           status === UP ? 1 : 0, status === DOWN ? 1 : 0, status === MAINTENANCE ? 1 : 0,
           status === UP ? ping : null, status === UP ? ping : null, status === UP ? ping : null,
           minuteData.extras // Assuming extras are not updated per heartbeat here
       ];
      await client.query(upsertMinutelySql, minuteParams);


      // Upsert Hourly Stat (similar logic, adjust table name and key)
      const upsertHourlySql = `
          INSERT INTO stat_hourly (website_id, timestamp, up_count, down_count, maintenance_count, avg_ping, min_ping, max_ping, extras)
          VALUES ($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT(website_id, timestamp) DO UPDATE SET
              up_count = stat_hourly.up_count + excluded.up_count,
              down_count = stat_hourly.down_count + excluded.down_count,
              maintenance_count = stat_hourly.maintenance_count + excluded.maintenance_count,
              avg_ping = CASE WHEN stat_hourly.up_count + excluded.up_count > 0
                              THEN ((COALESCE(stat_hourly.avg_ping, 0) * stat_hourly.up_count) + (COALESCE(excluded.avg_ping, 0) * excluded.up_count)) / (stat_hourly.up_count + excluded.up_count)
                              ELSE NULL END,
              min_ping = LEAST(COALESCE(stat_hourly.min_ping, excluded.min_ping, 2147483647), COALESCE(excluded.min_ping, stat_hourly.min_ping, 2147483647)),
              max_ping = GREATEST(COALESCE(stat_hourly.max_ping, excluded.max_ping, -1), COALESCE(excluded.max_ping, stat_hourly.max_ping, -1)),
              extras = excluded.extras,
              updated_at = CURRENT_TIMESTAMP
      `;
       const hourlyParams = [
           this.monitorID, hourKey,
           status === UP ? 1 : 0, status === DOWN ? 1 : 0, status === MAINTENANCE ? 1 : 0,
           status === UP ? ping : null, status === UP ? ping : null, status === UP ? ping : null,
           hourData.extras
       ];
      await client.query(upsertHourlySql, hourlyParams);


      // Upsert Daily Stat (similar logic, adjust table name and key)
      const upsertDailySql = `
          INSERT INTO stat_daily (website_id, timestamp, up_count, down_count, maintenance_count, avg_ping, min_ping, max_ping, extras)
          VALUES ($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT(website_id, timestamp) DO UPDATE SET
              up_count = stat_daily.up_count + excluded.up_count,
              down_count = stat_daily.down_count + excluded.down_count,
              maintenance_count = stat_daily.maintenance_count + excluded.maintenance_count,
              avg_ping = CASE WHEN stat_daily.up_count + excluded.up_count > 0
                              THEN ((COALESCE(stat_daily.avg_ping, 0) * stat_daily.up_count) + (COALESCE(excluded.avg_ping, 0) * excluded.up_count)) / (stat_daily.up_count + excluded.up_count)
                              ELSE NULL END,
              min_ping = LEAST(COALESCE(stat_daily.min_ping, excluded.min_ping, 2147483647), COALESCE(excluded.min_ping, stat_daily.min_ping, 2147483647)),
              max_ping = GREATEST(COALESCE(stat_daily.max_ping, excluded.max_ping, -1), COALESCE(excluded.max_ping, stat_daily.max_ping, -1)),
              extras = excluded.extras,
              updated_at = CURRENT_TIMESTAMP
      `;
       const dailyParams = [
           this.monitorID, dayKey,
           status === UP ? 1 : 0, status === DOWN ? 1 : 0, status === MAINTENANCE ? 1 : 0,
           status === UP ? ping : null, status === UP ? ping : null, status === UP ? ping : null,
           dailyData.extras
       ];
      await client.query(upsertDailySql, dailyParams);


      // Insert Heartbeat
      const insertHeartbeatSql = `
          INSERT INTO heartbeats (website_id, timestamp, status, ping, message)
          VALUES ($1, $2, $3, $4, $5)
      `;
      // Use date.toISOString() for timestamp with time zone column
      await client.query(insertHeartbeatSql, [this.monitorID, date.toISOString(), status, ping, message]);

      await client.query('COMMIT');
    } catch (error) {
      log.error(`[UptimeCalculator] Transaction failed for monitor ${this.monitorID}. Rolling back.`, error);
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        log.error(`[UptimeCalculator] Rollback failed for monitor ${this.monitorID}:`, rollbackError);
      }
      throw error; // Re-throw error after attempting rollback
    } finally {
      client.release(); // Release client back to the pool
    }
  }

  getMinutelyKey(date) {
    const key = date.utc().startOf("minute").unix();
    if (!this.minutelyUptimeDataList.has(key)) {
      this.minutelyUptimeDataList.push(key, this._createEmptyStat());
    }
    return key;
  }

  getHourlyKey(date) {
    const key = date.utc().startOf("hour").unix();
    if (!this.hourlyUptimeDataList.has(key)) {
      this.hourlyUptimeDataList.push(key, this._createEmptyStat());
    }
    return key;
  }

  getDailyKey(date) {
    const key = date.utc().startOf("day").unix();
    if (!this.dailyUptimeDataList.has(key)) {
      this.dailyUptimeDataList.push(key, this._createEmptyStat());
    }
    return key;
  }

  getUptimeData(numPeriods, type = "day") {
    const dataList = this._getDataListByType(type);
    const keyFunction = this._getKeyFunctionByType(type);
    const periodSeconds = this._getPeriodSeconds(type);

    if (!dataList || !keyFunction || !periodSeconds) throw new Error(`Invalid type specified: ${type}`);
    if (numPeriods > dataList.limit) {
       log.warn(`Requested period (${numPeriods} ${type}s) exceeds cache limit (${dataList.limit}). Result may be incomplete.`);
       numPeriods = dataList.limit;
    }

    const nowKey = keyFunction(this.getCurrentDate());
    const startKey = nowKey - periodSeconds * (numPeriods - 1);
    let totalUp = 0, totalDown = 0, totalPingSum = 0, pingCount = 0;

    for (let key = startKey; key <= nowKey; key += periodSeconds) {
      const data = dataList.get(key, null);
      if (data) {
        totalUp += data.up_count || 0;
        totalDown += data.down_count || 0;
        if (data.avg_ping !== null && data.up_count > 0) {
          totalPingSum += data.avg_ping * data.up_count;
          pingCount += data.up_count;
        }
      }
    }
    const totalChecks = totalUp + totalDown;
    const uptime = totalChecks === 0 ? 1 : totalUp / totalChecks;
    const avgPing = pingCount === 0 ? null : totalPingSum / pingCount;
    return {
      uptime: parseFloat(uptime.toFixed(4)),
      avgPing: avgPing !== null ? parseFloat(avgPing.toFixed(2)) : null,
    };
  }

  getStatsArray(numPeriods, type = "day") {
    const dataList = this._getDataListByType(type);
    const keyFunction = this._getKeyFunctionByType(type);
    const periodSeconds = this._getPeriodSeconds(type);

    if (!dataList || !keyFunction || !periodSeconds) throw new Error(`Invalid type specified: ${type}`);
    if (numPeriods > dataList.limit) {
        log.warn(`Requested period (${numPeriods} ${type}s) exceeds cache limit (${dataList.limit}). Result may be incomplete.`);
        numPeriods = dataList.limit;
     }

    const nowKey = keyFunction(this.getCurrentDate());
    const startKey = nowKey - periodSeconds * (numPeriods - 1);
    const results = [];
    for (let key = startKey; key <= nowKey; key += periodSeconds) {
        const data = dataList.get(key, null);
        results.push({ timestamp: key, ...(data || this._createEmptyStat()) });
    }
    return results;
  }

  getCurrentDate() { return dayjs.utc(); }

  async cleanupOldStats() {
    const db = getDatabase();
    if (!db) {
      log.error(`[UptimeCalculator] Database pool not initialized for cleanup on monitor ${this.monitorID}`);
      return;
    }
    const now = this.getCurrentDate();

    const runDelete = async (table, cutoffKey) => {
      const sql = `DELETE FROM ${table} WHERE website_id = $1 AND timestamp < to_timestamp($2)`;
      try {
        await db.query(sql, [this.monitorID, cutoffKey]);
      } catch (err) {
        log.error(`[UptimeCalculator] Error cleaning ${table} for monitor ${this.monitorID}:`, err);
        // Don't re-throw, allow other cleanups to proceed
      }
    };

    try {
      const minutelyCutoff = this.getMinutelyKey(now.subtract(this.statMinutelyKeepHours, "hour"));
      await runDelete('stat_minutely', minutelyCutoff);

      const hourlyCutoff = this.getHourlyKey(now.subtract(this.statHourlyKeepDays, "day"));
      await runDelete('stat_hourly', hourlyCutoff);

      const dailyCutoff = this.getDailyKey(now.subtract(this.statDailyKeepDays, "day"));
      await runDelete('stat_daily', dailyCutoff);

      log.info(`UptimeCalculator [Monitor ${this.monitorID}]: Old stats cleaned up.`);
    } catch (error) {
      log.error(`[UptimeCalculator] General error during cleanup for monitor ${this.monitorID}:`, error);
    }
  }

  // --- Private Helper Methods ---
  _statToObject(statRow) {
      return {
          up_count: statRow.up_count,
          down_count: statRow.down_count,
          maintenance_count: statRow.maintenance_count,
          avg_ping: statRow.avg_ping,
          min_ping: statRow.min_ping,
          max_ping: statRow.max_ping,
          // Assuming 'extras' column is JSONB in PG, it will be parsed automatically by node-pg
          extras: statRow.extras,
      };
  }

  _createEmptyStat() {
    return { up_count: 0, down_count: 0, maintenance_count: 0, avg_ping: null, min_ping: null, max_ping: null, extras: null };
  }

  _flatStatus(status) {
    switch (status) {
      case UP: case MAINTENANCE: return UP;
      case DOWN: case PENDING: return DOWN;
      default: log.warn(`UptimeCalculator: Encountered unknown status code ${status}`); return DOWN;
    }
  }

  _updatePingStats(statData, newPing) {
    // Ensure up_count is treated as a number
    const currentUpCount = Number(statData.up_count || 0);
    const currentAvgPing = Number(statData.avg_ping || 0);

    if (currentUpCount === 0) { // First UP beat contributing to this stat period
        statData.avg_ping = newPing;
        statData.min_ping = newPing;
        statData.max_ping = newPing;
    } else { // Subsequent UP beats
        statData.avg_ping = (currentAvgPing * currentUpCount + newPing) / (currentUpCount + 1);
        statData.min_ping = statData.min_ping === null ? newPing : Math.min(statData.min_ping, newPing);
        statData.max_ping = statData.max_ping === null ? newPing : Math.max(statData.max_ping, newPing);
    }
    // Note: up_count is incremented *after* this function in the main update logic
  }

   _getDataListByType(type) {
    switch (type) { case "minute": return this.minutelyUptimeDataList; case "hour": return this.hourlyUptimeDataList; case "day": return this.dailyUptimeDataList; default: return null; }
  }
  _getKeyFunctionByType(type) {
      switch (type) { case "minute": return this.getMinutelyKey.bind(this); case "hour": return this.getHourlyKey.bind(this); case "day": return this.getDailyKey.bind(this); default: return null; }
  }
  _getPeriodSeconds(type) {
      switch (type) { case "minute": return 60; case "hour": return 3600; case "day": return 86400; default: return null; }
  }
}

module.exports = UptimeCalculator;
