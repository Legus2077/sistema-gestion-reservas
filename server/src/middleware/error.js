import { config } from '../config.js';

export function errorHandler(error, req, res, _next) {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'El cuerpo del pedido no es JSON válido.' },
    });
  }

  const status = error.status || 500;
  const code = error.code || 'INTERNAL';

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, error);
  }

  return res.status(status).json({
    error: {
      code,
      message:
        status >= 500 && config.isProduction
          ? 'Ocurrió un error inesperado.'
          : error.message || 'Ocurrió un error inesperado.',
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No existe la ruta ${req.method} ${req.originalUrl}.`,
    },
  });
}
