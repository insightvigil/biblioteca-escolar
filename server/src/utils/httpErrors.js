// HTTP Errors utils
export const badRequest = (msg="Bad Request") => Object.assign(new Error(msg), { status: 400 });
export const notFoundErr = (msg="Not Found") => Object.assign(new Error(msg), { status: 404 });
