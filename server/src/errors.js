export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = 'Recurso no encontrado.') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function forbidden(message = 'No tenés permiso para realizar esta acción.') {
  return new AppError(403, 'FORBIDDEN', message);
}

export function unauthorized(message = 'Necesitás iniciar sesión.') {
  return new AppError(401, 'UNAUTHENTICATED', message);
}
