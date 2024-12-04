const axios = require('axios');
const { performance } = require('perf_hooks');

async function runPerformanceTest() {
    const baseURL = 'http://localhost:3000/api';
    const iterations = 100;
    
    // 테스트 데이터
    const testSchedule = {
        title: 'Test Schedule',
        is_fixed: true,
        time_indices: [36, 37, 38]
    };

    console.log(`Starting performance test with ${iterations} iterations`);

    // 테스트 결과 저장용 객체
    const results = {
        create: [],
        update: [],
        getAll: [],
        getByTimeIdx: [],
        delete: []
    };

    for (let i = 0; i < iterations; i++) {
        try {
            console.log(`Running iteration ${i + 1}/${iterations}`);

            // Create
            const createStart = performance.now();
            await axios.post(`${baseURL}/schedule`, testSchedule);
            results.create.push(performance.now() - createStart);
            
            // Get All Schedules
            const getAllStart = performance.now();
            await axios.get(`${baseURL}/schedule/all`);
            results.getAll.push(performance.now() - getAllStart);

            // Get Schedule by Time Index
            const getByTimeIdxStart = performance.now();
            await axios.get(`${baseURL}/schedule/36`);
            results.getByTimeIdx.push(performance.now() - getByTimeIdxStart);
            
            // Update
            const updateStart = performance.now();
            await axios.put(`${baseURL}/schedule`, {
                originalTitle: 'Test Schedule',
                title: 'Updated Schedule',
                is_fixed: true,
                time_indices: [39, 40, 41]
            });
            results.update.push(performance.now() - updateStart);
            
            // Delete
            const deleteStart = performance.now();
            await axios.delete(`${baseURL}/schedule`, {
                data: { title: 'Updated Schedule' }
            });
            results.delete.push(performance.now() - deleteStart);

        } catch (error) {
            console.error(`Iteration ${i} failed:`, error.message);
        }
    }

    // 결과 분석
    const analyzeResults = (times) => {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        return {
            average: avg.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2),
            count: times.length
        };
    };

    // 성능 통계 출력
    console.log('\nPerformance Results (ms):');
    console.log('Create Schedule:', analyzeResults(results.create));
    console.log('Get All Schedules:', analyzeResults(results.getAll));
    console.log('Get Schedule by Time Index:', analyzeResults(results.getByTimeIdx));
    console.log('Update Schedule:', analyzeResults(results.update));
    console.log('Delete Schedule:', analyzeResults(results.delete));

    // 성능 통계 API 호출
    try {
        const stats = await axios.get(`${baseURL}/performance/stats`);
        console.log('\nDetailed Performance Statistics:', JSON.stringify(stats.data, null, 2));
    } catch (error) {
        console.error('Failed to fetch performance stats:', error.message);
    }
}

// 테스트 실행
runPerformanceTest().catch(console.error);