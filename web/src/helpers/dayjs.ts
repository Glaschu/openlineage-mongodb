import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

// Centralized Day.js configuration so plugins are registered exactly once across the app.
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(utc)

export default dayjs
