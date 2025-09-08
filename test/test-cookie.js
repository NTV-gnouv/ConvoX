const CookieAuth = require('../core/CookieAuth');
const fs = require('fs-extra');

async function testCookie() {
    console.log('🍪 Đang kiểm tra cookie...\n');
    
    try {
        const cookieAuth = new CookieAuth();
        
        // 1. Đọc cookie
        console.log('1. Đọc cookie từ file...');
        const cookies = await cookieAuth.loadCookies();
        console.log(`   ✅ Đã đọc ${cookies.length} cookies`);
        
        // 2. Validate cookie
        console.log('\n2. Kiểm tra tính hợp lệ...');
        cookieAuth.validateCookies(cookies);
        console.log('   ✅ Cookie hợp lệ');
        
        // 3. Lấy User ID
        console.log('\n3. Lấy thông tin User ID...');
        const userId = cookieAuth.getUserIdFromCookies(cookies);
        console.log(`   👤 User ID: ${userId}`);
        
        // 4. Kiểm tra hết hạn
        console.log('\n4. Kiểm tra thời hạn...');
        const isExpired = cookieAuth.isExpired(cookies);
        if (isExpired) {
            console.log('   ⚠️  Cookie có vẻ đã hết hạn');
        } else {
            console.log('   ✅ Cookie vẫn còn hiệu lực');
        }
        
        // 5. Convert sang appState
        console.log('\n5. Chuyển đổi sang appState...');
        const appState = cookieAuth.convertCookiesToAppState(cookies);
        console.log(`   ✅ Đã chuyển đổi thành ${appState.length} items appState`);
        
        // 6. Hiển thị thông tin chi tiết
        console.log('\n📋 Thông tin chi tiết:');
        cookies.forEach((cookie, index) => {
            console.log(`   ${index + 1}. ${cookie.key}: ${cookie.value.substring(0, 20)}${cookie.value.length > 20 ? '...' : ''}`);
        });
        
        console.log('\n✅ Kiểm tra cookie hoàn tất! Cookie có thể sử dụng được.');
        
    } catch (error) {
        console.error('\n❌ Lỗi khi kiểm tra cookie:');
        console.error('   ', error.message);
        
        if (error.message.includes('không tìm thấy')) {
            console.log('\n💡 Hướng dẫn:');
            console.log('   1. Đảm bảo file cookies.json tồn tại');
            console.log('   2. Kiểm tra format cookie đúng như mẫu');
        }
    }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
    testCookie();
}

module.exports = testCookie;
