import { forbidden, unauthorized } from '../errors.js';

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Tu rol no tiene acceso a esta sección.'));
    }
    next();
  };
}
