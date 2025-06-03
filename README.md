# Telegram Questionnaire Bot

A comprehensive Telegram bot for creating and managing questionnaires, built with grammY framework and PostgreSQL.

## Features

- ✅ Create questionnaires with multiple question types (text, single choice, multiple choice)
- ✅ Interactive conversation flow for questionnaire creation
- ✅ Send questionnaires to users or groups
- ✅ Answer questionnaires with inline buttons
- ✅ View aggregated results (creator/admin only)
- ✅ Persistent storage with PostgreSQL
- ✅ Full TypeScript support
- ✅ Comprehensive error handling and logging

## Prerequisites

- Node.js v16 or higher
- PostgreSQL database
- Telegram Bot Token (from @BotFather)

## Installation

1. Clone the repository and install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy `.env.example` to `.env` and configure:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Set up the database:
\`\`\`bash
npx prisma generate
npx prisma migrate dev
\`\`\`

## Usage

### Development
\`\`\`bash
npm run dev
\`\`\`

### Production
\`\`\`bash
npm run build
npm start
\`\`\`

### Database Management
\`\`\`bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
\`\`\`

## Bot Commands

- `/start` - Welcome message and command list
- `/new` - Create a new questionnaire
- `/list` - List all active questionnaires
- `/my` - List your created questionnaires
- `/send <id>` - Send a questionnaire to current chat
- `/answer <id>` - Answer a questionnaire
- `/results <id>` - View questionnaire results (creator/admin only)
- `/help` - Show help message

## Architecture

### Database Schema

- **Users**: Telegram users with admin status
- **Questionnaires**: Created questionnaires with metadata
- **Questions**: Questions with different types
- **Options**: Options for choice questions
- **Responses**: User responses to questionnaires
- **Answers**: Individual answers to questions

### Project Structure

\`\`\`
src/
├── config/          # Configuration
├── conversations/   # grammY conversation handlers
├── database/        # Prisma client
├── handlers/        # Command handlers
├── middleware/      # Bot middleware
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utilities
└── index.ts         # Bot entry point
\`\`\`

## Security

- Admin users defined in environment variables
- Creator-only access to questionnaire results
- Session-based conversation state
- Comprehensive error handling

## License

MIT
