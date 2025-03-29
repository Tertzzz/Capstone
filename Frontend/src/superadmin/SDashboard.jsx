import React, { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import * as XLSX from 'xlsx';
import axios from 'axios'; // Add axios for API calls
import "./SDashboard.css";

const SDashboard = () => {
  const [selectedBrgy, setSelectedBrgy] = useState("All");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({});
  const [barangays, setBarangays] = useState(["All"]);
  const [years] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  });

  // Chart refs for cleanup
  const chartRefs = useRef({
    population: null,
    barangay: null,
    education: null,
    income: null,
    employment: null,
    civilStatus: null,
    gender: null
  });

  // Cleanup function for charts
  useEffect(() => {
    return () => {
      // Cleanup chart instances on unmount
      Object.values(chartRefs.current).forEach(chart => {
        if (chart && chart.getEchartsInstance) {
          try {
            chart.getEchartsInstance().dispose();
          } catch (e) {
            console.warn('Error disposing chart:', e);
          }
        }
      });
    };
  }, []);

  const API_BASE_URL = process.env.REACT_APP_API_URL;
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get data from backend
        const response = await axios.get(`${API_BASE_URL}/users/step1_identifying_information`, {
          params: {
            barangay: selectedBrgy
          }
        });
        const data = response.data;

        setDashboardData({
          [selectedBrgy]: {
            population: data.monthlyData,
            barangayDistribution: data.barangayData.map(item => ({
              name: item.barangay,
              value: item.count
            })),
            educationData: data.educationData.map(item => ({
              name: item.education,
              value: item.count
            })),
            incomeData: data.incomeData.map(item => ({
              name: item.income_range,
              value: item.count
            })),
            employmentData: data.employmentData.map(item => ({
              name: item.employment_status,
              value: item.count
            })),
            civilStatusData: data.civilStatusData.map(item => ({
              name: item.civil_status,
              value: item.count
            })),
            genderData: data.genderData.map(item => ({
              name: item.gender,
              value: item.count
            }))
          }
        });

        // Set barangays from the data
        if (data.barangayData) {
          const uniqueBarangays = data.barangayData.map(item => item.barangay);
          setBarangays(["All", ...uniqueBarangays]);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedBrgy, selectedYear, API_BASE_URL]);

  const styles = {
    dashboardContainer: {
      padding: '2rem',
      backgroundColor: '#f5f7fa'
    },
    header: {
      marginBottom: '2rem',
      padding: '1rem 2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: '0'
    },
    filters: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    },
    select: {
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      border: '1px solid #e2e8f0',
      backgroundColor: 'white',
      fontSize: '14px',
      color: '#4a5568',
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: '#cbd5e0'
      },
      '&:focus': {
        borderColor: '#4299e1',
        boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)'
      }
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '2rem',
      padding: '1rem'
    },
    chartCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '1rem',
      height: '400px',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '400px',
      fontSize: '18px',
      color: '#4a5568'
    }
  };

  const chartStyle = {
    height: '400px',
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    padding: '2rem'
  };

  // Monthly Population Trend
  const populationOption = {
    title: {
      text: 'Monthly Population Trend',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: dashboardData[selectedBrgy]?.population || [],
      type: 'line',
      smooth: true
    }]
  };

  // Barangay Distribution
  const barangayOption = {
    title: {
      text: 'Barangay Distribution',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: '70%',
      data: dashboardData[selectedBrgy]?.barangayDistribution || [],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  // Education Level
  const educationOption = {
    title: {
      text: 'Education Level Distribution',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: dashboardData[selectedBrgy]?.educationData?.map(item => item.name || 'N/A') || []
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: dashboardData[selectedBrgy]?.educationData?.map(item => item.value || 0) || [],
      type: 'bar'
    }]
  };

  // Income Distribution
  const incomeOption = {
    title: {
      text: 'Income Distribution',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}'
    },
    xAxis: {
      type: 'category',
      data: dashboardData[selectedBrgy]?.incomeData?.map(item => item.name) || [],
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: 'Count'
    },
    series: [{
      data: dashboardData[selectedBrgy]?.incomeData?.map(item => ({
        value: item.value,
        itemStyle: {
          color: '#5470c6'
        }
      })) || [],
      type: 'bar',
      showBackground: true,
      backgroundStyle: {
        color: 'rgba(180, 180, 180, 0.2)'
      }
    }]
  };

  // Employment Status
  const employmentOption = {
    title: {
      text: 'Employment Status',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: dashboardData[selectedBrgy]?.employmentData || []
    }]
  };

  // Civil Status
  const civilStatusOption = {
    title: {
      text: 'Civil Status Distribution',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: dashboardData[selectedBrgy]?.civilStatusData || []
    }]
  };

  // Gender Distribution
  const genderOption = {
    title: {
      text: 'Gender Distribution',
      left: 'center',
      top: 20,
      textStyle: { fontSize: 16, fontWeight: 500 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: dashboardData[selectedBrgy]?.genderData || []
    }]
  };

  return (
    <div style={styles.dashboardContainer}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <div style={styles.filters}>
          <select 
            value={selectedBrgy} 
            onChange={(e) => setSelectedBrgy(e.target.value)}
            style={styles.select}
          >
            {barangays.map((brgy) => (
              <option key={brgy} value={brgy}>{brgy}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={styles.select}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading dashboard data...</div>
      ) : (
        <div style={styles.gridContainer}>
          <div style={styles.chartCard}>
            <ReactECharts 
              ref={(e) => { chartRefs.current.population = e; }}
              option={populationOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
          {selectedBrgy === "All" && (
            <div style={styles.chartCard}>
              <ReactECharts 
                ref={(e) => { chartRefs.current.barangay = e; }}
                option={barangayOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          )}
          <div style={styles.chartCard}>
            <ReactECharts 
              ref={(e) => { chartRefs.current.education = e; }}
              option={educationOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
          <div style={styles.chartCard}>
            <ReactECharts 
              ref={(e) => { chartRefs.current.income = e; }}
              option={incomeOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
          <div style={styles.chartCard}>
            <ReactECharts 
              ref={(e) => { chartRefs.current.employment = e; }}
              option={employmentOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
          <div style={styles.chartCard}>
            <ReactECharts 
              ref={(e) => { chartRefs.current.civilStatus = e; }}
              option={civilStatusOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
          <div style={styles.chartCard}>
            <ReactECharts 
              ref={(e) => { chartRefs.current.gender = e; }}
              option={genderOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SDashboard;