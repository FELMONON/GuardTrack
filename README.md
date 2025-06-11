# GuardTrack

A comprehensive guard patrol tracking application with geofencing capabilities, session management, and real-time monitoring.

## Features

- **Geofenced Patrol Sites**: Define patrol locations with customizable radius
- **Session Tracking**: Track entry/exit times with GPS coordinates
- **Offline Support**: Continue logging patrols when offline, sync when connected
- **Real-time Location**: GPS-based location tracking with accuracy metrics
- **Shift Management**: Track patrol activities during specific shifts
- **Data Export**: Export patrol logs and session data
- **Mobile-Responsive**: Optimized for mobile devices and tablets

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **Drizzle ORM** with **PostgreSQL**
- **Zod** for schema validation
- **WebSocket** support for real-time features

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Radix UI** components
- **React Query** for server state management
- **Wouter** for routing

### Database
- **PostgreSQL** (via Neon Database)
- **Drizzle ORM** for database operations
- Session-based patrol tracking
- GPS coordinate storage with precision

## Prerequisites

- Node.js 18+
- PostgreSQL database (recommended: [Neon Database](https://neon.tech))
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/GuardTrack.git
   cd GuardTrack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   export DATABASE_URL="your-postgresql-connection-string"
   ```
   
   For Neon Database, the format is:
   ```
   postgresql://username:password@hostname/database_name?sslmode=require
   ```

4. **Set up the database schema**
   ```bash
   npm run db:push
   ```

5. **Initialize default patrol sites (optional)**
   ```bash
   curl -X POST http://localhost:5000/api/init-sites
   ```

## Development

Start the development server:

```bash
npm run dev
```

This will start both the backend API server and frontend development server on port 5000.

## Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## API Endpoints

### Patrol Sites
- `GET /api/patrol-sites` - Get all patrol sites
- `POST /api/patrol-sites` - Create a new patrol site
- `POST /api/init-sites` - Initialize default sites

### Patrol Sessions
- `GET /api/patrol-sessions` - Get patrol sessions with site info
- `POST /api/patrol-action` - Start/end patrol sessions

### Analytics
- `GET /api/recent-visits` - Get recent patrol visits
- `GET /api/patrol-logs` - Get patrol logs (legacy)

### Data Management
- `POST /api/sync-logs` - Sync offline logs

## Database Schema

### Patrol Sites
- Location information with GPS coordinates
- Configurable geofence radius
- Address and name details

### Patrol Sessions
- Entry/exit tracking with timestamps
- GPS coordinates for entry/exit points
- Session duration calculation
- Geofence compliance tracking

### Patrol Logs (Legacy)
- Individual patrol events
- Device tracking
- Sync status for offline support

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for security professionals 