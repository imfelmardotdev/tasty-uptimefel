const { initializeDatabase } = require('./database/init');
const { createWebsite, getAllWebsites } = require('./database/db');
const { performCheck } = require('./monitoring/checker');

async function testSystem() {
    try {
        // Initialize database and run migrations
        console.log('Initializing database...');
        await initializeDatabase();

        // Create test websites with different configurations
        console.log('\nCreating test websites...');
        
        const websites = [
            {
                url: 'https://www.google.com',
                name: 'Google - Basic Check',
                retry_count: 1,
                timeout_ms: 5000,
                accepted_statuses: '200-299',
                follow_redirects: true
            },
            {
                url: 'https://httpstat.us/404',
                name: 'Test 404 - Custom Status',
                retry_count: 2,
                timeout_ms: 5000,
                accepted_statuses: '200-299,404', // Accept 404 as valid
                follow_redirects: false
            },
            {
                url: 'http://httpstat.us/301',
                name: 'Test Redirects',
                retry_count: 1,
                timeout_ms: 5000,
                follow_redirects: true,
                max_redirects: 3,
                accepted_statuses: '200-299,300-399'
            },
            {
                url: 'https://invalid-test-domain-123.com',
                name: 'Test DNS Error',
                retry_count: 2,
                timeout_ms: 3000,
                follow_redirects: true
            }
        ];

        for (const website of websites) {
            try {
                const created = await createWebsite(website);
                console.log(`Created website: ${created.name} (ID: ${created.id})`);
            } catch (error) {
                console.error(`Failed to create website ${website.name}:`, error.message);
            }
        }

        // Get all websites and run checks
        console.log('\nRunning checks on all websites...');
        const allWebsites = await getAllWebsites();
        
        for (const website of allWebsites) {
            console.log(`\nChecking ${website.name} (${website.url})...`);
            try {
                const result = await performCheck(website);
                console.log('Check result:', JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Check failed:', error.message);
            }
        }

        console.log('\nAll tests completed.');

    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testSystem().catch(error => {
    console.error('Test script failed:', error.message);
    process.exit(1);
});
