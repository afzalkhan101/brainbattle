import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

const txIcon = {
  credit:   { icon: ArrowUpCircle,   cls: 'text-emerald-500', badge: 'badge-green' },
  debit:    { icon: ArrowDownCircle, cls: 'text-red-500',     badge: 'badge-red'   },
  referral: { icon: Gift,            cls: 'text-primary-500', badge: 'badge-blue'  },
}

export default function Wallet() {
  const [wallet, setWallet]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/auth/wallet/')
      .then(({ data }) => setWallet(data))
      .catch(() => toast.error('Failed to load wallet'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const txs = wallet?.transactions ?? []
  const credits = txs.filter((t) => t.tx_type === 'credit' || t.tx_type === 'referral').reduce((s, t) => s + parseFloat(t.amount), 0)
  const debits  = txs.filter((t) => t.tx_type === 'debit').reduce((s, t) => s + parseFloat(t.amount), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Wallet</h1>
        <p className="page-subtitle">Your balance and transaction history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white border-0 col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <WalletIcon size={18} />
            </div>
            <p className="text-primary-200 text-sm font-medium">Current Balance</p>
          </div>
          <p className="text-4xl font-bold">৳{parseFloat(wallet?.balance ?? 0).toFixed(2)}</p>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpCircle size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">৳{credits.toFixed(2)}</p>
            <p className="text-sm text-slate-500">Total Credits</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
            <ArrowDownCircle size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">৳{debits.toFixed(2)}</p>
            <p className="text-sm text-slate-500">Total Debits</p>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Transactions</h3>
        </div>

        {txs.length === 0 ? (
          <div className="py-16 text-center">
            <WalletIcon size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {txs.map((tx) => {
              const cfg = txIcon[tx.tx_type] ?? txIcon.credit
              const Icon = cfg.icon
              return (
                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.tx_type === 'credit' ? 'bg-emerald-50' :
                    tx.tx_type === 'debit'  ? 'bg-red-50' : 'bg-primary-50'
                  }`}>
                    <Icon size={16} className={cfg.cls} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.description || tx.tx_type.charAt(0).toUpperCase() + tx.tx_type.slice(1)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold text-sm ${tx.tx_type === 'debit' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {tx.tx_type === 'debit' ? '−' : '+'}৳{parseFloat(tx.amount).toFixed(2)}
                    </p>
                    <span className={cfg.badge}>{tx.tx_type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
