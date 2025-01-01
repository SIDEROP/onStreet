class ApiError extends Error {
    constructor(status, message, stack = "") {
        super(message);
        this.status = status;
        this.data = null;
        this.success = false;
        this.message = message;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            success: this.success,
            status: this.status,
            message: this.message,
            data: this.data,
            stack: this.stack
        }
    }
}

export default ApiError