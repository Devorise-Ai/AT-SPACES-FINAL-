import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('--- Starting Security Regression Tests ---');

    const ownerToken = generateToken(3, 'CUSTOMER');
    const otherToken = generateToken(2, 'VENDOR');
    const bookingId = 4;

    // Test 1: IDOR on Calendar Access
    console.log('\nTesting IDOR on Calendar...');
    try {
        const res = await axios.get(`${API_URL}/bookings/${bookingId}/calendar`, {
            headers: { Authorization: `Bearer ${otherToken}` }
        });
        console.error('FAIL: Non-owner accessed calendar!');
    } catch (err: any) {
        if (err.response?.status === 404) {
            console.log('PASS: Non-owner received 404 for another user\'s booking.');
        } else {
            console.error(`FAIL: Expected 404, got ${err.response?.status}`);
        }
    }

    // Test 2: Invalid Duration Validation
    console.log('\nTesting Business Logic: Max Duration...');
    try {
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 100 * 3600000); // 100 hours
        const res = await axios.post(`${API_URL}/availability/check`, {
            vendorServiceId: 9,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            quantity: 1
        });
        console.error('FAIL: Over-max duration allowed!');
    } catch (err: any) {
        if (err.response?.status === 400 && err.response.data.error.includes('Duration cannot exceed')) {
            console.log('PASS: Over-max duration correctly rejected (400).');
        } else {
            console.error(`FAIL: Expected 400 with duration error, got ${err.response?.status}`, err.response?.data);
        }
    }

    // Test 3: Zero/Negative Quantity
    console.log('\nTesting Business Logic: Invalid Quantity...');
    try {
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 2 * 3600000); // 2 hours
        const res = await axios.post(`${API_URL}/availability/check`, {
            vendorServiceId: 9,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            quantity: -1
        });
        console.error('FAIL: Negative quantity allowed!');
    } catch (err: any) {
        if (err.response?.status === 400 && err.response.data.error.includes('Invalid quantity')) {
            console.log('PASS: Negative quantity correctly rejected (400).');
        } else {
            console.error(`FAIL: Expected 400 with quantity error, got ${err.response?.status}`, err.response?.data);
        }
    }

    // Test 4: Reversed Times
    console.log('\nTesting Business Logic: Reversed Times...');
    try {
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() - 2 * 3600000); // End before start
        const res = await axios.post(`${API_URL}/availability/check`, {
            vendorServiceId: 9,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            quantity: 1
        });
        console.error('FAIL: Reversed times allowed!');
    } catch (err: any) {
        if (err.response?.status === 400 && err.response.data.error.includes('Start time must be before')) {
            console.log('PASS: Reversed times correctly rejected (400).');
        } else {
            console.error(`FAIL: Expected 400 with timing error, got ${err.response?.status}`, err.response?.data);
        }
    }

    console.log('\n--- Tests Completed ---');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Test Execution Error:', err.message);
    process.exit(1);
});
