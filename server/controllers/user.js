import validator from 'validator';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import Lead from '../models/lead.js';
import { createError } from '../utils/error.js';

const UPDATABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'city', 'CNIC'];


export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json({ result: users, message: 'Users fetched successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const getUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return next(createError(404, 'User not found'));

        res.status(200).json({ result: user, message: 'User fetched successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const filterUser = async (req, res, next) => {
    const { startingDate, endingDate, ...filters } = req.query;
    try {
        let query = User.find(filters);

        if (startingDate && isValidDate(startingDate)) {
            const start = new Date(startingDate);
            start.setHours(0, 0, 0, 0);
            query = query.where('createdAt').gte(start);
        }

        if (endingDate && isValidDate(endingDate)) {
            const end = new Date(endingDate);
            end.setHours(23, 59, 59, 999);
            query = query.where('createdAt').lte(end);
        }

        const results = await query.exec();
        res.status(200).json({ result: results });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const getClients = async (req, res, next) => {
    try {
        const clients = await User.find({ role: 'client' });
        res.status(200).json({ result: clients, message: 'Clients fetched successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const getEmployeeClients = async (req, res, next) => {
    try {
        const allClients    = await User.find({ role: 'client' });
        const employeeLeads = await Lead.find({ allocatedTo: { $in: req.user?._id }, isArchived: false });

        const clients = allClients.filter((client) =>
            employeeLeads.some((lead) => lead.clientPhone.toString() === client.phone.toString())
        );

        res.status(200).json({ result: clients, message: 'Clients fetched successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const getEmployees = async (req, res, next) => {
    try {
        const employees = await User.find({ role: 'employee' });
        res.status(200).json({ result: employees, message: 'Employees fetched successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const createClient = async (req, res, next) => {
    try {
        const { username, phone, email } = req.body;

        if (!username || !phone) {
            return next(createError(400, 'username and phone are required'));
        }

        if (email && !validator.isEmail(email)) {
            return next(createError(400, 'Invalid email address'));
        }
        if (!validator.isMobilePhone(phone, 'any')) {
            return next(createError(400, 'Invalid phone number'));
        }

        const existing = await User.findOne({ email });
        if (existing) return next(createError(400, 'Email already in use'));

        const client = await User.create({ ...req.body, role: 'client' });
        res.status(201).json({ result: client, message: 'Client created successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const createEmployee = async (req, res, next) => {
    try {
        const { username, phone, password, email } = req.body;

        if (!username || !phone || !password) {
            return next(createError(400, 'username, phone and password are required'));
        }

        if (email && !validator.isEmail(email)) {
            return next(createError(400, 'Invalid email address'));
        }
        if (!validator.isMobilePhone(phone, 'any')) {
            return next(createError(400, 'Invalid phone number'));
        }
        if (password.length < 8) {
            return next(createError(400, 'Password must be at least 8 characters'));
        }

        const existing = await User.findOne({ username });
        if (existing) return next(createError(400, 'Username already in use'));

        const hashedPassword = await bcrypt.hash(password, 12);
        const employee = await User.create({ ...req.body, password: hashedPassword, role: 'employee' });

        res.status(201).json({ result: employee, message: 'Employee created successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const FORBIDDEN = ['password', 'role', 'username'];
        const attempted = FORBIDDEN.filter((f) => f in req.body);
        if (attempted.length > 0) {
            return next(createError(400, `Cannot update [${attempted.join(', ')}] via this endpoint`));
        }

        const { email, phone } = req.body;

        if (email && !validator.isEmail(email)) {
            return next(createError(400, 'Invalid email address'));
        }
        if (phone && !validator.isMobilePhone(phone, 'any')) {
            return next(createError(400, 'Invalid phone number'));
        }

        if (email) {
            const conflict = await User.findOne({ email, _id: { $ne: userId } });
            if (conflict) return next(createError(400, 'Email already in use by another account'));
        }

        const patch = Object.fromEntries(
            UPDATABLE_FIELDS
                .filter((field) => req.body[field] !== undefined)
                .map((field) => [field, req.body[field]])
        );

        if (Object.keys(patch).length === 0) {
            return next(createError(400, 'No valid fields provided for update'));
        }

        const updatedUser = await User.findByIdAndUpdate(userId, patch, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) return next(createError(404, 'User not found'));

        res.status(200).json({ result: updatedUser, message: 'User updated successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const updateRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const user = await User.findById(userId);
        if (!user) return next(createError(404, 'User not found'));

        const updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true });
        res.status(200).json({ result: updatedUser, message: 'Role updated successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};


export const deleteUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return next(createError(404, 'User not found'));

        await User.findByIdAndDelete(userId);
        res.status(200).json({ result: user, message: 'User deleted successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const deleteWholeCollection = async (req, res, next) => {
    try {
        const result = await User.deleteMany();
        res.status(200).json({ result, message: 'User collection deleted successfully', success: true });
    } catch (err) {
        next(createError(500, err.message));
    }
};