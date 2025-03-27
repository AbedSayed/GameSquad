const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz', {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
