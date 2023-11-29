function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.TOKEN;

    if (!authHeader || authHeader !== expectedToken) {
        return res.status(403).json({
            status: "error",
            code: 403,
            message: "Unauthorized: Access is denied due to invalid credentials."
        });        
    }

    next();
}
module.exports = verifyToken;