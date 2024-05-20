class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
    }
}

module.exports = ApiError;