
export const dashboardMockData = {
  summary: {
    availableCapital: { amount: 410000, monthlyChange: 50000 },
    totalContributions: { amount: 360000, monthsCount: 12 },
    totalInvestments: { amount: 200000, businessCount: 3 },
    cumulativeProfit: { amount: 65000, monthlyChange: 15000 },
  },

  capitalHistory: [
    { month: 'Juin', capital: 180000 },
    { month: 'Juil', capital: 210000 },
    { month: 'Août', capital: 240000 },
    { month: 'Sept', capital: 300000 },
    { month: 'Oct', capital: 350000 },
    { month: 'Nov', capital: 410000 },
  ],
  capitalPeriodLabel: '6 derniers mois',

  revenueDistribution: [
    { id: 'contributions', label: 'Cotisations', amount: 360000, color: 'green' },
    { id: 'profits', label: 'Bénéfices', amount: 50000, color: 'red' },
  ],

  recentBusinesses: [
    {
      id: 'business-1',
      name: 'Vente de boissons',
      category: 'drinks',
      date: '2026-11-08',
      investedAmount: 60000,
      profit: 40000,
      status: 'completed',
    },
    {
      id: 'business-2',
      name: 'Vente de T-shirts',
      category: 'tshirts',
      date: '2026-10-02',
      investedAmount: 45000,
      profit: 25000,
      status: 'completed',
    },
    {
      id: 'business-3',
      name: 'Vente de snacks',
      category: 'snacks',
      date: '2026-09-10',
      investedAmount: 35000,
      profit: 20000,
      status: 'completed',
    },
  ],

  currentMonthLabel: 'Novembre 2026',
  recentContributions: [
    {
      id: 'contribution-1',
      associateName: 'Mohamed Bakhoum',
      initials: 'MB',
      avatarTone: 'green',
      monthLabel: 'Novembre 2026',
      amount: 15000,
      paidOn: '2026-11-05',
      status: 'paid',
    },
    {
      id: 'contribution-2',
      associateName: 'Cheikh Sow',
      initials: 'CS',
      avatarTone: 'red',
      monthLabel: 'Novembre 2026',
      amount: 15000,
      paidOn: '2026-11-05',
      status: 'paid',
    },
  ],

  financialSummary: [
    { id: 'contributions', label: 'Cotisations', amount: 360000 },
    { id: 'investments', label: 'Investissements', amount: 200000 },
    { id: 'revenues', label: 'Recettes', amount: 265000 },
    { id: 'expenses', label: 'Dépenses', amount: 135000 },
  ],
}
