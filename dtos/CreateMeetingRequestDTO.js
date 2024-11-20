// dtos/CreateMeetingRequestDTO.js

const Joi = require('joi');

class CreateMeetingRequestDTO {
    constructor({ title, description, start_time, end_time, location, deadline, type, created_by }) {
        this.title = title;
        this.description = description;
        this.start_time = start_time;
        this.end_time = end_time;
        this.location = location;
        this.deadline = deadline;
        this.type = type;
        this.created_by = created_by;
    }
    validate() {
        const schema = Joi.object({
            title: Joi.string().min(1).max(255).required(),
            description: Joi.string().allow('', null).optional(),
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().greater(Joi.ref('start_time')).required(),
            location: Joi.string().allow('', null).optional(),
            deadline: Joi.date().iso().greater(Joi.ref('start_time')).optional(),
            type: Joi.string().valid('OPEN', 'CLOSE').required(),
            created_by: Joi.number().integer().positive().required()
        });

        const { error } = schema.validate(this, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            throw new Error(`Validation error: ${errorMessages}`);
        }

        return true;
    }
}

module.exports = CreateMeetingRequestDTO;
