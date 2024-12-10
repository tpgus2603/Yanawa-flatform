// dtos/CreateMeetingRequestDTO.js
const Joi = require('joi');

class CreateMeetingRequestDTO {
    constructor({ title, description, time_idx_start, time_idx_end, location, time_idx_deadline, type, created_by }) {
        this.data = {
            title,
            description,
            time_idx_start,
            time_idx_end,
            location,
            time_idx_deadline,
            type,
            created_by,
        };
    }

    validate() {
        const schema = Joi.object({
            title: Joi.string().min(1).max(255).required(),
            description: Joi.string().allow('', null).optional(),
            time_idx_start: Joi.number().integer().min(0).required(),
            time_idx_end: Joi.number().integer().greater(Joi.ref('time_idx_start')).required(),
            location: Joi.string().allow('', null).optional(),
            time_idx_deadline: Joi.number().integer().min(0).max(Joi.ref('time_idx_start')).optional(),
            type: Joi.string().valid('OPEN', 'CLOSE').required(),
            created_by: Joi.number().integer().positive().required(),
        });

        const { error } = schema.validate(this.data, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message).join(', ');
            throw new Error(`Validation error: ${errorMessages}`);
        }

        return true;
    }
}

module.exports = CreateMeetingRequestDTO;
