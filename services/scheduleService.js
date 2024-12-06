// services/scheduleService.js
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const Schedule = require('../models/schedule');
const ScheduleResponseDTO = require('../dtos/ScheduleResponseDTO');

class ScheduleService {
    /**
     * 스케줄 생성 (벌크)
     * @param {object} [transaction] - Sequelize 트랜잭션 객체 -> 미팅방에서 쓰기위해 트랜잭션을 넘겨받는걸 추가 
     */
    async createSchedules({ userId, title, is_fixed, time_indices }, transaction = null) {
        const overlaps = await Schedule.findAll({
            where: {
                user_id: userId,
                time_idx: {
                    [Op.in]: time_indices
                }
            },
            transaction
        });

        if (overlaps.length > 0) {
            throw new Error(`Schedule overlaps at time_idx ${overlaps[0].time_idx}`);
        }

        const scheduleData = time_indices.map(time_idx => ({
            user_id: userId,
            title,
            time_idx,
            is_fixed
        }));

        try {
            const createdSchedules = await Schedule.bulkCreate(scheduleData, {
                transaction,
                returning: true,
                validate: true
            });

            return {
                id: createdSchedules[0].id,
                user_id: userId,
                title,
                is_fixed,
                time_indices,
                createdAt: createdSchedules[0].createdAt,
                updatedAt: createdSchedules[0].updatedAt
            };
        } catch (error) {
            throw new Error(`Failed to bulk create schedules: ${error.message}`);
        }
    }

    async getAllSchedules(userId) {
        try {
            const schedules = await Schedule.findAll({
                where: { user_id: userId },
                order: [['time_idx', 'ASC']]
            });

            return ScheduleResponseDTO.groupSchedules(schedules);
        } catch (error) {
            throw new Error(`Failed to fetch schedules: ${error.message}`);
        }
    }

    async updateSchedules(userId, updates, transaction = null) {
        const { originalTitle, title, is_fixed, time_indices } = updates;

        // 기존 스케줄 조회
        const existingSchedules = await Schedule.findAll({
            where: {
                user_id: userId,
                title: originalTitle
            },
            transaction
        });

        if (existingSchedules.length === 0) {
            throw new Error('Schedule not found');
        }

        const existingTimeIndices = existingSchedules.map(s => s.time_idx); // 기존 시간대
        const toDelete = existingTimeIndices.filter(idx => !time_indices.includes(idx)); // 삭제할 시간대
        const toAdd = time_indices.filter(idx => !existingTimeIndices.includes(idx)); // 추가할 시간대
        const t = transaction || await sequelize.transaction();

        try {
            // 삭제
            if (toDelete.length > 0) {
                await Schedule.destroy({
                    where: {
                        user_id: userId,
                        title: originalTitle,
                        time_idx: {
                            [Op.in]: toDelete
                        }
                    },
                    transaction: t
                });
            }

            // 제목, 고정/유동 업데이트
            await Schedule.update(
                {
                    title,
                    is_fixed
                },
                {
                    where: {
                        user_id: userId,
                        title: originalTitle
                    },
                    transaction: t
                }
            );

            // 새로운 time_indices 추가
            if (toAdd.length > 0) {
                await Promise.all(
                    toAdd.map(time_idx =>
                        Schedule.create({
                            user_id: userId,
                            title,
                            time_idx,
                            is_fixed
                        }, { transaction: t })
                    )
                );
            }

            if (!transaction) {
                await t.commit();
            }

            return {
                id: existingSchedules[0].id,
                user_id: userId,
                title,
                is_fixed,
                time_indices,
                createdAt: existingSchedules[0].createdAt,
                updatedAt: new Date()
            };

        } catch (error) {
            if (!transaction) {
                await t.rollback();
            }
            throw error;
        }
    }

    async deleteSchedules(userId, title, transaction = null) {
        const deletedSchedules = await Schedule.destroy({
            where: {
                user_id: userId,
                title
            },
            transaction
        });

        return { deletedCount: deletedSchedules };
    }

    /**
     * 특정 time_idx로 스케줄 조회
     */
    async getScheduleByTimeIdx(userId, time_idx) {
        // 해당 time_idx의 스케줄 찾기
        const schedules = await Schedule.findAll({
            where: {
                user_id: userId,
                title: {
                    [Op.in]: sequelize.literal(
                        `(SELECT title FROM Schedules WHERE user_id = ${userId} AND time_idx = ${time_idx})`
                    )
                }
            },
            order: [['time_idx', 'ASC']]
        });

        return ScheduleResponseDTO.groupSchedules(schedules)[0];
    }

    async getAllSchedules(userId) {
        try {
            const schedules = await Schedule.findAll({
                where: { user_id: userId },
                order: [['time_idx', 'ASC']]
            });
            return ScheduleResponseDTO.groupSchedules(schedules);
        } catch (error) {
            throw new Error(`Failed to fetch schedules: ${error.message}`);
        }
    }

    async checkScheduleOverlap(userId, time_idx, transaction = null) {
        const overlappingSchedule = await Schedule.findOne({
            where: { user_id: userId, time_idx },
            transaction
        });
        return !!overlappingSchedule;
    }

    async checkScheduleOverlapByTime(userId, time_idx_start, time_idx_end, transaction = null) {
        const overlappingSchedules = await Schedule.findAll({
            where: {
                user_id: userId,
                time_idx: {
                    [Op.between]: [time_idx_start, time_idx_end]
                }
            },
            transaction
        });

        const groupedSchedules = ScheduleResponseDTO.groupSchedules(overlappingSchedules);
        const result = groupedSchedules.length > 0;

        console.log(`checkScheduleOverlapByTime 호출: userId=${userId}, time_idx_start=${time_idx_start}, time_idx_end=${time_idx_end}`);
        console.log(`중복 스케줄: ${JSON.stringify(groupedSchedules)}`);
        console.log(`스케줄 충돌 결과: ${result}`);

        return result;
    }

    async cleanExpiredSchedules() {
        try {
            const deletedCount = await Schedule.destroy({
                where: { is_fixed: false }
            });
            return { deletedCount };
        } catch (error) {
            console.error('Failed to clean expired schedules:', error);
            throw error;
        }
    }
}

module.exports = new ScheduleService();
