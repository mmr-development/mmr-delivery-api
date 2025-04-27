# Prerequisites
Before running this application, make sure you have the following installed:

* Node.js (v18 or higher recommended)
* PostgreSQL
* Redis
* Docker (optional, for containerized deployment)

## Generating JWT Keys
You need a private and public key pair. You can generate them using OpenSSL:

```sh
# Generate a 2048-bit private key
openssl genrsa -out path/to/private.pem 2048

# Generate the corresponding public key
openssl rsa -pubout -in path/to/private.pem -out path/to/public.pem
```

# Installation
To install all NPM dependencies locally just run:
```
npm install
```

# How to run
Before running the API, make sure you have generated your JWT private and public keys (see [Generating JWT Keys](#generating-jwt-keys) above).

## Running with Docker
TBA

# Scripts
| Script | Description |
|-|-|
| `clean` | Removes the dist directory |
| `build` | Cleans the project and compiles TypeScript code to JavaScript |
| `start:dev` | Starts the application in development mode with auto-restart on file changes (uses environment variables from .env) |
| `migrate:latest` | Runs database migrations to the latest version |
| `migrate:down` | Rolls back the most recent database migration |
| `migrate:create` | Creates a new database migration file |
| `test` | Runs tests using Node's built-in test runner |
