/**
 * @description Middleware para gestionar las rutas inexistentes.
 * Devuelve un error 404 cuando la ruta solicitada no existe.
 */
const notFoundMiddleware = (req, res, next) => {

    const error = new Error(`Route not found: ${req.originalUrl}`);

    error.statusCode = 404;

    next(error);
};

export default notFoundMiddleware;