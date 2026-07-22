import React, { useEffect, useState } from 'react';
import { 
  FileText, Download, Filter, Search, Calendar,
  BarChart2, Users, Briefcase, CreditCard, Star
} from 'lucide-react';
import Pagination from '../../components/ui/Pagination';

import { downloadReport, generateReport, loadReports, subscribe } from '../../services/adminData';

const Reports = () => {
  const [reports,setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [reportType, setReportType] = useState('All');

  const reportsPerPage = 10;
  useEffect(()=>{const refresh=async()=>setReports(await loadReports());void refresh();return subscribe('report_exports',refresh)},[]);

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = reportType === 'All' || r.type === reportType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * reportsPerPage, currentPage * reportsPerPage);

  const handleDownload = async (id) => {
    const report=reports.find((item)=>item.id===id);if(!report?.storagePath){alert('Report file is not ready');return;}try{await downloadReport(report.storagePath)}catch(error){alert(error.message)}
  };

  const handleDownloadExcel = (id) => {
    const report=reports.find((item)=>item.id===id);if(!report)return;void generateReport(report.reportTypeCode,'XLSX').then((generated)=>downloadReport(generated.storage_path)).catch((error)=>alert(error.message));
  };
  const handleDownloadCSV = (id) => {
    const report=reports.find((item)=>item.id===id);if(!report)return;void generateReport(report.reportTypeCode,'CSV').then((generated)=>downloadReport(generated.storage_path)).catch((error)=>alert(error.message));
  };
  const reportCodes={All:'FINANCIAL','Financial Summary':'FINANCIAL','Worker Performance':'WORKERS','Customer Activity':'CUSTOMERS','Service Popularity':'SERVICES','Review Sentiment':'REVIEWS'};
  const handleGenerate=async()=>{try{await generateReport(reportCodes[reportType]??'FINANCIAL','PDF');setReports(await loadReports())}catch(error){alert(error.message)}};

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
          <p className="text-gray-500 mt-1">Generate and download comprehensive system reports</p>
        </div>
        <button onClick={()=>void handleGenerate()} className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center">
          <FileText size={18} className="mr-2" /> Generate Custom Report
        </button>
      </div>

      {/* Report Types Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div 
          onClick={() => setReportType('All')}
          className={`rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${reportType === 'All' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-100 hover:shadow-md text-gray-900'}`}
        >
          <div className={`p-3 rounded-full mb-3 ${reportType === 'All' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Filter size={24} />
          </div>
          <h3 className="text-sm font-bold">All Reports</h3>
        </div>
        {[
          { name: 'Financial', filterName: 'Financial Summary', icon: <CreditCard />, bg: 'bg-blue-50', activeBg: 'bg-blue-600', color: 'text-blue-500', activeColor: 'text-white' },
          { name: 'Workers', filterName: 'Worker Performance', icon: <Briefcase />, bg: 'bg-purple-50', activeBg: 'bg-purple-600', color: 'text-purple-500', activeColor: 'text-white' },
          { name: 'Customers', filterName: 'Customer Activity', icon: <Users />, bg: 'bg-green-50', activeBg: 'bg-green-600', color: 'text-green-500', activeColor: 'text-white' },
          { name: 'Services', filterName: 'Service Popularity', icon: <BarChart2 />, bg: 'bg-orange-50', activeBg: 'bg-orange-600', color: 'text-orange-500', activeColor: 'text-white' },
          { name: 'Reviews', filterName: 'Review Sentiment', icon: <Star className="fill-current" />, bg: 'bg-yellow-50', activeBg: 'bg-yellow-500', color: 'text-yellow-500', activeColor: 'text-white' },
        ].map((type, index) => {
          const isActive = reportType === type.filterName;
          return (
            <div 
              key={index} 
              onClick={() => { setReportType(type.filterName); setCurrentPage(1); }}
              className={`rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${isActive ? type.activeBg + ' border-transparent text-white' : 'bg-white border-gray-100 hover:shadow-md text-gray-900'}`}
            >
              <div className={`p-3 rounded-full mb-3 ${isActive ? 'bg-white/20 text-white' : type.bg + ' ' + type.color}`}>
                {type.icon}
              </div>
              <h3 className="text-sm font-bold">{type.name}</h3>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search reports by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Financial Summary">Financial Summary</option>
            <option value="Worker Performance">Worker Performance</option>
            <option value="Customer Activity">Customer Activity</option>
            <option value="Service Popularity">Service Popularity</option>
            <option value="Review Sentiment">Review Sentiment</option>
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 ml-2"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Year">This Year</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Size</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedReports.length > 0 ? paginatedReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gray-50 mr-3">
                      {report.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{report.name}</div>
                      <div className="text-xs text-gray-500">{report.id} • {report.type}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 flex items-center">
                    <Calendar size={14} className="mr-1 text-gray-400" /> {report.dateGenerated}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">By {report.generatedBy}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mb-1">
                    {report.status}
                  </span>
                  <div className="text-xs text-gray-500">{report.size}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleDownloadCSV(report.id)}
                      className="text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
                    >
                      CSV
                    </button>
                    <button 
                      onClick={() => handleDownloadExcel(report.id)}
                      className="text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
                    >
                      Excel
                    </button>
                    <button 
                      onClick={() => handleDownload(report.id)}
                      className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs flex items-center"
                    >
                      <Download size={14} className="mr-1" /> PDF
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  No reports found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredReports.length > 0 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}
    </div>
  );
};

export default Reports;
