const jwt = require('jsonwebtoken');


const verifyToken = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    // console.log('token', token)

    if (!token) {
        return res.status(403).json({
            message: "No token provided",
            success: false,
        });
    }

    jwt.verify(token, process.env.SECRET_TOKEN_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                message: "Unauthorized! Invalid token",
                success: false,
            });
        }
        req.decoded = decoded;
        next();
    });
};

module.exports = verifyToken