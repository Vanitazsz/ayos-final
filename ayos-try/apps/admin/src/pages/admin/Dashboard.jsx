import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Calendar, Users, HardHat, 
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, Trash2,
  RefreshCcw, Headset, UserPlus, Bell
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { loadDashboard, loadNotifications, loadUsers, loadWorkers, reviewWorker, subscribe } from '../../services/adminData';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, subtitle, isLoading }) => (
  <Card className="animate-fade-in-up">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex flex-col mt-2">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-3xl font-display font-bold text-navy">{value}</div>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <span className={`flex items-center font-medium mr-2 ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {trendValue}
              </span>
              {subtitle}
            </p>
          </>
        )}
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [isLoading,setIsLoading]=useState(true);
  const [activities,setActivities]=useState([]);
  const [metrics,setMetrics]=useState({});
  const [revenueData,setRevenueData]=useState([]);
  const [bookingsData,setBookingsData]=useState([]);
  const [pendingWorkers,setPendingWorkers]=useState([]);const[recentUsers,setRecentUsers]=useState([]);const[systemNotifications,setSystemNotifications]=useState([]);

  useEffect(() => {
    const refresh=async()=>{try{const[value,workers,users,notifications]=await Promise.all([loadDashboard(),loadWorkers(),loadUsers(),loadNotifications()]);setPendingWorkers(workers.filter(worker=>!worker.verified).slice(0,4));setRecentUsers(users.slice(0,3));setSystemNotifications(notifications.slice(0,3));setMetrics(value.metrics);setActivities(value.activities);const months=new Map();value.payments.forEach((payment)=>{const key=new Date(payment.successful_at).toLocaleString('en',{month:'short'});const row=months.get(key)??{name:key,revenue:0,profit:0};row.revenue+=Number(payment.service_amount);row.profit+=Number(payment.commission_amount);months.set(key,row)});setRevenueData([...months.values()]);const days=new Map();value.bookings.forEach((booking)=>{const key=new Date(booking.created_at).toLocaleString('en',{weekday:'short'});const row=days.get(key)??{name:key,completed:0,cancelled:0,pending:0};if(booking.status==='COMPLETED')row.completed++;else if(booking.status==='CANCELLED')row.cancelled++;else row.pending++;days.set(key,row)});setBookingsData([...days.values()]);}finally{setIsLoading(false)}};void refresh();const stops=['audit_logs','payments','bookings','worker_verifications'].map((table)=>subscribe(table,refresh));return()=>stops.forEach((stop)=>stop());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Here's what's happening in your ecosystem today.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={()=>{window.location.href='/admin/reports'}} className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-navy shadow-sm hover:bg-gray-50 transition-colors">
            Reports
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard 
          title="Total Revenue" 
          value={`₱${Number(metrics.successful_payment_total??0).toLocaleString()}`} 
          icon={DollarSign}
          trend="up"
          trendValue="Live"
          subtitle="successful payments"
          isLoading={isLoading}
        />
        <StatCard 
          title="Active Bookings" 
          value={metrics.active_bookings??0} 
          icon={Calendar}
          trend="up"
          trendValue="Live"
          subtitle="current"
          isLoading={isLoading}
        />
        <StatCard 
          title="Total Users" 
          value={metrics.accounts??0} 
          icon={Users}
          trend="up"
          trendValue="Live"
          subtitle="current"
          isLoading={isLoading}
        />
        <StatCard 
          title="Verified Workers" 
          value={metrics.active_workers??0} 
          icon={HardHat}
          trend="up"
          trendValue="Live"
          subtitle="approved"
          isLoading={isLoading}
        />
        <StatCard 
          title="Queued AI Jobs" 
          value={metrics.queued_ai_jobs??0} 
          icon={RefreshCcw}
          trend="up"
          trendValue="Live"
          subtitle="queued/processing"
          isLoading={isLoading}
        />
        <StatCard 
          title="Support Tickets" 
          value={metrics.open_support??0} 
          icon={Headset}
          trend="up"
          trendValue="Live"
          subtitle="open"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue and profit margins.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] pb-4">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-lg min-h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B63D6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0B63D6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `₱${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0B63D6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Weekly Bookings</CardTitle>
            <CardDescription>Booking statuses over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] pb-4">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-lg min-h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="completed" stackId="a" fill="#22C55E" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="pending" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="cancelled" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex items-start animate-fade-in-up transition-all duration-500">
                  <div className="relative">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary ring-4 ring-primary/10 transition-all duration-300"></div>
                    {index !== activities.length - 1 && (
                      <div className="absolute top-4 left-1 w-px h-full bg-border -ml-px transition-all duration-300"></div>
                    )}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium text-navy">{activity.user}</p>
                    <p className="text-sm text-gray-500">{activity.action}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Worker Approvals</CardTitle>
              <CardDescription>Workers waiting for profile verification.</CardDescription>
            </div>
            <button onClick={()=>{window.location.href='/admin/workers'}} className="text-sm text-primary hover:underline font-medium">View All</button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase border-y border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Worker</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Date Applied</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-xs font-bold text-gray-500">
                            {worker.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-navy">{worker.name}</div>
                            <div className="text-gray-500 text-xs">{worker.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{worker.category}</td>
                      <td className="px-4 py-3 text-gray-500">{worker.registeredDate}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end space-x-2">
                          <button onClick={async()=>{try{await reviewWorker(worker.verificationId,'APPROVED',null);window.location.reload()}catch(error){alert(error.message)}}} className="text-success hover:bg-success/10 p-1.5 rounded-md transition-colors" title="Approve">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button onClick={async()=>{try{await reviewWorker(worker.verificationId,'REJECTED','Rejected by administrator');window.location.reload()}catch(error){alert(error.message)}}} className="text-danger hover:bg-danger/10 p-1.5 rounded-md transition-colors" title="Reject">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Widgets Row */}
      <div className="grid gap-6 md:grid-cols-2 mt-2">
        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Registrations</CardTitle>
                <CardDescription>Latest users who joined A-yos.</CardDescription>
              </div>
              <div className="p-2 bg-info/10 rounded-lg">
                <UserPlus className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((recentUser) => (
                <div key={recentUser.id} className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                      {recentUser.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy">{recentUser.name}</p>
                      <p className="text-xs text-gray-500">Joined {recentUser.registeredAt}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Customer</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>Important alerts and updates.</CardDescription>
              </div>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Bell className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemNotifications.map((notification)=><div key={notification.id} className="flex items-start space-x-3 p-3 bg-info/5 border border-info/20 rounded-lg"><div className="p-1.5 bg-info/10 text-info rounded-md"><Bell size={16}/></div><div><p className="text-sm font-medium text-info">{notification.title}</p><p className="text-xs text-gray-600 mt-1">{notification.message}</p></div></div>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
