import { DollarSign, TrendingUp, Download, Calendar } from 'lucide-react';

const Donations = () => {
  const recentDonations = [
    { id: 1, donor: 'John Doe', amount: 500, date: 'Dec 28, 2024', purpose: 'General Fund', method: 'Credit Card' },
    { id: 2, donor: 'Jane Smith', amount: 250, date: 'Dec 27, 2024', purpose: 'Building Fund', method: 'Bank Transfer' },
    { id: 3, donor: 'Mike Johnson', amount: 100, date: 'Dec 26, 2024', purpose: 'Missions', method: 'Cash' },
    { id: 4, donor: 'Sarah Williams', amount: 300, date: 'Dec 25, 2024', purpose: 'General Fund', method: 'Credit Card' },
    { id: 5, donor: 'David Brown', amount: 150, date: 'Dec 24, 2024', purpose: 'Youth Ministry', method: 'Bank Transfer' },
  ];

  const stats = [
    { label: 'This Month', value: '$12,450', change: '+8%', color: 'from-green-500 to-green-600' },
    { label: 'This Year', value: '$145,280', change: '+15%', color: 'from-blue-500 to-blue-600' },
    { label: 'Avg. Donation', value: '$285', change: '+3%', color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold gradient-text">Donations & Giving</h1>
        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform duration-200">
          <Download className="h-5 w-5" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <p className="text-foreground/60 text-sm mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Recent Donations</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left py-3 px-4 text-foreground/60 font-semibold">Donor</th>
                <th className="text-left py-3 px-4 text-foreground/60 font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-foreground/60 font-semibold">Purpose</th>
                <th className="text-left py-3 px-4 text-foreground/60 font-semibold">Method</th>
                <th className="text-left py-3 px-4 text-foreground/60 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentDonations.map((donation) => (
                <tr key={donation.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                  <td className="py-4 px-4 text-foreground">{donation.donor}</td>
                  <td className="py-4 px-4 text-foreground font-semibold">${donation.amount}</td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      {donation.purpose}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-foreground/70">{donation.method}</td>
                  <td className="py-4 px-4 text-foreground/70 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {donation.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Donations;
