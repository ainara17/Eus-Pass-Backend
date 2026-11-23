/**
 * @description Middleware centralizado para gestionar errores.
 * Devuelve una respuesta HTTP con el código y mensaje del error.
 */

const errorMiddleware = (err, rq, res, next) => {

    const statusCode = err.statusCode || 500;

    const message = err.message || "Internal server error";

    console.error(err);

    res.status(statusCode).json({
        message: message,
    });
};

export default errorMiddleware