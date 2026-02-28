import { createExpenseProcedure } from "./procedures/create-expense";
import { deleteExpenseProcedure } from "./procedures/delete-expense";
import { getExpense } from "./procedures/get-expense";
import { listExpenses } from "./procedures/list-expenses";
import { updateExpenseProcedure } from "./procedures/update-expense";

export const expensesRouter = {
	list: listExpenses,
	find: getExpense,
	create: createExpenseProcedure,
	update: updateExpenseProcedure,
	delete: deleteExpenseProcedure,
};
