import { TAG_COLORS } from './constants';

export const getNextColor = (existingTags) => {
    if (!existingTags || existingTags.length === 0) return TAG_COLORS[0];
    const usedColors = new Set(existingTags.map(t => t.colorClass));
    const available = TAG_COLORS.filter(c => !usedColors.has(c.class));
    if (available.length > 0) return available[0];
    return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
};

export const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const formatIsoDate = (date) => {
    if (!date) return '';
    
    // SAFETY CHECK: If it's already a clean "YYYY-MM-DD" string, don't touch it!
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    const d = new Date(date);
    // This ensures we use YOUR computer's local time, not UTC
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getMonthData = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startDay: firstDay.getDay() };
};

export const calculateAggregate = (arr, method = 'average') => {
    if (!arr || arr.length === 0) return 0;
    const values = arr.map(Number).filter(n => !isNaN(n));
    if (values.length === 0) return 0;
    return method === 'sum' ? values.reduce((a, b) => a + b, 0) : values.reduce((a, b) => a + b, 0) / values.length;
};

export const calculateStreakData = (dates, enableStreak) => {
    // If streak is disabled, or no dates, return base data with no streak.
    if (!enableStreak || !dates || dates.length === 0) return { streak: 0, lastDate: dates && dates.length > 0 ? formatIsoDate(dates[0]) : null };

    // 1. Normalize dates to 'YYYY-MM-DD', remove duplicates, and sort descending.
    const uniqueDates = [...new Set(dates.map(formatIsoDate))].sort((a, b) => new Date(b) - new Date(a));
    if (uniqueDates.length === 0) return { streak: 0, lastDate: null };

    const lastDateStr = uniqueDates[0];
    const todayStr = formatIsoDate(new Date());

    // 2. Check if the latest entry is too old (i.e., not today or yesterday)
    const diffInDays = (new Date(todayStr).getTime() - new Date(lastDateStr).getTime()) / (1000 * 3600 * 24);
    
    // If the latest entry is not "today" (diff=0) or "yesterday" (diff=1), the streak is broken.
    if (diffInDays > 1) {
        return { streak: 0, lastDate: lastDateStr }; 
    }

    // 3. Calculate the streak length
    let tempStreak = 0;
    let prevDate = null;
    
    for (const dStr of uniqueDates) {
        if (prevDate === null) {
            tempStreak = 1;
            prevDate = dStr;
            continue;
        } 
        
        const diff = (new Date(prevDate).getTime() - new Date(dStr).getTime()) / (1000 * 3600 * 24);
        
        if (diff === 1) { // Consecutive day
            tempStreak++; 
            prevDate = dStr; 
        } else { // Gap found
            break;
        }
    }
    
    return { streak: tempStreak, lastDate: lastDateStr };
};

export const resizeImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const maxSize = 256;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// --- STANDARD GOAL LOGIC ---
export const checkGoalStatus = (value, tracker, prevValue = null) => {
    if (value === null || value === undefined) return { isHit: null, diff: 0, label: '' };
    
    // 1. Target Mode (Respects Tolerance)
    if (tracker.goalDirection === 'target' && tracker.targetValue !== null && tracker.targetValue !== undefined) {
        const diff = Math.abs(value - tracker.targetValue);
        const tolerance = tracker.tolerance || 0;
        const isHit = diff <= tolerance;
        return { isHit, diff, label: isHit ? 'Target Hit' : `${diff.toFixed(1)} off` };
    }

    // 2. Increase Mode
    if (tracker.goalDirection === 'increase') {
        if (prevValue === null) return { isHit: null, diff: 0, label: 'No prev data' };
        const isHit = value >= prevValue;
        const diff = value - prevValue;
        return { isHit, diff, label: isHit ? 'Improved' : 'Decreased' };
    }

    // 3. Decrease Mode
    if (tracker.goalDirection === 'decrease') {
        if (prevValue === null) return { isHit: null, diff: 0, label: 'No prev data' };
        const isHit = value <= prevValue;
        const diff = prevValue - value;
        return { isHit, diff, label: isHit ? 'Improved' : 'Increased' };
    }

    return { isHit: null, diff: 0, label: '' };
};

// --- TREND & FORECAST LOGIC ---
export const calculateTrendProjection = (entries, tracker) => {
    if (!entries || entries.length < 2 || !tracker.targetValue || tracker.goalDirection === 'none' || tracker.goalDirection === undefined) return null;

    // 1. Prepare Data Points (x = days from start, y = value)
    // Sort ascending by date
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = new Date(sorted[0].date).getTime();
    
    let dataPoints = [];
    
    if (tracker.aggregation === 'sum' && tracker.goalPeriod !== 'daily') {
        // For Long Term Sums (e.g. "Save $5000"), we need CUMULATIVE progression
        let runningTotal = 0;
        dataPoints = sorted.map(e => {
            runningTotal += e.value;
            const daysDiff = (new Date(e.date).getTime() - startDate) / (1000 * 3600 * 24);
            return { x: daysDiff, y: runningTotal };
        });
    } else {
        // For Average/Daily/Weight (e.g. "Reach 70kg"), we use raw values
        dataPoints = sorted.map(e => {
            const daysDiff = (new Date(e.date).getTime() - startDate) / (1000 * 3600 * 24);
            return { x: daysDiff, y: e.value };
        });
    }

    // 2. Linear Regression (Least Squares)
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
    const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);

    // Prevent division by zero if all dates are the same
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // 3. Solve for Target ( Target = slope * x + intercept  =>  x = (Target - intercept) / slope )
    
    // Safety: If slope is flat or moving wrong way, return null to avoid nonsensical dates
    if (tracker.goalDirection === 'increase' && slope <= 0) return null;
    if (tracker.goalDirection === 'decrease' && slope >= 0) return null;
    if (slope === 0) return null; // Flat line never hits target

    const daysToTarget = (tracker.targetValue - intercept) / slope;

    // 4. Convert back to Date
    const targetDateObj = new Date(startDate + (daysToTarget * 24 * 60 * 60 * 1000));
    const today = new Date();
    
    // Calculate days from TODAY, not start date
    const daysLeft = Math.ceil((targetDateObj - today) / (1000 * 3600 * 24));

    // If projection is in the past (e.g., goal was technically hit last week according to trend), ignore
    if (daysLeft < 0) return null;

    return {
        date: formatIsoDate(targetDateObj),
        daysLeft,
        value: tracker.targetValue
    };
};