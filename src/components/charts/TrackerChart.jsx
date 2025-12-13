import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatIsoDate, calculateAggregate, formatDate, calculateTrendProjection } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const TrackerChart = ({ entries, tracker, onDateClick }) => {
    const { theme, themeMode, isAmoled } = useTheme();

    const { chartData, fullDateLabels } = useMemo(() => {
        if (!entries || entries.length === 0) return { chartData: { labels: [], datasets: [] }, fullDateLabels: [] };
        
        // 1. Group Data by Date
        const groups = {};
        entries.forEach(e => {
            const date = formatIsoDate(e.date);
            if(!groups[date]) groups[date] = [];
            groups[date].push(Number(e.value));
        });
        
        const realDates = Object.keys(groups).sort((a,b) => new Date(a) - new Date(b));
        if (realDates.length === 0) return { chartData: { labels: [], datasets: [] }, fullDateLabels: [] };

        // 2. Determine Time Range (Start to End OR Start to Trend Date)
        const startDate = new Date(realDates[0]);
        let endDate = new Date(realDates[realDates.length - 1]);
        
        // Check for Trend Projection to extend the End Date
        let trend = null;
        if (tracker.showTrendForecast && entries.length > 1) {
            trend = calculateTrendProjection(entries, tracker);
            if (trend) {
                const trendDateObj = new Date(trend.date);
                if (trendDateObj > endDate) {
                    endDate = trendDateObj; // Extend chart to the future
                }
            }
        }

        const dateArray = [];
        const dataValues = [];
        
        // 3. GENERATE FULL LINEAR TIMELINE (Start -> End/Trend)
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const iso = formatIsoDate(d);
            dateArray.push(iso);

            // Populate Main Data (only if it exists in real entries)
            if (groups[iso]) {
                const method = tracker.aggregation || 'average';
                dataValues.push(calculateAggregate(groups[iso], method));
            } else {
                dataValues.push(null);
            }
        }

        // Post-processing for Cumulative Goals (Fill nulls)
        if (tracker.aggregation === 'sum' && tracker.goalPeriod !== 'daily') {
            let runningTotal = 0;
            for (let i = 0; i < dataValues.length; i++) {
                if (dataValues[i] !== null) {
                    runningTotal += dataValues[i];
                    dataValues[i] = runningTotal;
                } else {
                    dataValues[i] = runningTotal;
                }
            }
        }
        
        // 4. Prepare Labels & Datasets
        const labels = dateArray.map(d => formatDate(d));
        
        const mainDataset = {
            label: tracker.name,
            data: [...dataValues], 
            borderColor: theme.chartLine,
            backgroundColor: theme.chartFill,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: theme.chartPoint,
            pointRadius: (ctx) => (ctx.raw === null ? 0 : 4), 
            pointHoverRadius: (ctx) => (ctx.raw === null ? 0 : 6),
            spanGaps: true, 
        };

        const datasets = [mainDataset];

        // --- FEATURE: TARGET LINE ---
        if (tracker.goalDirection === 'target' && tracker.targetValue) {
            datasets.push({
                label: 'Target',
                data: new Array(labels.length).fill(tracker.targetValue),
                borderColor: isAmoled ? '#22c55e' : '#16a34a', 
                borderDash: [5, 5],
                pointRadius: 0,
                borderWidth: 2,
                fill: false,
                tension: 0
            });
        }

        // --- FEATURE: TREND FORECAST LINE ---
        if (trend) {
             // Create a Sparse Dataset for the Trend Line
             const trendData = new Array(labels.length).fill(null);

             // A. Find Start Point (Last Real Data Value)
             // We search backwards from the real data end (not necessarily the chart end now)
             let lastRealIndex = -1;
             for (let i = dataValues.length - 1; i >= 0; i--) {
                 if (dataValues[i] !== null) {
                     lastRealIndex = i;
                     break;
                 }
             }

             // B. Find End Point (The Project Date Index)
             // Since 'labels' and 'dateArray' are perfectly aligned linear days, 
             // the last index is always the trend date (because we extended 'endDate' above).
             const trendEndIndex = labels.length - 1;

             if (lastRealIndex !== -1 && lastRealIndex < trendEndIndex) {
                 trendData[lastRealIndex] = dataValues[lastRealIndex]; // Start
                 trendData[trendEndIndex] = tracker.targetValue;       // End

                 datasets.push({
                     label: 'Trend',
                     data: trendData,
                     borderColor: '#fbbf24', // Amber/Gold
                     borderDash: [4, 4],
                     pointRadius: 4,
                     pointBackgroundColor: '#fbbf24',
                     spanGaps: true, // Connects the dot across all the empty days we just added
                     fill: false,
                     tension: 0
                 });
             }
        }

        return {
            chartData: {
                labels: labels,
                datasets: datasets
            },
            fullDateLabels: dateArray 
        };
    }, [entries, tracker, theme, isAmoled]);

    const gridColor = isAmoled ? '#27272a' : (themeMode === 'dark' ? '#334155' : '#E4E4E7');
    const textColor = isAmoled || themeMode === 'dark' ? '#A1A1AA' : '#71717A';

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: { 
                    label: (ctx) => ctx.raw === null ? '' : `${ctx.dataset.label}: ${ctx.raw} ${tracker.unit || ''}` 
                },
                filter: (item) => item.raw !== null
            }
        },
        scales: {
            y: {
                beginAtZero: false, 
                grace: '5%',       
                grid: { color: gridColor },
                ticks: { color: textColor }
            },
            x: {
                grid: { display: false },
                ticks: { 
                    color: textColor,
                    maxTicksLimit: 8, 
                    maxRotation: 0
                }
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0 && onDateClick) {
                const element = elements.find(el => el.datasetIndex === 0);
                if (element) {
                    const index = element.index;
                    if (index < fullDateLabels.length) {
                        onDateClick(fullDateLabels[index]);
                    }
                }
            }
        }
    };

    if (entries.length === 0) {
        return <div className="h-full flex items-center justify-center text-zinc-400">No data yet</div>;
    }

    return (
        <div className="h-64 w-full">
            <Line data={chartData} options={options} />
        </div>
    );
};