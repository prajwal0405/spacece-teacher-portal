import jwt from 'jsonwebtoken'; const token = jwt.sign({ id: 'dummy', role: 'admin' }, 'change_this_secret_before_production'); console.log(token);
