// services/performance.test.js
require('dotenv').config();
const { Op } = require('sequelize');
const ScheduleService = require('./scheduleService');
const sequelize = require('../config/sequelize');
const Schedule = require('../models/schedule');

class PerformanceTester {
    constructor() {
        this.testUserIds = [1, 2, 3, 4, 5];  // 5명의 테스트 유저만 사용
        this.results = {
            operations: {
                createSchedules: [],
                getAllSchedules: [],
                updateSchedules: [],
                deleteSchedules: []
            },
            summary: {}
        };
    }

    async setup() {
        try {
            await sequelize.authenticate();
            console.log('Database connection established successfully.');
            await Schedule.destroy({ where: {}, force: true });
            console.log('Test data cleaned successfully.');
            console.log('Using existing user IDs:', this.testUserIds);
        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    }

    async runLoadTest() {
        console.log('Starting simplified test...');

        const testSchedules = this.testUserIds.map((userId, i) => ({
            userId,
            title: `Test Schedule ${i}`,
            is_fixed: true,
            time_indices: [i * 2, i * 2 + 1]
        }));

        console.log('Test schedules:', testSchedules);

        const transaction = await sequelize.transaction();
        try {
            // Create 테스트
            console.log('\nTesting createSchedules...');
            const createdSchedules = [];
            for (const schedule of testSchedules) {
                const result = await this.measureOperation('createSchedules', async () => {
                    const created = await ScheduleService.createSchedules(schedule, transaction);
                    console.log(`Created schedule for user ${schedule.userId}`);
                    return created;
                });
                if (result) createdSchedules.push(result);
            }
            await transaction.commit();

            // 생성된 스케줄 확인
            const verifySchedules = await Schedule.findAll({
                where: {
                    user_id: { [Op.in]: this.testUserIds }
                },
                raw: true
            });
            console.log('\nVerified schedules:', verifySchedules);

            // GetAll 테스트
            console.log('\nTesting getAllSchedules...');
            for (const userId of this.testUserIds) {
                await this.measureOperation('getAllSchedules', async () => {
                    return await ScheduleService.getAllSchedules(userId);
                });
            }

            // Update 테스트
            console.log('\nTesting updateSchedules...');
            for (const schedule of createdSchedules) {
                await this.measureOperation('updateSchedules', async () => {
                    return await ScheduleService.updateSchedules(schedule.user_id, {
                        originalTitle: schedule.title,
                        title: `Updated ${schedule.title}`,
                        is_fixed: schedule.is_fixed,
                        time_indices: schedule.time_indices
                    });
                });
            }

            // Delete 테스트
            console.log('\nTesting deleteSchedules...');
            const deleteTransaction = await sequelize.transaction();
            try {
                for (const schedule of createdSchedules) {
                    await this.measureOperation('deleteSchedules', async () => {
                        return await ScheduleService.deleteSchedules(
                            schedule.user_id,
                            `Updated ${schedule.title}`,
                            deleteTransaction
                        );
                    });
                }
                await deleteTransaction.commit();
            } catch (error) {
                await deleteTransaction.rollback();
                throw error;
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        this.analyzePerfResults();
    }

    async measureOperation(name, operation) {
        const start = process.hrtime.bigint();
        try {
            const result = await operation();
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1000000;
            this.results.operations[name].push({ success: true, duration });
            return result;
        } catch (error) {
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1000000;
            this.results.operations[name].push({
                success: false,
                duration,
                error: error.message
            });
            console.error(`Error in ${name}:`, error.message);
            return null;
        }
    }

    analyzePerfResults() {
        Object.entries(this.results.operations).forEach(([operation, results]) => {
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            if (successful.length > 0) {
                const durations = successful.map(r => r.duration);
                this.results.summary[operation] = {
                    totalRequests: results.length,
                    successCount: successful.length,
                    failCount: failed.length,
                    avgDuration: durations.reduce((a, b) => a + b, 0) / successful.length,
                    minDuration: Math.min(...durations),
                    maxDuration: Math.max(...durations),
                    p95: this.calculatePercentile(durations, 95),
                    p99: this.calculatePercentile(durations, 99)
                };
            }
        });
        this.printResults();
    }

    calculatePercentile(array, percentile) {
        const sorted = array.sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    printResults() {
        console.log('\n=== Performance Test Results ===');
        Object.entries(this.results.summary).forEach(([operation, stats]) => {
            console.log(`\n${operation}:`);
            console.log(`Total Requests: ${stats.totalRequests}`);
            console.log(`Success Rate: ${((stats.successCount / stats.totalRequests) * 100).toFixed(2)}%`);
            console.log(`Average Duration: ${stats.avgDuration.toFixed(2)}ms`);
            console.log(`Min Duration: ${stats.minDuration.toFixed(2)}ms`);
            console.log(`Max Duration: ${stats.maxDuration.toFixed(2)}ms`);
            console.log(`95th Percentile: ${stats.p95.toFixed(2)}ms`);
            console.log(`99th Percentile: ${stats.p99.toFixed(2)}ms`);
        });
    }

    async cleanup() {
        try {
            await Schedule.destroy({ where: {}, force: true });
            console.log('Cleanup completed successfully.');
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}

async function runTests() {
    const tester = new PerformanceTester();
    try {
        await tester.setup();
        console.log('Starting performance tests...');
        await tester.runLoadTest();
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await sequelize.close();
    }
}

runTests();