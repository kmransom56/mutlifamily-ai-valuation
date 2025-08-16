#!/usr/bin/env node

/**
 * Test Fixed Application
 * Tests all the issues we just fixed
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🔧 TESTING FIXED APPLICATION');
console.log('=============================');

let server;
let serverPort = 3000;
let testsPassed = 0;
let testsFailed = 0;

function log(type, message) {
    const colors = {
        info: '\x1b[34m[INFO]\x1b[0m',
        pass: '\x1b[32m[PASS]\x1b[0m',
        fail: '\x1b[31m[FAIL]\x1b[0m',
        warn: '\x1b[33m[WARN]\x1b[0m'
    };
    console.log(`${colors[type]} ${message}`);
    if (type === 'pass') testsPassed++;
    if (type === 'fail') testsFailed++;
}

function testUrl(port, path, name, expectedStatus = 200) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === expectedStatus) {
                log('pass', `${name} (Status: ${res.statusCode})`);
                resolve(true);
            } else {
                log('fail', `${name} - Expected ${expectedStatus}, got ${res.statusCode}`);
                resolve(false);
            }
        });

        req.on('error', (err) => {
            log('fail', `${name} - ${err.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            log('fail', `${name} - Request timed out`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function startServer() {
    return new Promise((resolve) => {
        log('info', 'Starting Next.js development server...');
        
        server = spawn('npm', ['run', 'dev'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let resolved = false;

        server.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`SERVER: ${output.trim()}`);
            
            // Extract port from output
            const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
            if (portMatch) {
                serverPort = parseInt(portMatch[1]);
                log('info', `Server detected on port ${serverPort}`);
            }
            
            if ((output.includes('Ready in') || output.includes('Local:')) && !resolved) {
                resolved = true;
                setTimeout(() => resolve(true), 2000);
            }
        });

        server.stderr.on('data', (data) => {
            const error = data.toString();
            if (error.includes('Port') && error.includes('in use')) {
                const portMatch = error.match(/port (\d+)/);
                if (portMatch) {
                    serverPort = parseInt(portMatch[1]);
                }
            }
            console.log(`SERVER ERR: ${error.trim()}`);
        });

        server.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        }, 20000);
    });
}

async function runTests() {
    const serverStarted = await startServer();
    if (!serverStarted) {
        log('fail', 'Could not start server');
        process.exit(1);
    }

    log('info', `Testing application on port ${serverPort}`);

    // Test 1: Frontend Pages (previously failing)
    console.log('\n📄 Frontend Pages');
    console.log('==================');
    
    await testUrl(serverPort, '/', 'Home page loads');
    await testUrl(serverPort, '/properties', 'Properties page loads');
    await testUrl(serverPort, '/calculator', 'Calculator page loads');
    await testUrl(serverPort, '/dashboard', 'Dashboard page loads');
    
    // Test 2: API Endpoints 
    console.log('\n🔌 API Endpoints');
    console.log('=================');
    
    await testUrl(serverPort, '/api/health', 'Health API');
    await testUrl(serverPort, '/api/properties', 'Properties API');
    
    // Test 3: Files API (previously failing)
    console.log('\n📁 Files API (Fixed)');
    console.log('=====================');
    
    await testUrl(serverPort, '/api/files', 'Files API without params');
    await testUrl(serverPort, '/api/files?file=test.txt&jobId=123', 'Files API with params');
    
    // Test 4: Error Handling
    console.log('\n❌ Error Handling');
    console.log('==================');
    
    await testUrl(serverPort, '/nonexistent', '404 handling', 404);
    
    // Test 5: TypeScript Compilation
    console.log('\n🔧 Build & Types');
    console.log('=================');
    
    log('info', 'Testing TypeScript compilation...');
    const { spawn: spawnSync } = require('child_process');
    const typeCheck = spawnSync('npm', ['run', 'type-check'], { stdio: 'pipe' });
    
    if (typeCheck.status === 0) {
        log('pass', 'TypeScript compilation passes');
    } else {
        log('fail', 'TypeScript compilation failed');
    }

    // Results
    console.log('\n=============================');
    console.log('🏆 TEST RESULTS SUMMARY');
    console.log('=============================');
    
    const total = testsPassed + testsFailed;
    console.log(`Tests Passed: \x1b[32m${testsPassed}\x1b[0m/${total}`);
    console.log(`Tests Failed: \x1b[31m${testsFailed}\x1b[0m/${total}`);
    
    const successRate = Math.round((testsPassed / total) * 100);
    console.log(`Success Rate: ${successRate}%`);
    
    if (testsFailed === 0) {
        console.log('\n\x1b[32m🎉 ALL ISSUES FIXED!\x1b[0m');
        console.log('✅ Frontend pages working');
        console.log('✅ Files API working');  
        console.log('✅ TypeScript tests clean');
        console.log('\nApplication is ready for production!');
    } else if (successRate >= 80) {
        console.log('\n\x1b[33m✅ MAJOR ISSUES FIXED!\x1b[0m');
        console.log(`Success rate: ${successRate}% - Great improvement!`);
    } else {
        console.log('\n\x1b[31m❌ SOME ISSUES REMAIN\x1b[0m');
        console.log('Check the failed tests above.');
    }

    cleanup();
}

function cleanup() {
    log('info', 'Cleaning up...');
    if (server) {
        server.kill('SIGTERM');
        setTimeout(() => {
            try {
                server.kill('SIGKILL');
            } catch (e) {
                // Already dead
            }
        }, 2000);
    }
    
    setTimeout(() => {
        process.exit(testsFailed === 0 ? 0 : 1);
    }, 3000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

runTests().catch(err => {
    console.error('Test failed:', err);
    cleanup();
});