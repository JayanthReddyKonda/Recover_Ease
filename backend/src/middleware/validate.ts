import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod validation middleware factory.
 * Validates req.body against the provided schema.
 * Returns 422 with field-level errors on failure.
 */
export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));

                res.status(422).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: fieldErrors,
                });
                return;
            }
            next(error);
        }
    };
}
