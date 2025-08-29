// Create global namespace for the app
window.moneyLodge = (function() {
    // Private variables
    let financialData = {};
    let currentMonth, currentYear;
    let storageAvailable = false;

    // Common categories for autocomplete
    const commonCategories = {
        income: ['Salary', 'Freelance', 'Investment', 'Business', 'Bonus', 'Gift', 'Refund', 'Other Income'],
        expense: ['Rent', 'Groceries', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Insurance', 'Debt Payment', 'Shopping', 'Dining Out', 'Education', 'Other Expense']
    };

    // Check localStorage availability
    function checkStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            storageAvailable = true;
            return true;
        } catch (e) {
            storageAvailable = false;
            console.warn('localStorage not available, using memory storage');
            return false;
        }
    }

    // Load data
    function loadData() {
        if (storageAvailable) {
            try {
                const saved = localStorage.getItem('moneyLodgeData');
                if (saved) {
                    financialData = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Error loading data:', e);
                financialData = {};
            }
        }
    }

    // Save data
    function saveData() {
        if (storageAvailable) {
            try {
                localStorage.setItem('moneyLodgeData', JSON.stringify(financialData));
            } catch (e) {
                console.error('Error saving data:', e);
            }
        }
    }

    // Get current period key
    function getCurrentPeriodKey() {
        return `${currentYear}-${currentMonth}`;
    }

    // Get period data with savings
    function getPeriodData() {
        const key = getCurrentPeriodKey();
        if (!financialData[key]) {
            financialData[key] = {
                transactions: [],
                savings: [],
                savingsGoals: [],
                budgetItems: [],
                budget: {
                    incomeGoal: 0,
                    expenseLimit: 0,
                    savingsTarget: 20,
                    emergencyFund: 0
                }
            };
        }
        return financialData[key];
    }

    // Initialize date selectors
    function initializeDateSelectors() {
        const now = new Date();
        currentMonth = now.getMonth();
        currentYear = now.getFullYear();

        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            for (let year = 2020; year <= 2030; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            }
            yearSelect.value = currentYear;
        }

        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect) {
            monthSelect.value = currentMonth;
        }

        const dateInput = document.getElementById('transactionDate');
        if (dateInput) {
            dateInput.valueAsDate = now;
        }
    }

    // Validate transaction
    function validateTransaction(transaction) {
        if (transaction.amount <= 0) return 'Amount must be greater than 0';
        if (!transaction.source || transaction.source.trim() === '') return 'Source/Category is required';
        if (!transaction.date) return 'Date is required';
        return null;
    }

    // Add transaction
    function addTransaction() {
        const type = document.getElementById('transactionType').value;
        const source = document.getElementById('transactionSource').value;
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const date = document.getElementById('transactionDate').value;
        const description = document.getElementById('transactionDescription').value;
        const recurring = document.getElementById('recurringFrequency').value;

        const transaction = { type, source, amount, date, description };
        const validationError = validateTransaction(transaction);
        
        if (validationError) {
            alert(validationError);
            return;
        }

        transaction.id = Date.now();
        transaction.timestamp = new Date().toISOString();

        if (recurring !== 'none') {
            addRecurringTransaction(transaction, recurring);
            alert(`Recurring ${type} added for the next 12 periods`);
        } else {
            const periodData = getPeriodData();
            periodData.transactions.push(transaction);
            saveData();
        }

        // Clear form
        document.getElementById('transactionSource').value = '';
        document.getElementById('transactionAmount').value = '';
        document.getElementById('transactionDescription').value = '';
        document.getElementById('recurringFrequency').value = 'none';

        updateAllDisplays();
    }

    // Add recurring transaction
    function addRecurringTransaction(transaction, frequency) {
        const baseDate = new Date(transaction.date);
        
        for (let i = 0; i < 12; i++) {
            const newDate = new Date(baseDate);
            if (frequency === 'monthly') {
                newDate.setMonth(baseDate.getMonth() + i);
            } else if (frequency === 'weekly') {
                newDate.setDate(baseDate.getDate() + (i * 7));
            }
            
            const periodKey = `${newDate.getFullYear()}-${newDate.getMonth()}`;
            if (!financialData[periodKey]) {
                financialData[periodKey] = {
                    transactions: [],
                    savings: [],
                    savingsGoals: [],
                    budgetItems: [],
                    budget: { incomeGoal: 0, expenseLimit: 0, savingsTarget: 20, emergencyFund: 0 }
                };
            }
            
            financialData[periodKey].transactions.push({
                ...transaction,
                id: Date.now() + i,
                date: newDate.toISOString().split('T')[0],
                recurring: true
            });
        }
        
        saveData();
        updateAllDisplays();
    }

    // Quick transaction
    function addQuickTransaction(type) {
        const amount = prompt(`Enter ${type} amount:`);
        if (!amount || isNaN(amount)) return;
        
        const source = prompt(`Enter ${type} source/category:`);
        if (!source) return;

        const transaction = {
            id: Date.now(),
            type,
            source,
            amount: parseFloat(amount),
            date: new Date().toISOString().split('T')[0],
            description: 'Quick entry',
            timestamp: new Date().toISOString()
        };

        const periodData = getPeriodData();
        periodData.transactions.push(transaction);
        saveData();
        updateAllDisplays();
    }

    // Delete transaction
    function deleteTransaction(id) {
        const periodData = getPeriodData();
        periodData.transactions = periodData.transactions.filter(t => t.id !== id);
        saveData();
        updateAllDisplays();
    }

    // Filter transactions
    function filterTransactions(searchTerm, typeFilter, dateFrom, dateTo) {
        const periodData = getPeriodData();
        let filtered = periodData.transactions;
        
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        if (typeFilter && typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }
        
        if (dateFrom) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(dateFrom));
        }
        
        if (dateTo) {
            filtered = filtered.filter(t => new Date(t.date) <= new Date(dateTo));
        }
        
        return filtered;
    }

    // Filter and display transactions
    function filterAndDisplayTransactions() {
        const searchTerm = document.getElementById('searchTerm').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        const filtered = filterTransactions(searchTerm, typeFilter, dateFrom, dateTo);
        displayFilteredTransactions(filtered);
    }

    // Display filtered transactions
    function displayFilteredTransactions(transactions) {
        const listContainer = document.getElementById('transactionList');
        
        if (transactions.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-gray); text-align: center;">No transactions found</p>';
            return;
        }

        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        listContainer.innerHTML = sortedTransactions.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div style="font-weight: bold;">${t.source} ${t.recurring ? '🔄' : ''}</div>
                    <div style="color: var(--text-gray); font-size: 12px;">${t.date} ${t.description ? `- ${t.description}` : ''}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                    </div>
                    <button class="delete-btn" onclick="window.moneyLodge.deleteTransaction(${t.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Update transaction list
    function updateTransactionList() {
        filterAndDisplayTransactions();
    }

    // Add savings transaction
    function addSavingsTransaction() {
        const type = document.getElementById('savingsType').value;
        const amount = parseFloat(document.getElementById('savingsAmount').value);
        const description = document.getElementById('savingsDescription').value;
        const date = document.getElementById('savingsDate').value;

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const transaction = {
            id: Date.now(),
            type,
            amount,
            description,
            date: date || new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        };

        const periodData = getPeriodData();
        periodData.savings.push(transaction);
        saveData();

        // Clear form
        document.getElementById('savingsAmount').value = '';
        document.getElementById('savingsDescription').value = '';

        updateAllDisplays();
    }

    // Delete savings transaction
    function deleteSavingsTransaction(id) {
        const periodData = getPeriodData();
        periodData.savings = periodData.savings.filter(s => s.id !== id);
        saveData();
        updateAllDisplays();
    }

    // Add savings goal
    function addSavingsGoal() {
        const name = document.getElementById('goalName').value;
        const target = parseFloat(document.getElementById('goalTarget').value);
        const date = document.getElementById('goalDate').value;

        if (!name || !target) {
            alert('Please fill in goal name and target amount');
            return;
        }

        const goal = {
            id: Date.now(),
            name,
            target,
            date,
            created: new Date().toISOString()
        };

        const periodData = getPeriodData();
        periodData.savingsGoals.push(goal);
        saveData();

        // Clear form
        document.getElementById('goalName').value = '';
        document.getElementById('goalTarget').value = '';
        document.getElementById('goalDate').value = '';

        updateAllDisplays();
    }

    // Delete savings goal
    function deleteSavingsGoal(id) {
        const periodData = getPeriodData();
        periodData.savingsGoals = periodData.savingsGoals.filter(g => g.id !== id);
        saveData();
        updateAllDisplays();
    }

    // Add budget item
    function addBudgetItem() {
        const category = document.getElementById('budgetCategory').value;
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        const priority = document.getElementById('budgetPriority').value;

        if (!category || !amount) {
            alert('Please select category and enter amount');
            return;
        }

        const budgetItem = {
            id: Date.now(),
            category,
            amount,
            priority,
            created: new Date().toISOString()
        };

        const periodData = getPeriodData();
        periodData.budgetItems.push(budgetItem);
        saveData();

        // Clear form
        document.getElementById('budgetCategory').value = '';
        document.getElementById('budgetAmount').value = '';

        updateAllDisplays();
    }

    // Delete budget item
    function deleteBudgetItem(id) {
        const periodData = getPeriodData();
        periodData.budgetItems = periodData.budgetItems.filter(b => b.id !== id);
        saveData();
        updateAllDisplays();
    }

    // Calculate financial health score
    function calculateHealthScore() {
        const periodData = getPeriodData();
        const transactions = periodData.transactions;
        const savings = periodData.savings || [];
        const budgetItems = periodData.budgetItems || [];

        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        const totalDeposits = savings.filter(s => s.type === 'deposit').reduce((sum, s) => sum + s.amount, 0);
        const totalWithdrawals = savings.filter(s => s.type === 'withdrawal').reduce((sum, s) => sum + s.amount, 0);
        const savingsBalance = totalDeposits - totalWithdrawals;

        let score = 0;
        let factors = [];

        // Savings rate (0-30 points)
        if (income > 0) {
            const savingsRate = ((income - expenses) / income) * 100;
            if (savingsRate >= 20) score += 30;
            else if (savingsRate >= 10) score += 20;
            else if (savingsRate >= 5) score += 10;
            else if (savingsRate > 0) score += 5;
        }

        // Emergency fund (0-25 points)
        if (expenses > 0) {
            const monthsCovered = savingsBalance / expenses;
            if (monthsCovered >= 6) score += 25;
            else if (monthsCovered >= 3) score += 20;
            else if (monthsCovered >= 1) score += 10;
            else if (monthsCovered > 0) score += 5;
        }

        // Budget adherence (0-25 points)
        if (budgetItems.length > 0) {
            const totalBudget = budgetItems.reduce((sum, b) => sum + b.amount, 0);
            if (expenses <= totalBudget) {
                const adherence = (totalBudget - expenses) / totalBudget;
                score += Math.min(25, adherence * 100);
            }
        }

        // Income stability (0-20 points)
        if (income > 0) {
            score += 20; // Full points if there's income
        }

        return {
            score: Math.round(score),
            maxScore: 100,
            assessment: getHealthAssessment(score)
        };
    }

    // Get health assessment message
    function getHealthAssessment(score) {
        if (score >= 90) return "Excellent financial health! You're on track for financial freedom.";
        if (score >= 75) return "Very good financial health. Keep up the great work!";
        if (score >= 60) return "Good financial health with room for improvement.";
        if (score >= 40) return "Fair financial health. Consider increasing savings and budgeting.";
        if (score >= 20) return "Poor financial health. Focus on budgeting and reducing expenses.";
        return "Critical financial situation. Immediate action needed.";
    }

    // Update savings display
    function updateSavingsDisplay() {
        const periodData = getPeriodData();
        const savings = periodData.savings || [];
        const goals = periodData.savingsGoals || [];

        // Calculate totals
        const deposits = savings.filter(s => s.type === 'deposit').reduce((sum, s) => sum + s.amount, 0);
        const withdrawals = savings.filter(s => s.type === 'withdrawal').reduce((sum, s) => sum + s.amount, 0);
        const balance = deposits - withdrawals;

        // Get current month's savings
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthSavings = savings.filter(s => {
            const date = new Date(s.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, s) => s.type === 'deposit' ? sum + s.amount : sum - s.amount, 0);

        // Update displays
        document.getElementById('savingsBalance').textContent = `$${balance.toFixed(2)}`;
        document.getElementById('totalDeposits').textContent = `$${deposits.toFixed(2)}`;
        document.getElementById('totalWithdrawals').textContent = `$${withdrawals.toFixed(2)}`;
        document.getElementById('monthSavings').textContent = `$${monthSavings.toFixed(2)}`;

        // Update savings list
        const savingsList = document.getElementById('savingsList');
        if (savings.length === 0) {
            savingsList.innerHTML = '<p style="color: var(--text-gray); text-align: center;">No savings transactions yet</p>';
        } else {
            const sortedSavings = [...savings].sort((a, b) => new Date(b.date) - new Date(a.date));
            savingsList.innerHTML = sortedSavings.map(s => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div style="font-weight: bold;">${s.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</div>
                        <div style="color: var(--text-gray); font-size: 12px;">${s.date} ${s.description ? `- ${s.description}` : ''}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="transaction-amount ${s.type === 'deposit' ? 'income' : 'expense'}">
                            ${s.type === 'deposit' ? '+' : '-'}$${s.amount.toFixed(2)}
                        </div>
                        <button class="delete-btn" onclick="window.moneyLodge.deleteSavingsTransaction(${s.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        // Update goals display
        const goalsContainer = document.getElementById('savingsGoals');
        if (goals.length === 0) {
            goalsContainer.innerHTML = '<p style="color: var(--text-gray); text-align: center;">No savings goals set</p>';
        } else {
            goalsContainer.innerHTML = goals.map(g => {
                const progress = Math.min(100, (balance / g.target) * 100);
                return `
                    <div style="background: var(--tertiary-black); padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <div style="font-weight: bold; color: var(--primary-gold);">${g.name}</div>
                                <div style="color: var(--text-gray); font-size: 12px;">Target: $${g.target.toFixed(2)} ${g.date ? `by ${g.date}` : ''}</div>
                            </div>
                            <button class="delete-btn" onclick="window.moneyLodge.deleteSavingsGoal(${g.id})">Delete</button>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%">${progress.toFixed(0)}%</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Map transaction source to budget category
    function mapTobudgetCategory(source) {
        const mappings = {
            'rent': 'Housing',
            'mortgage': 'Housing',
            'utilities': 'Utilities',
            'electricity': 'Utilities',
            'water': 'Utilities',
            'gas': 'Utilities',
            'groceries': 'Food',
            'dining': 'Food',
            'restaurant': 'Food',
            'transportation': 'Transportation',
            'fuel': 'Transportation',
            'car': 'Transportation',
            'insurance': 'Insurance',
            'healthcare': 'Healthcare',
            'medical': 'Healthcare',
            'entertainment': 'Entertainment',
            'shopping': 'Shopping',
            'education': 'Education',
            'debt': 'Debt',
            'loan': 'Debt',
            'personal': 'Personal'
        };

        const sourceLower = source.toLowerCase();
        for (const [key, category] of Object.entries(mappings)) {
            if (sourceLower.includes(key)) {
                return category;
            }
        }
        return 'Other';
    }

    // Update budget analysis
    function updateBudgetAnalysis() {
        const periodData = getPeriodData();
        const budgetItems = periodData.budgetItems || [];
        const transactions = periodData.transactions;

        // Calculate actual expenses by category
        const expensesByCategory = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const category = mapTobudgetCategory(t.source);
            expensesByCategory[category] = (expensesByCategory[category] || 0) + t.amount;
        });

        // Calculate totals
        const totalBudget = budgetItems.reduce((sum, b) => sum + b.amount, 0);
        const totalActual = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
        const remaining = totalBudget - totalActual;
        const utilizationRate = totalBudget > 0 ? (totalActual / totalBudget * 100) : 0;

        // Update summary cards
        document.getElementById('totalBudget').textContent = `$${totalBudget.toFixed(2)}`;
        document.getElementById('budgetUsed').textContent = `$${totalActual.toFixed(2)}`;
        document.getElementById('budgetRemaining').textContent = `$${remaining.toFixed(2)}`;
        document.getElementById('utilizationRate').textContent = `${utilizationRate.toFixed(1)}%`;

        // Create budget vs actual analysis
        const analysisContainer = document.getElementById('budgetAnalysis');
        if (budgetItems.length === 0) {
            analysisContainer.innerHTML = '<p style="color: var(--text-gray); text-align: center;">No budget items set</p>';
        } else {
            analysisContainer.innerHTML = budgetItems.map(item => {
                const actual = expensesByCategory[item.category] || 0;
                const variance = item.amount - actual;
                const usage = item.amount > 0 ? (actual / item.amount * 100) : 0;
                const isOver = actual > item.amount;
                
                return `
                    <div style="background: var(--tertiary-black); padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 3px solid ${isOver ? 'var(--danger)' : 'var(--success)'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div>
                                <div style="font-weight: bold; font-size: 16px;">${item.category}</div>
                                <div style="color: var(--text-gray); font-size: 12px; margin-top: 5px;">
                                    Priority: <span style="color: ${item.priority === 'essential' ? 'var(--danger)' : item.priority === 'important' ? 'var(--primary-gold)' : 'var(--text-gray)'};">${item.priority.toUpperCase()}</span>
                                </div>
                            </div>
                            <button class="delete-btn" onclick="window.moneyLodge.deleteBudgetItem(${item.id})">Delete</button>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; margin-bottom: 15px;">
                            <div>
                                <div style="color: var(--text-gray); font-size: 11px;">BUDGET</div>
                                <div style="color: var(--primary-gold); font-weight: bold;">$${item.amount.toFixed(2)}</div>
                            </div>
                            <div>
                                <div style="color: var(--text-gray); font-size: 11px;">ACTUAL</div>
                                <div style="color: ${isOver ? 'var(--danger)' : 'var(--text-light)'}; font-weight: bold;">$${actual.toFixed(2)}</div>
                            </div>
                            <div>
                                <div style="color: var(--text-gray); font-size: 11px;">VARIANCE</div>
                                <div style="color: ${variance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">${variance >= 0 ? '+' : ''}$${variance.toFixed(2)}</div>
                            </div>
                            <div>
                                <div style="color: var(--text-gray); font-size: 11px;">USAGE</div>
                                <div style="color: ${usage > 100 ? 'var(--danger)' : usage > 80 ? 'var(--primary-gold)' : 'var(--success)'}; font-weight: bold;">${usage.toFixed(0)}%</div>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, usage)}%; background: ${isOver ? 'var(--danger)' : 'linear-gradient(90deg, var(--primary-gold), var(--secondary-gold))'}">${usage.toFixed(0)}%</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Update dashboard with enhanced metrics
    function updateDashboard() {
        const periodData = getPeriodData();
        const transactions = periodData.transactions;
        const savings = periodData.savings || [];
        const budgetItems = periodData.budgetItems || [];

        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate net balance including savings
        const totalDeposits = savings.filter(s => s.type === 'deposit').reduce((sum, s) => sum + s.amount, 0);
        const totalWithdrawals = savings.filter(s => s.type === 'withdrawal').reduce((sum, s) => sum + s.amount, 0);
        const savingsBalance = totalDeposits - totalWithdrawals;
        
        const netFlow = income - expenses - totalDeposits + totalWithdrawals;
        const balance = income - expenses;
        const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

        document.getElementById('totalIncome').textContent = `$${income.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `$${expenses.toFixed(2)}`;
        document.getElementById('netBalance').textContent = `$${netFlow.toFixed(2)}`;
        document.getElementById('savingsRate').textContent = `${savingsRate}%`;

        // Financial health score
        const health = calculateHealthScore();
        document.getElementById('healthScore').textContent = health.score;
        document.getElementById('healthProgress').style.width = `${health.score}%`;
        document.getElementById('healthAssessment').textContent = health.assessment;

        // Additional metrics
        const liquidityRatio = expenses > 0 ? ((savingsBalance / expenses) * 100).toFixed(0) : 0;
        document.getElementById('liquidityRatio').textContent = `${liquidityRatio}%`;

        const totalBudget = budgetItems.reduce((sum, b) => sum + b.amount, 0);
        const budgetAdherence = totalBudget > 0 && expenses <= totalBudget ? 
            ((1 - (expenses - totalBudget) / totalBudget) * 100).toFixed(0) : 0;
        document.getElementById('budgetAdherence').textContent = `${Math.max(0, budgetAdherence)}%`;

        // Income stability (simplified - could be enhanced with variance calculation)
        const incomeStability = income > 0 ? 100 : 0;
        document.getElementById('incomeStability').textContent = `${incomeStability}%`;

        // Financial metrics
        const expenseRatio = income > 0 ? ((expenses / income) * 100).toFixed(1) : 0;
        document.getElementById('expenseRatio').textContent = `${expenseRatio}%`;

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentDay = new Date().getDate();
        const dailyAverage = currentDay > 0 ? expenses / currentDay : 0;
        document.getElementById('dailyAverage').textContent = `$${dailyAverage.toFixed(2)}`;

        const projectedMonthEnd = income - (dailyAverage * daysInMonth);
        document.getElementById('projectedEnd').textContent = `$${projectedMonthEnd.toFixed(2)}`;
    }

    // Save budget settings
    function saveBudgetSettings() {
        const periodData = getPeriodData();
        periodData.budget.incomeGoal = parseFloat(document.getElementById('incomeGoal').value) || 0;
        periodData.budget.expenseLimit = parseFloat(document.getElementById('expenseLimit').value) || 0;
        periodData.budget.savingsTarget = parseFloat(document.getElementById('savingsTarget').value) || 20;
        periodData.budget.emergencyFund = parseFloat(document.getElementById('emergencyFund').value) || 0;
        saveData();
        updateBudgetProgress();
    }

    // Update budget progress
    function updateBudgetProgress() {
        const periodData = getPeriodData();
        const transactions = periodData.transactions;
        const budget = periodData.budget;

        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
       const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
       const savings = income - expenses;

       // Update budget inputs
       document.getElementById('incomeGoal').value = budget.incomeGoal || '';
       document.getElementById('expenseLimit').value = budget.expenseLimit || '';
       document.getElementById('savingsTarget').value = budget.savingsTarget || '';
       document.getElementById('emergencyFund').value = budget.emergencyFund || '';

       // Update progress bars
       const incomeProgress = budget.incomeGoal > 0 ? Math.min((income / budget.incomeGoal) * 100, 100) : 0;
       document.getElementById('incomeProgress').style.width = `${incomeProgress}%`;
       document.getElementById('incomeProgress').textContent = `${incomeProgress.toFixed(0)}%`;

       const expenseProgress = budget.expenseLimit > 0 ? Math.min((expenses / budget.expenseLimit) * 100, 100) : 0;
       document.getElementById('expenseProgress').style.width = `${expenseProgress}%`;
       document.getElementById('expenseProgress').textContent = `${expenseProgress.toFixed(0)}%`;

       const targetSavings = income * (budget.savingsTarget / 100);
       const savingsProgress = targetSavings > 0 ? Math.min((savings / targetSavings) * 100, 100) : 0;
       document.getElementById('savingsProgress').style.width = `${savingsProgress}%`;
       document.getElementById('savingsProgress').textContent = `${savingsProgress.toFixed(0)}%`;
   }

   // Calculate savings
   function calculateSavings() {
       const income = parseFloat(document.getElementById('calcIncome').value) || 0;
       const essential = parseFloat(document.getElementById('calcEssential').value) || 0;
       const discretionary = parseFloat(document.getElementById('calcDiscretionary').value) || 0;

       // 50/30/20 rule
       const recommendedSavings = income * 0.20;
       document.getElementById('recommendedSavings').textContent = `$${recommendedSavings.toFixed(2)}`;

       // Maximum possible savings
       const maxSavings = Math.max(income - essential, 0);
       document.getElementById('maxSavings').textContent = `$${maxSavings.toFixed(2)}`;

       // Current potential savings
       const currentSavings = Math.max(income - essential - discretionary, 0);
       document.getElementById('currentSavings').textContent = `$${currentSavings.toFixed(2)}`;
   }

   // Calculate quick stats
   function calculateQuickStats() {
       const allPeriods = Object.keys(financialData);
       let totalIncome = 0;
       let totalExpenses = 0;
       let monthsWithData = 0;

       allPeriods.forEach(period => {
           const transactions = financialData[period].transactions || [];
           if (transactions.length > 0) {
               monthsWithData++;
               totalIncome += transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
               totalExpenses += transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
           }
       });

       return {
           averageMonthlyIncome: monthsWithData > 0 ? totalIncome / monthsWithData : 0,
           averageMonthlyExpenses: monthsWithData > 0 ? totalExpenses / monthsWithData : 0,
           totalSaved: totalIncome - totalExpenses,
           monthsTracked: monthsWithData
       };
   }

   // Update analytics
   function updateAnalytics() {
       const periodData = getPeriodData();
       const transactions = periodData.transactions;
       const budget = periodData.budget;

       const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
       const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

       // Update all-time statistics
       const allTimeStats = calculateQuickStats();
       const allTimeContainer = document.getElementById('allTimeStats');
       allTimeContainer.innerHTML = `
           <div class="stat-card">
               <div class="stat-label">Average Monthly Income</div>
               <div class="stat-value">$${allTimeStats.averageMonthlyIncome.toFixed(2)}</div>
           </div>
           <div class="stat-card">
               <div class="stat-label">Average Monthly Expenses</div>
               <div class="stat-value">$${allTimeStats.averageMonthlyExpenses.toFixed(2)}</div>
           </div>
           <div class="stat-card">
               <div class="stat-label">Total Saved All-Time</div>
               <div class="stat-value">$${allTimeStats.totalSaved.toFixed(2)}</div>
           </div>
           <div class="stat-card">
               <div class="stat-label">Months Tracked</div>
               <div class="stat-value">${allTimeStats.monthsTracked}</div>
           </div>
       `;

       // Update metrics
       document.getElementById('cashFlow').textContent = `$${(income - expenses).toFixed(2)}`;
       document.getElementById('burnRate').textContent = `$${expenses.toFixed(2)}`;
       
       const annualExpenses = expenses * 12;
       const freedomNumber = annualExpenses * 25;
       document.getElementById('freedomNumber').textContent = `$${freedomNumber.toLocaleString()}`;

       const emergencyMonths = budget.emergencyFund > 0 && expenses > 0 ? (budget.emergencyFund / expenses).toFixed(1) : 0;
       document.getElementById('emergencyMonths').textContent = emergencyMonths;

       // Expense breakdown
       const expenseCategories = {};
       transactions.filter(t => t.type === 'expense').forEach(t => {
           expenseCategories[t.source] = (expenseCategories[t.source] || 0) + t.amount;
       });

       const expenseBreakdown = document.getElementById('expenseBreakdown');
       if (Object.keys(expenseCategories).length > 0) {
           const sortedCategories = Object.entries(expenseCategories)
               .sort(([, a], [, b]) => b - a)
               .slice(0, 5);

           expenseBreakdown.innerHTML = sortedCategories.map(([category, amount]) => {
               const percentage = expenses > 0 ? ((amount / expenses) * 100).toFixed(1) : 0;
               return `
                   <div class="transaction-item">
                       <div class="transaction-info">
                           <div style="font-weight: bold;">${category}</div>
                           <div style="color: var(--text-gray); font-size: 12px;">${percentage}% of total expenses</div>
                       </div>
                       <div class="transaction-amount expense">$${amount.toFixed(2)}</div>
                   </div>
               `;
           }).join('');
       } else {
           expenseBreakdown.innerHTML = '<p style="color: var(--text-gray); text-align: center;">No expenses recorded</p>';
       }

       // Income breakdown
       const incomeCategories = {};
       transactions.filter(t => t.type === 'income').forEach(t => {
           incomeCategories[t.source] = (incomeCategories[t.source] || 0) + t.amount;
       });

       const incomeBreakdown = document.getElementById('incomeBreakdown');
       if (Object.keys(incomeCategories).length > 0) {
           const sortedIncome = Object.entries(incomeCategories)
               .sort(([, a], [, b]) => b - a);

           incomeBreakdown.innerHTML = sortedIncome.map(([source, amount]) => {
               const percentage = income > 0 ? ((amount / income) * 100).toFixed(1) : 0;
               return `
                   <div class="transaction-item">
                       <div class="transaction-info">
                           <div style="font-weight: bold;">${source}</div>
                           <div style="color: var(--text-gray); font-size: 12px;">${percentage}% of total income</div>
                       </div>
                       <div class="transaction-amount income">$${amount.toFixed(2)}</div>
                   </div>
               `;
           }).join('');
       } else {
           incomeBreakdown.innerHTML = '<p style="color: var(--text-gray); text-align: center;">No income recorded</p>';
       }

       document.getElementById('debtRatio').textContent = '0%';
       document.getElementById('roi').textContent = 'N/A';
   }

   // Update all displays
   function updateAllDisplays() {
       try {
           updateDashboard();
           updateTransactionList();
           updateSavingsDisplay();
           updateBudgetAnalysis();
           updateBudgetProgress();
           updateAnalytics();
       } catch (e) {
           console.error('Error updating displays:', e);
       }
   }

   // Export data
   function exportData() {
       const dataStr = JSON.stringify(financialData, null, 2);
       const dataBlob = new Blob([dataStr], { type: 'application/json' });
       const url = URL.createObjectURL(dataBlob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `money-lodge-backup-${new Date().toISOString().split('T')[0]}.json`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
   }

   // Import data
   function importData(event) {
       const file = event.target.files[0];
       if (!file) return;

       const reader = new FileReader();
       reader.onload = function(e) {
           try {
               const imported = JSON.parse(e.target.result);
               if (confirm('This will replace all existing data. Continue?')) {
                   financialData = imported;
                   saveData();
                   updateAllDisplays();
                   alert('Data imported successfully!');
               }
           } catch (error) {
               alert('Error importing data. Please check the file format.');
           }
       };
       reader.readAsText(file);
   }

   // Generate report
   function generateReport() {
       const periodData = getPeriodData();
       const transactions = periodData.transactions;
       
       const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
       const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
       const balance = income - expenses;
       
       const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
       
       const report = `MONEY LODGE FINANCIAL REPORT
${new Date().toLocaleDateString()}
Period: ${monthNames[currentMonth]} ${currentYear}

SUMMARY:
Total Income: $${income.toFixed(2)}
Total Expenses: $${expenses.toFixed(2)}
Net Balance: $${balance.toFixed(2)}
Savings Rate: ${income > 0 ? ((balance / income) * 100).toFixed(1) : 0}%

TRANSACTIONS:
${transactions.map(t => `${t.date} | ${t.type.toUpperCase()} | ${t.source} | $${t.amount.toFixed(2)} ${t.description ? `| ${t.description}` : ''}`).join('\n')}`;
       
       const blob = new Blob([report], { type: 'text/plain' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `money-lodge-report-${currentYear}-${currentMonth + 1}.txt`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
   }

   // Clear period data
   function clearPeriodData() {
       const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
       if (confirm(`Clear all data for ${monthNames[currentMonth]} ${currentYear}?`)) {
           delete financialData[getCurrentPeriodKey()];
           saveData();
           updateAllDisplays();
       }
   }

   // Initialize the app
   function init() {
       checkStorageAvailability();
       loadData();
       initializeDateSelectors();

       // Setup event listeners
       document.getElementById('monthSelect').addEventListener('change', (e) => {
           currentMonth = parseInt(e.target.value);
           updateAllDisplays();
       });

       document.getElementById('yearSelect').addEventListener('change', (e) => {
           currentYear = parseInt(e.target.value);
           updateAllDisplays();
       });

       // Tab navigation
       document.querySelectorAll('.nav-tab').forEach(tab => {
           tab.addEventListener('click', () => {
               document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
               document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
               tab.classList.add('active');
               document.getElementById(tab.dataset.tab).classList.add('active');
           });
       });

       // Setup category autocomplete
       const transactionType = document.getElementById('transactionType');
       transactionType.addEventListener('change', (e) => {
           const sourceInput = document.getElementById('transactionSource');
           const existingDatalist = document.getElementById('categoryList');
           if (existingDatalist) existingDatalist.remove();

           const datalist = document.createElement('datalist');
           datalist.id = 'categoryList';
           
           commonCategories[e.target.value].forEach(cat => {
               const option = document.createElement('option');
               option.value = cat;
               datalist.appendChild(option);
           });
           
           document.body.appendChild(datalist);
           sourceInput.setAttribute('list', 'categoryList');
       });
       
       transactionType.dispatchEvent(new Event('change'));

       // Setup savings date input
       const savingsDateInput = document.getElementById('savingsDate');
       if (savingsDateInput) {
           savingsDateInput.valueAsDate = new Date();
       }

       // Initial display update
       updateAllDisplays();

       // Show storage warning if needed
       if (!storageAvailable) {
           const warning = document.createElement('div');
           warning.style.cssText = `
               position: fixed;
               top: 20px;
               left: 50%;
               transform: translateX(-50%);
               background: var(--danger);
               color: white;
               padding: 10px 20px;
               border-radius: 8px;
               z-index: 9999;
               text-align: center;
           `;
           warning.innerHTML = `⚠️ Storage is disabled. Data will not persist when you close this page.`;
           document.body.appendChild(warning);
           setTimeout(() => warning.remove(), 5000);
       }

       // Show welcome message for new users
       if (Object.keys(financialData).length === 0 && storageAvailable) {
           setTimeout(() => {
               const welcome = document.createElement('div');
               welcome.style.cssText = `
                   position: fixed;
                   top: 50%;
                   left: 50%;
                   transform: translate(-50%, -50%);
                   background: var(--secondary-black);
                   border: 2px solid var(--primary-gold);
                   padding: 30px;
                   border-radius: 12px;
                   max-width: 500px;
                   text-align: center;
                   z-index: 10000;
               `;
               welcome.innerHTML = `
                   <h2 style="color: var(--primary-gold); margin-bottom: 15px;">Welcome to Money Lodge</h2>
                   <p style="color: var(--text-gray); margin-bottom: 20px;">Your comprehensive financial management system by Empire Domination</p>
                   <button onclick="this.parentElement.remove()" style="width: 100%;">Get Started</button>
               `;
               document.body.appendChild(welcome);
           }, 500);
       }
   }

   // Auto-save on window close
   window.addEventListener('beforeunload', saveData);

   // Return public API
   return {
       init,
       addTransaction,
       deleteTransaction,
       addQuickTransaction,
       filterAndDisplayTransactions,
       saveBudgetSettings,
       calculateSavings,
       exportData,
       importData,
       generateReport,
       clearPeriodData,
       addSavingsTransaction,
       deleteSavingsTransaction,
       addSavingsGoal,
       deleteSavingsGoal,
       addBudgetItem,
       deleteBudgetItem
   };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
   window.moneyLodge.init();
});