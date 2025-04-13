const { performCheck } = require('./checker');

async function runTests() {
    console.log('Running monitoring tests...\n');

    // Test 1: Basic successful check
    console.log('Test 1: Basic successful check (Google)');
    try {
        const result = await performCheck({
            id: 1,
            url: 'https://www.google.com',
            timeout_ms: 5000,
            retry_count: 1,
            accepted_statuses: '200-299'
        });
        console.log('Result:', JSON.stringify(result, null, 2), '\n');
    } catch (error) {
        console.error('Test 1 failed:', error, '\n');
    }

    // Test 2: Check with retries (invalid domain)
    console.log('Test 2: Failed check with retries');
    try {
        const result = await performCheck({
            id: 2,
            url: 'https://invalid-test-domain-123.com',
            timeout_ms: 3000,
            retry_count: 2,
            accepted_statuses: '200-299'
        });
        console.log('Result:', JSON.stringify(result, null, 2), '\n');
    } catch (error) {
        console.error('Test 2 failed:', error, '\n');
    }

    // Test 3: Check with custom status codes
    console.log('Test 3: Check with custom status codes (should accept 404)');
    try {
        const result = await performCheck({
            id: 3,
            url: 'https://www.google.com/notfound',
            timeout_ms: 5000,
            retry_count: 1,
            accepted_statuses: '200-299,404'
        });
        console.log('Result:', JSON.stringify(result, null, 2), '\n');
    } catch (error) {
        console.error('Test 3 failed:', error, '\n');
    }

    // Test 4: Check with redirects
    console.log('Test 4: Check with redirects');
    try {
        const result = await performCheck({
            id: 4,
            url: 'http://google.com', // Will redirect to https://www.google.com
            timeout_ms: 5000,
            retry_count: 1,
            follow_redirects: true,
            max_redirects: 3,
            accepted_statuses: '200-299,300-399'
        });
        console.log('Result:', JSON.stringify(result, null, 2), '\n');
    } catch (error) {
        console.error('Test 4 failed:', error, '\n');
    }

    // Test 5: Timeout test
    console.log('Test 5: Timeout test');
    try {
        const result = await performCheck({
            id: 5,
            url: 'https://www.google.com',
            timeout_ms: 1, // Extremely short timeout
            retry_count: 2,
            accepted_statuses: '200-299'
        });
        console.log('Result:', JSON.stringify(result, null, 2), '\n');
    } catch (error) {
        console.error('Test 5 failed:', error, '\n');
    }
}

// Run the tests
runTests().catch(console.error);
