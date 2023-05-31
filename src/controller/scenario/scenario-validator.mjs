import { body, param, query } from 'express-validator';

export class ScenarioValidator {
    #actionRegistry;

    constructor({ actionRegistry }) {
        this.#actionRegistry = actionRegistry;
    }

    getScenarioValidator() {
        return [
            param('scenarioId', 'The value must be a valid uuid.').isUUID(),
        ];
    }

    listScenariosValidator() {
        return [
            query('filter', 'The value must be an object.').optional().isObject(),
            query('filter.id', 'The value must be a valid uuid.').optional().isUUID(),
            query('filter.userId', 'The value must be a valid uuid.').optional().isUUID(),
            query('filter.username', 'The value must be a string.').optional().isString(),
            query('filter.name', 'The value must be a string').optional().isString(),
            query('filter.status', 'The value must be a string.').optional().isString(),
            query('filter.flags', 'The valid must be an object with string values.').optional().isObject(),
            query('limit', 'The value must be int that is greater than or equal to 1.').isInt({ min: 1 }),
            query('page', 'The value must be int that is greater than or equal to 1.').isInt({ min: 1 }),
        ];
    }

    postScenarioValidator(callbackUriRequired = false) {
        let sceneNames = [];

        const validateAction = value => {
            const action = value.action;
            const options = value.options;

            if ('string' !== typeof action || '' === action) {
                throw new Error('Action must be a non empty string.');
            }

            if (!options || 'object' !== typeof options) {
                throw new Error('Options must be an object.');
            }

            return this.#actionRegistry.get(action).validateOptions({ options, sceneNames });
        }

        return [
            body('name', 'The value must be a string with maximum length of 255 characters.').isString().isLength({ max: 255 }),
            body('flags', 'The value must be an object that contains string keys ans string values.').optional().isObject().bail().custom(flags => {
                const flagsValues = Object.values(flags);

                return flagsValues.filter(v => 'string' === typeof v).length === flagsValues.length;
            }),
            body('config', 'The value must be an object.').isObject(),
            callbackUriRequired
                ? body('config.callbackUri', 'The value must be a valid URL.').isURL()
                : body('config.callbackUri', 'The value must be a valid URL.').optional().isURL(),
            body('config.options.maxRequests', 'The value must be an int (>= 1) or undefined.').optional().isInt({ min: 1 }),
            body('config.options.maxRequestRetries', 'The value must be an int (>= 0) or undefined.').optional().isInt({ min: 0 }),
            body('config.options.viewport.width', 'The value must be an int (>= 200) or undefined.').optional().isInt({ min: 200 }),
            body('config.options.viewport.height', 'The value must be an int (>= 200) or undefined.').optional().isInt({ min: 200 }),
            body('config.scenes', 'The value must be a non empty object with string keys.').isObject().bail().custom(scenes => {
                sceneNames = Object.keys(scenes);

                return 0 < sceneNames.length && sceneNames.filter(k => 'string' === typeof k).length === sceneNames.length;
            }),
            body('config.scenes[*]', 'The value must be a non empty array.').isArray().notEmpty(),
            body('config.scenes[*][*]').isObject().bail().custom(validateAction),
            body('config.entrypoint.url', 'The value must be a valid URL.').isURL(),
            body('config.entrypoint.scene', 'The value must be a string.').isString().bail().custom(scene => {
                if (!sceneNames.includes(scene)) {
                    throw new Error(`Scene with the name "${scene}" is not defined.`);
                }

                return true;
            }),
        ];
    }
}
