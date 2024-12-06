// utils/performanceMonitor.js
const { performance, PerformanceObserver } = require('perf_hooks');

class PerformanceMonitor {
    constructor() {
        this.measurements = new Map();
        
        // 성능 관찰자 설정
        this.observer = new PerformanceObserver((items) => {
            items.getEntries().forEach((entry) => {
                const measurements = this.measurements.get(entry.name) || [];
                measurements.push(entry.duration);
                this.measurements.set(entry.name, measurements);
                
                console.log(`Performance Measurement - ${entry.name}: ${entry.duration}ms`);
            });
        });
        
        this.observer.observe({ entryTypes: ['measure'] });
    }

    async measureAsync(name, fn) {
        const start = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - start;
            performance.measure(name, { 
                start,
                duration,
                detail: { timestamp: new Date().toISOString() }
            });
        }
    }

    getStats(name) {
        const measurements = this.measurements.get(name) || [];
        if (measurements.length === 0) return null;

        const sum = measurements.reduce((a, b) => a + b, 0);
        const avg = sum / measurements.length;
        const min = Math.min(...measurements);
        const max = Math.max(...measurements);

        return {
            count: measurements.length,
            average: avg,
            min: min,
            max: max,
            total: sum
        };
    }

    getAllStats() {
        const stats = {};
        for (const [name, measurements] of this.measurements.entries()) {
            stats[name] = this.getStats(name);
        }
        return stats;
    }
}

module.exports = new PerformanceMonitor();