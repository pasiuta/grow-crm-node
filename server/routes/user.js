import express from 'express';
import {
    getUsers,
    getUser,
    filterUser,
    getClients,
    getEmployeeClients,
    getEmployees,
    createClient,
    createEmployee,
    updateUser,
    updateRole,
    deleteUser,
    deleteWholeCollection,
} from '../controllers/user.js';
import {
    verifyToken,
    verifyEmployee,
    verifyManager,
    verifySuperAdmin,
    verifyIsSameUser,  // TASK 1
} from '../middleware/auth.js';

const router = express.Router();


router.get('/get/all',              verifyToken, verifyManager,  getUsers);
router.get('/get/clients',          verifyToken, verifyEmployee, getClients);
router.get('/get/clients/employee', verifyToken, verifyEmployee, getEmployeeClients);
router.get('/get/employees',        verifyToken, verifyEmployee, getEmployees);
router.get('/filter',               verifyToken, verifyEmployee, filterUser);

router.get('/get/single/:userId',   verifyToken, verifyIsSameUser, getUser);


router.post('/create/client',   verifyToken, verifyEmployee, createClient);
router.post('/create/employee', verifyToken, verifyManager,  createEmployee);


router.put('/update/:userId',        verifyToken, verifyIsSameUser, updateUser);
router.put('/update-role/:userId',   verifyToken, verifyManager,    updateRole);


router.delete('/delete/:userId',          verifyToken, verifySuperAdmin, deleteUser);
router.delete('/delete-whole-collection',                                deleteWholeCollection);

export default router;