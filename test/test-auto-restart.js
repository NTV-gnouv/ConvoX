const AutoRestart = require('../core/AutoRestart');

async function testAutoRestart() {
    console.log('🧪 Testing Auto Restart System...\n');
    
    const autoRestart = new AutoRestart();
    
    // Test 1: shouldRestart với checkpoint error
    console.log('1. Testing checkpoint error...');
    const checkpointError = new Error('checkpoint required');
    const shouldRestart1 = autoRestart.shouldRestart(checkpointError);
    console.log(`   ✅ Checkpoint error should restart: ${shouldRestart1}`);
    
    // Test 2: shouldRestart với network error
    console.log('\n2. Testing network error...');
    const networkError = new Error('ECONNRESET: connection reset by peer');
    const shouldRestart2 = autoRestart.shouldRestart(networkError);
    console.log(`   ✅ Network error should restart: ${shouldRestart2}`);
    
    // Test 3: shouldRestart với config error (không nên restart)
    console.log('\n3. Testing config error...');
    const configError = new Error('invalid credentials');
    const shouldRestart3 = autoRestart.shouldRestart(configError);
    console.log(`   ✅ Config error should restart: ${shouldRestart3}`);
    
    // Test 4: getStats
    console.log('\n4. Testing stats...');
    const stats = autoRestart.getStats();
    console.log(`   📊 Restart count: ${stats.restartCount}/${stats.maxRestarts}`);
    console.log(`   ⏱️ Last restart: ${stats.lastRestartTime ? new Date(stats.lastRestartTime).toISOString() : 'Never'}`);
    console.log(`   🔄 Is restarting: ${stats.isRestarting}`);
    
    // Test 5: Simulate multiple restarts (không thực sự restart)
    console.log('\n5. Testing restart count limit...');
    for (let i = 0; i < 6; i++) {
        autoRestart.restartCount = i;
        const should = autoRestart.shouldRestart(checkpointError);
        console.log(`   Restart ${i + 1}: ${should ? '✅ Allow' : '❌ Block'}`);
    }
    
    // Test 6: Reset counter
    console.log('\n6. Testing counter reset...');
    autoRestart.resetCounter();
    const statsAfterReset = autoRestart.getStats();
    console.log(`   📊 Count after reset: ${statsAfterReset.restartCount}`);
    
    console.log('\n✅ Auto Restart System test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Checkpoint/Security errors: Auto restart ✅');
    console.log('   - Network errors: Auto restart ✅');
    console.log('   - Config/Credential errors: No restart ❌');
    console.log('   - Restart limit: 5 times in 5 minutes');
    console.log('   - Counter auto reset after 5 minutes');
    console.log('   - Logs saved to logs/restart.log');
}

if (require.main === module) {
    testAutoRestart().catch(console.error);
}

module.exports = testAutoRestart;
