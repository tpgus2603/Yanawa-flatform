// dtos/ScheduleRequestDTO.js

const Joi = require('joi');

class ScheduleRequestDTO {
    constructor(data) {
        this.data = data;
    }
    validate(type = 'create') {
        // 기본 스키마 정의
        let schema = Joi.object({
            title: Joi.string().min(1).max(255).required(),
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().required(),
            is_fixed: Joi.boolean().required()
        });

        // 'update' 타입의 경우 모든 필드를 필수로 하지 않을 수 있음
        if (type === 'update') {
            schema = Joi.object({
                title: Joi.string().min(1).max(255).optional(),
                start_time: Joi.date().iso().optional(),
                end_time: Joi.date().iso().optional(),
                is_fixed: Joi.boolean().optional()
            }).or('title', 'start_time', 'end_time', 'is_fixed'); // 최소 한 개 이상의 필드가 필요
        }

        const { error, value } = schema.validate(this.data, { abortEarly: false });

        if (error) {
            // 모든 에러 메시지를 하나의 문자열로 결합
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            throw new Error(`Validation error: ${errorMessages}`);
        }

        // 검증된 데이터를 반환
        return value;
    }
}

module.exports = ScheduleRequestDTO;
