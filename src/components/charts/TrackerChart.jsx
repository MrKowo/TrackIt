import React, { useMemo, useRef, useCallback } from 'react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, Filler, TimeScale 
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import { RotateCcw } from 'lucide-react';
import { formatIsoDate, calculateAggregate, formatDate, calculateTrendProjection } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, TimeScale, zoomPlugin);

// --- 1. PURE HELPER: Data Processing Logic ---
const processChartData = (entries, tracker, theme, isAmoled) => {
    if (!entries || entries.length === 0) {
        return { 
            chartData: { datasets: [] }, 
            minDate: Date.now(), maxDate: Date.now(), 
            lastEntryDate: Date.now(), 
            firstEntryDate: Date.now(),
            yMin: 0, yMax: 10 
        };
    }

    // A. Calculate Y-Axis Limits
    const values = entries.map(e => Number(e.value));
    let minY = Math.min(...values);
    let maxY = Math.max(...values);
    
    if (tracker.targetValue) {
        minY = Math.min(minY, tracker.targetValue);
        maxY = Math.max(maxY, tracker.targetValue);
    }
    
    const padding = (maxY - minY) * 0.1 || 1;
    const finalYMin = minY - padding;
    const finalYMax = maxY + padding;

    // B. Group & Sort Data
    const groups = {};
    entries.forEach(e => {
        const date = formatIsoDate(e.date);
        if(!groups[date]) groups[date] = [];
        groups[date].push(Number(e.value));
    });
    
    const realDates = Object.keys(groups).sort((a,b) => new Date(a) - new Date(b));
    const startDate = new Date(realDates[0]);
    const lastRealEntryDate = new Date(realDates[realDates.length - 1]);
    
    let endDate = new Date(lastRealEntryDate);

    // C. Trend Logic
    let trend = null;
    if (tracker.showTrendForecast && entries.length > 1) {
        trend = calculateTrendProjection(entries, tracker);
        if (trend && new Date(trend.date) > endDate) {
            endDate = new Date(trend.date);
        }
    }

    // D. Build Datasets
    const mainData = [];
    const trendData = [];
    const targetData = [];
    
    const current = new Date(startDate);
    current.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);
    lastRealEntryDate.setHours(0,0,0,0);

    let lastVal = null;
    let lastTime = null;

    while (current <= endDate) {
        const timestamp = current.getTime();
        const iso = formatIsoDate(current);

        if (groups[iso]) {
            const val = calculateAggregate(groups[iso], tracker.aggregation || 'average');
            mainData.push({ x: timestamp, y: val });
            lastVal = val;
            lastTime = timestamp;
        } else {
            mainData.push({ x: timestamp, y: null });
        }

        if (tracker.goalDirection === 'target' && tracker.targetValue) {
            targetData.push({ x: timestamp, y: tracker.targetValue });
        }

        current.setDate(current.getDate() + 1);
    }

    if (trend && lastVal !== null) {
        trendData.push({ x: lastTime, y: lastVal });
        trendData.push({ x: endDate.getTime(), y: tracker.targetValue });
    }

    const strictClip = { left: 0, top: 20, right: 0, bottom: 0 };

    const datasets = [{
        label: tracker.name,
        data: mainData,
        borderColor: theme.chartLine,
        backgroundColor: theme.chartFill,
        tension: 0.1,
        fill: true,
        pointRadius: (ctx) => (ctx.raw?.y === null ? 0 : 3),
        pointHoverRadius: 6,
        spanGaps: true,
        normalized: true,
        clip: strictClip 
    }];

    if (targetData.length > 0) {
        datasets.push({
            label: 'Target',
            data: targetData,
            borderColor: isAmoled ? '#22c55e' : '#16a34a',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 1.5,
            fill: false,
            clip: strictClip
        });
    }

    if (trendData.length > 0) {
        datasets.push({
            label: 'Trend',
            data: trendData,
            borderColor: '#fbbf24',
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 2,
            spanGaps: true,
            fill: false,
            clip: strictClip
        });
    }

    const dayMs = 86400000;
    
    return {
        chartData: { datasets },
        minDate: startDate.getTime() - (dayMs * 0.05), 
        maxDate: endDate.getTime() + dayMs,
        firstEntryDate: startDate.getTime(),
        lastEntryDate: lastRealEntryDate.getTime(),
        yMin: finalYMin,
        yMax: finalYMax
    };
};

