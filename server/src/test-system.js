const { performCheck } = require('./monitoring/checker');
const { initializeDatabase, getDatabase } = require('./database/init');
const path = require('path');

async function init() {
    console.log('Initializing database...');
    const dbPath = path.join(__dirname, '../monitoring.db');
    await initializeDatabase(dbPath);
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create test user
    const db = getDatabase();
    await new Promise((resolve, reject) => {
        db.run(
            `INSERT OR IGNORE INTO users (id, email, password_hash) 
             VALUES (1, 'test@test.com', 'test')`,
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
    console.log('Test user created.');
}

async function initTestMonitor(id, userId = 1) {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
        let errorOccurred = null; // Flag to track errors

        const checkError = (err) => {
            if (err && !errorOccurred) {
                errorOccurred = err;
                console.error(`DB Error in initTestMonitor for ID ${id}:`, err);
                reject(err); // Reject the main promise
            }
            return !!errorOccurred; // Return true if an error has occurred
        };

        db.serialize(() => {
            // Initialize monitor in monitored_websites with all required fields
            db.run(`INSERT OR IGNORE INTO monitored_websites (
                    id, user_id, name, url, check_interval, timeout_ms, retry_count,
                    accepted_status_codes, monitor_method, follow_redirects, max_redirects,
                    active, monitor_type, monitor_config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    userId,
                    id === 1 ? 'HTTPS Monitor' : id === 2 ? 'Keyword Monitor' : 'Failing Monitor',
                    id === 1 ? 'https://google.com' : 'https://www.example.com',
                    300, // check_interval
                    5000, // timeout_ms
                    1, // retry_count
                    '200-299', // accepted_status_codes
                    'GET', // monitor_method
                    1, // follow_redirects
                    5, // max_redirects
                    1, // active
                    id === 1 ? 'https' : 'keyword', // monitor_type
                    JSON.stringify(id === 1 ? 
                        { verifySSL: true, expiryThreshold: 30 } :
                        id === 2 ? 
                        { keyword: 'Example Domain', caseSensitive: false } :
                        { keyword: 'ThisShouldNotExist', caseSensitive: true }
                    )
                ],
                   (err) => {
                if (checkError(err)) return;
            });

            // Initialize monitor status
            db.run(`INSERT OR IGNORE INTO website_status 
                   (website_id, total_checks, total_successful_checks) 
                   VALUES (?, 0, 0)`,
                   [id], (err) => {
                if (checkError(err)) return;
            });

            // Initialize stat tables with empty data for current period
            const now = Math.floor(Date.now() / 1000);
            const minuteStart = now - (now % 60);
            const hourStart = now - (now % 3600);
            const dayStart = now - (now % 86400);

            db.run(`INSERT OR IGNORE INTO stat_minutely 
                   (website_id, timestamp, up_count, down_count, maintenance_count) 
                   VALUES (?, ?, 0, 0, 0)`,
                   [id, minuteStart], (err) => {
                if (checkError(err)) return;
            });

            db.run(`INSERT OR IGNORE INTO stat_hourly 
                   (website_id, timestamp, up_count, down_count, maintenance_count) 
                   VALUES (?, ?, 0, 0, 0)`,
                   [id, hourStart], (err) => {
                if (checkError(err)) return;
            });

            db.run(`INSERT OR IGNORE INTO stat_daily 
                   (website_id, timestamp, up_count, down_count, maintenance_count) 
                   VALUES (?, ?, 0, 0, 0)`,
                   [id, dayStart], (err) => {
                if (checkError(err)) return;
                if (!errorOccurred) {
                    resolve(); // Resolve only if no errors occurred throughout
                }
            });
        });
    });
}

async function testMonitoring() {
    try {
        // Initialize test monitors (Commented out to prevent creation during normal dev)
        // console.log('Initializing test monitors...');
        // await Promise.all([
        //     initTestMonitor(1),
        //     initTestMonitor(2),
        //     initTestMonitor(3)
        // ]);
        // console.log('Test monitors initialized.');

        // Fetch full website objects from DB (Keep this for testing the check logic if needed)
        // We might need to manually ensure monitors 1, 2, 3 exist if we uncomment the checks below
        // console.log('Fetching test monitors from DB...');
        // const Website = require('./models/Website'); // Assuming Website model exists
        // const httpsWebsite = await Website.getById(1);
        // const keywordWebsite = await Website.getById(2);
        // const failingKeywordWebsite = await Website.getById(3);
        // console.log('Fetched monitors:', { httpsWebsite, keywordWebsite, failingKeywordWebsite });

        // if (!httpsWebsite || !keywordWebsite || !failingKeywordWebsite) {
        //     // If monitors don't exist, we can't run the checks. Exit gracefully or skip.
        //     console.log('Test monitors not found in DB, skipping checks.');
        //     return;
        //     // throw new Error('Failed to fetch test monitors from database');
        // }

        // Test HTTPS monitoring (Commented out as monitors are not created by default)
        // console.log('\nTesting HTTPS monitoring...');
        // const httpsResult = await performCheck(httpsWebsite);
        console.log('HTTPS Check Result:', httpsResult);
        if (httpsResult.certInfo) {
            console.log('Certificate Info:', {
                valid: httpsResult.certInfo.valid,
                expiresIn: httpsResult.certInfo.daysUntilExpiration + ' days',
                issuer: httpsResult.certInfo.issuer
            });
        }

        // Test Keyword monitoring (Commented out)
        // console.log('\nTesting Keyword monitoring...');
        // const keywordResult = await performCheck(keywordWebsite);
        console.log('Keyword Check Result:', keywordResult);

        // Test failed keyword match (Commented out)
        // console.log('\nTesting failing keyword monitoring...');
        // const failingResult = await performCheck(failingKeywordWebsite);
        console.log('Failing Keyword Check Result:', failingResult);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run init and tests
init()
    .then(() => testMonitoring())
    .catch(console.error)
    .finally(() => {
        console.log('Tests finished.');
        const db = getDatabase();
        if (db) {
            db.close((err) => {
                if (err) console.error('Error closing database:', err);
                process.exit(0); // Exit after closing DB
            });
        } else {
            process.exit(0); // Exit if DB wasn't initialized
        }
    });
