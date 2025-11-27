# BAC Mail - Email Client

A complete email client and server comparable to Gmail and Outlook.

## Features

- Multi-account support
- Send/receive emails
- Conversation threading
- Labels and folders
- Search and filters
- Attachments
- Rich text composer
- Offline support
- Calendar integration

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register

### Email Accounts
- `GET /api/v1/accounts` - List accounts
- `POST /api/v1/accounts` - Add account
- `PUT /api/v1/accounts/:id` - Update account
- `DELETE /api/v1/accounts/:id` - Delete account

### Emails
- `GET /api/v1/emails` - List emails
- `GET /api/v1/emails/:id` - Get email
- `POST /api/v1/emails` - Send email
- `PUT /api/v1/emails/:id` - Update email
- `DELETE /api/v1/emails/:id` - Delete email
- `POST /api/v1/emails/:id/star` - Star/unstar
- `POST /api/v1/emails/:id/read` - Mark read/unread
- `POST /api/v1/emails/:id/label` - Add label

### Labels
- `GET /api/v1/labels` - List labels
- `POST /api/v1/labels` - Create label
- `PUT /api/v1/labels/:id` - Update label
- `DELETE /api/v1/labels/:id` - Delete label

### Search
- `GET /api/v1/search?q=query` - Search emails

## Running Locally

```bash
cd apps/mail/backend
go run main.go
```

Server runs on port 8086.

## Docker

```bash
docker build -t bac-mail .
docker run -p 8086:8086 bac-mail
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `PORT` - Server port (default: 8086)
