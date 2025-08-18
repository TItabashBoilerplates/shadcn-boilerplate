# Application-boilerplate

## Description

This is a boilerplate application for Flutter and Supabase, with a Prisma backend and a Docker setup.

## Development Environment

For this project, we recommend the following development setup:

- Frontend: Utilize Visual Studio Code's workspace feature
- Backend: Use Visual Studio Code's devcontainer functionality

By adopting these environments, we can ensure efficient development and maintain consistency across the team.


## Requirements

Ensure the following are installed:

- [Docker](https://www.docker.com/)
- [asdf](https://asdf-vm.com/)
- [Supabase](https://supabase.com/)
- Make

## Setup

To set up the project environment, follow these steps:

1. **Initialize the Project**:
   Run the following command to initialize the project:

   ```bash
   make init
   ```

   This command will:
   - Check for necessary tools
   - Install asdf
   - Install yarn globally
   - Log in to Supabase and initialize it
   - Start Supabase
   - Set up environment variables
   - Install project dependencies
   - Perform initial database migration
   - Build necessary models

2. **Environment Variable Setup**:
   Open the `env/secrets.env` file and update the necessary environment variables. Ensure the following variables are set correctly:

   ```
   SUPABASE_URL=your_supabase_project_id
   SUPABASE_ANON_KEY=your_supabase_api_key
   // Other necessary environment variables
   ```

   Note: This file contains sensitive information, so do not commit it to your version control system.

3. **Database Setup**:
   The initial migration is performed as part of the `make init` command. If you need to run migrations separately, use:

   ```bash
   make migration
   ```

## Execution

After successfully completing the setup, you can start the application using one of the following commands:

- For local development (starts Supabase and Docker services):
  ```bash
  make local
  ```

- For frontend development (TypeScript):
  ```bash
  make local-frontend-ts
  ```

- For iOS development:
  ```bash
  make local-ios-ts
  ```

- For Android development:
  ```bash
  make local-android-ts
  ```

- For Flutter development:
  ```bash
  make local-frontend-flutter
  ```

To stop the local environment:
```bash
make local-stop
```

## Additional Commands

- To check Docker Compose configuration:
  ```bash
  make check
  ```

- To build Prisma models:
  ```bash
  make build-model-prisma
  ```

- To build Supabase models:
  ```bash
  make build-model-frontend-supabase
  ```

- To build all models:
  ```bash
  make build-model
  ```

# Tips

The following tools are being considered for implementation:

## [Resend](https://resend.com/)

- Email delivery tool

## [Sentry](https://sentry.io/welcome/)

- Application Monitoring software

## [Stripe](https://stripe.com/jp)

- Online payment platform

## [RevenueCat](https://www.revenuecat.com/)

- Application subscription payment platform
