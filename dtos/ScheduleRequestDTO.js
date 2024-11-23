// dtos/ScheduleRequestDTO.js
const Joi = require('joi');

class ScheduleRequestDTO {
    constructor(data) {
        this.data = data;
    }

    validate(type = 'create') {
        let schema;

        if (type === 'create') {
            schema = Joi.object({
                title: Joi.string().min(1).max(255).required(),
                is_fixed: Joi.boolean().required(),
                events: Joi.array().items(
                    Joi.object({
                        time_idx: Joi.number().integer().min(0).max(671).required(),
                    })
                ).min(1).required()
            });
        } else if (type === 'bulk_update') {
            schema = Joi.object({
                updates: Joi.array().items(
                    Joi.object({
                        time_idx: Joi.number().integer().min(0).max(671).required(),
                        title: Joi.string().min(1).max(255).optional(),
                        is_fixed: Joi.boolean().optional(),
                    })
                ).min(1).required()
            });
        } else if (type === 'bulk_delete') {
            schema = Joi.object({
                time_idxs: Joi.array().items(
                    Joi.number().integer().min(0).max(671).required()
                ).min(1).required()
            });
        }

        const { error, value } = schema.validate(this.data, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            throw new Error(`Validation error: ${errorMessages}`);
        }

        return value;
    }
}

module.exports = ScheduleRequestDTO;