// --- 2. PURE HELPER: Chart Configuration ---
const getChartOptions = ({ minDate, maxDate, firstEntryDate, lastEntryDate, yMin, yMax, gridColor, textColor, tracker, onDateClick }) => {
    
    const getInitialRange = () => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const daysBack = isMobile ? 30 : 60;
        const dayMs = 86400000;
        const idealMin = lastEntryDate - (daysBack * dayMs);
        const idealMax = lastEntryDate + dayMs; 

        return {
            min: Math.max(minDate, idealMin), 
            max: idealMax 
        };
    };

    const initialRange = getInitialRange();

    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { top: 10, bottom: 0, left: 0, right: 10 } },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: { 
                    title: (ctx) => formatDate(new Date(ctx[0].parsed.x)),
                    label: (ctx) => ctx.raw?.y === null ? '' : `${ctx.dataset.label}: ${ctx.raw.y} ${tracker.unit || ''}` 
                },
                filter: (item) => item.raw?.y !== null
            },
            zoom: {
                pan: { enabled: true, mode: 'x', threshold: 0 },
                zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
                limits: { x: { min: minDate, max: maxDate }, y: { min: yMin, max: yMax } }
            }
        },
        scales: {
            y: {
                min: yMin, max: yMax,
                grid: { color: gridColor },
                // --- STABILIZER: Lock Y-Axis Width ---
                // 'afterFit' forces the axis to be exactly 40px wide,
                // preventing the chart from jittering when label digits change length.
                afterFit: (scaleInstance) => {
                    scaleInstance.width = 40; 
                },
                ticks: { 
                    color: textColor,
                    padding: 10, 
                    z: 10 
                }
            },
            x: {
                type: 'time',
                time: { unit: 'day', tooltipFormat: 'MMM d, yyyy', displayFormats: { day: 'MMM d' } },
                
                min: initialRange.min,
                max: initialRange.max,
                
                bounds: 'ticks', 
                
                grid: { display: false },
                ticks: { 
                    color: textColor, 
                    minRotation: 45,
                    maxRotation: 45,
                    source: 'data',
                    autoSkip: false,
                    padding: 8, 
                    callback: function(val, index) {
                        const scale = this.chart.scales.x;
                        const visibleRangeMs = scale.max - scale.min;
                        const visibleDays = visibleRangeMs / 86400000;

                        let step = 1; 
                        if (visibleDays > 14) step = 2;   
                        if (visibleDays > 30) step = 5;   
                        if (visibleDays > 60) step = 10;  
                        if (visibleDays > 180) step = 30; 

                        const date = new Date(val);
                        const daysSinceStart = Math.floor((date.getTime() - firstEntryDate) / 86400000);

                        if (Math.abs(daysSinceStart) % step === 0) {
                            return formatDate(date); 
                        }
                        return null; 
                    }
                }
            }
        },
        onClick: (event, elements, chart) => {
            if (elements.length > 0 && onDateClick) {
                const timestamp = chart.scales.x.getValueForPixel(event.x);
                onDateClick(formatIsoDate(new Date(timestamp)));
            }
        }
    };
};

// --- 3. MAIN COMPONENT ---
export const TrackerChart = ({ entries, tracker, onDateClick }) => {
    const { theme, themeMode, isAmoled } = useTheme();
    const chartRef = useRef(null);

    const processed = useMemo(() => 
        processChartData(entries, tracker, theme, isAmoled), 
    [entries, tracker, theme, isAmoled]);

    const gridColor = isAmoled ? '#27272a' : (themeMode === 'dark' ? '#334155' : '#E4E4E7');
    const textColor = isAmoled || themeMode === 'dark' ? '#A1A1AA' : '#71717A';

    const options = useMemo(() => 
        getChartOptions({
            ...processed,
            gridColor,
            textColor,
            tracker,
            onDateClick
        }),
    [processed, gridColor, textColor, tracker, onDateClick]);

    const handleResetZoom = useCallback(() => {
        chartRef.current?.resetZoom();
    }, []);

    if (!entries || entries.length === 0) {
        return <div className="h-full flex items-center justify-center text-zinc-400">No data yet</div>;
    }

    return (
        <div className="h-64 w-full relative group" style={{ touchAction: 'pan-y' }}>
            <Line ref={chartRef} data={processed.chartData} options={options} />
            
            <button 
                onClick={handleResetZoom}
                className={`
                    absolute top-2 right-2 p-1.5 rounded-lg shadow-sm border transition-opacity opacity-0 group-hover:opacity-100
                    ${isAmoled ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900'}
                `}
                title="Reset View"
            >
                <RotateCcw className="w-3 h-3" />
            </button>
        </div>
    );
};