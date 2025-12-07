# User Metrics Feature

## Overview
The User Metrics feature provides comprehensive analytics and insights into individual employee desk usage patterns directly within the employee dashboard. It promotes healthier work habits through standing/sitting tracking and friendly competition, all in one unified interface.

## Features Implemented

### 1. **Standing/Sitting Time Tracking Chart**
- Visual bar chart showing daily breakdown of standing vs sitting time
- Stacked view to easily compare daily totals
- Time displayed in minutes for better readability
- Fully responsive with dark/light mode support

### 2. **Standing Time Leaderboard**
- Competitive ranking showing top users by standing percentage
- Visual progress bars for each user
- Highlights current user with special styling
- Trophy icons for top 3 positions
- Shows standing percentage and absolute minutes

### 3. **Most Used Desks Chart**
- Doughnut chart displaying user's top 5 frequently used desks
- Shows both session count and total hours spent
- Color-coded for easy identification
- Interactive tooltips with detailed information

### 4. **Weekly Usage Pattern Chart**
- Line chart showing desk usage patterns throughout the week
- Displays both standing and sitting time trends
- Includes session count information
- Helps identify usage patterns (e.g., less standing on Mondays)

### 5. **Overall Statistics Cards**
- **Total Sessions**: Count of all desk usage sessions
- **Total Hours**: Cumulative time spent at desks
- **Standing Percentage**: Overall standing time ratio
- **Position Changes**: Total number of height adjustments

## API Endpoint

### `GET /api/user/metrics/`

**Query Parameters:**
- `days` (optional): Time range in days (default: 7, options: 7, 14, 30)

**Response Structure:**
```json
{
  "standing_sitting_chart": {
    "labels": ["Dec 01", "Dec 02", ...],
    "sitting": [120, 95, ...],
    "standing": [80, 105, ...]
  },
  "leaderboard": [
    {
      "user_id": 1,
      "name": "John Doe",
      "standing_percentage": 62.5,
      "standing_minutes": 250,
      "sitting_minutes": 150,
      "total_minutes": 400,
      "is_current_user": true
    },
    ...
  ],
  "most_used_desks": [
    {
      "desk_name": "Desk A",
      "desk_id": 1,
      "sessions": 15,
      "total_hours": 42.5
    },
    ...
  ],
  "weekly_usage": {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "sitting": [120, 140, ...],
    "standing": [80, 90, ...],
    "sessions": [3, 4, ...]
  },
  "overall_stats": {
    "total_sessions": 45,
    "total_hours": 180.5,
    "sitting_percentage": 58.3,
    "standing_percentage": 41.7,
    "avg_session_duration": 4.0,
    "total_position_changes": 67
  }
}
```

## Components Created

### Reusable Chart Components
Located in `frontend/src/components/charts/`:

1. **MetricCard.jsx** - Wrapper component for consistent card styling
2. **StandingSittingChart.jsx** - Bar chart for daily standing/sitting breakdown
3. **StandingLeaderboard.jsx** - Leaderboard component with ranking and progress bars
4. **MostUsedDesksChart.jsx** - Doughnut chart for desk usage frequency
5. **WeeklyUsageChart.jsx** - Line chart for weekly usage patterns
6. **OverallStatsCards.jsx** - Grid of statistic cards with icons

### Main Component
- **EmployeeDashboard.jsx** - Integrated metrics within the main dashboard (no separate page needed)

## Architecture

The metrics are now **fully integrated into the Employee Dashboard** rather than being a separate page:

- All metrics display **below** the "My Desk" and "Upcoming Reservations" cards
- Time range selector and refresh button are accessible at the top of the metrics section
- Seamless scrolling experience - users can see their current desk status and metrics in one view
- No need to navigate to a separate page
## Usage

### Accessing Metrics
1. Log in as an employee
2. Navigate to "Dashboard" in the sidebar (default view)
3. Scroll down to see the metrics section below your desk information
4. Select desired time range (7, 14, or 30 days) using the dropdown
5. Click refresh icon to reload data manually

### Layout Benefits
- **No context switching**: See your current desk status and historical metrics together
- **Better UX**: Single page with all relevant information
- **Responsive design**: Metrics adapt to screen size with cards stacking on mobile
- **Performance**: Metrics load only when dashboard is active Desk, Reservations)
└── Main Content Area
    ├── My Desk Card (left)
    ├── Upcoming Reservations Card (right)
    └── User Metrics Section ⭐ (full width below)
        ├── Header with Time Range Selector
        ├── Overall Stats Cards (4 cards in grid)
        └── Charts Grid (2x2)
            ├── Standing vs Sitting Chart
            ├── Weekly Usage Pattern
            ├── Most Used Desks
            └── Standing Leaderboard
```

All components are fully compatible with dark/light mode:
- Automatic color scheme adjustment based on theme
- Chart colors optimized for readability in both modes
- Consistent with existing design system
- Uses Tailwind CSS dark: variants

## Usage

### Accessing Metrics
1. Log in as an employee
2. Navigate to "My Metrics" in the sidebar
3. Select desired time range (7, 14, or 30 days)
4. Click refresh icon to reload data

### Testing with Sample Data
Run the following command to generate sample usage data:
```bash
python manage.py seed_usage_metrics
```

This creates realistic usage logs for all non-admin users over the past 30 days.

## Dependencies

### Backend
- Django REST Framework (existing)
- Django ORM aggregations (Sum, Count, etc.)

### Frontend
- react-chartjs-2 (existing)
- chart.js (existing)
- @tabler/icons-react (existing)
- shadcn/ui components (existing)

## Future Enhancements

Potential improvements:
1. Export metrics as PDF/CSV
2. Goal setting and progress tracking
3. Health recommendations based on sitting/standing ratio
4. Team-wide challenges and achievements
5. Historical trend analysis
6. Predictive analytics for desk availability
7. Integration with calendar for scheduling standing breaks
8. Mobile-responsive dashboard view

## Notes

- All times are displayed in minutes for user-friendliness
- Leaderboard promotes healthy competition without being intrusive
- Data is user-specific to maintain privacy
- Aggregations are optimized to minimize database queries
- Charts are interactive with detailed tooltips
