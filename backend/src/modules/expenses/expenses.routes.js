import express from 'express';
import { verifyAccessToken } from '../../middlewares/authMiddleware.js';
import * as ExpensesController from './expenses.controller.js';

const router = express.Router();

router.use(verifyAccessToken);

// Sync Logic
router.post('/sync', async (req, res) => {
    try {
        const result = await ExpensesController.syncTransactions(req.user.id);
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(500).json({ error: "Sync failed" });
    }
});

router.get('/', ExpensesController.getExpenses);
router.post('/', ExpensesController.createExpense);
router.get('/categories', ExpensesController.getCategories);
router.get('/stats', ExpensesController.getStats);
router.get('/:id', ExpensesController.getExpenseDetail); // [NEW] Detail
router.delete('/:id', ExpensesController.deleteExpense);
router.patch('/:id/category', ExpensesController.updateCategory);
router.patch('/:id/restore', ExpensesController.restoreExpense); // [NEW] Restore
router.post('/migrate', ExpensesController.runMigration);

export default router;
