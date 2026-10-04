# Domain errors raised by services and turned into HTTP responses.


class AppError(Exception):
    status_code = 400

    def __init__(self, message: str, **extra):
        super().__init__(message)
        self.message = message
        self.extra = extra


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class ForbiddenError(AppError):
    status_code = 403


class LockedError(AppError):
    status_code = 423
