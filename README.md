# paybillswithus.com

i want to make website show all US users pay with us and get every month 25% off, 
we will handle all type of bills, like tab for internet and showing all major carrier that offer internet, 
same tab for home, same for tv, and same tab for electric bills, 

languages vite react with all modern css etc, 
light colors theme and modern touch and easy for user to understand and easy to get users payment info on user portal after auth

i want full detail readme.md then we will starting coding,

for registeration 
ask email, name, password, repassword, last 4 of ssn, dob, address
for password reset email, plus address, last 4 of ssn

also generate unique customer for each customer

we wil do hosting and backend on godaddy vps
with current domain: paybillswithus.com 
i have already vps pruchased form godaddy

make admin panel secure, so public not get it running subdomain or other tools

admin panel
handle agent logins
so agent can put customer number in agent portal to get information and udpate the billers and receipt and also view customer payment information

for users
after auth, can add multiple cards, plus manually checking routing numebr
only billers can add to customers account by agent only via call,
show option to call us get 25% dicount everymonth, give me permission to handle your all type of bills
including tv+internet+home+electric bills+,mobiles

while for visiter show zipcode field for providers saerch
if no zipcode major providers 7-9 privoders for each bill type catergry

also for visiter have option directly or sign up,
if user dont want sign up they can call directly
if user complete auth assign new number for database

******

any question you can before we starting
also make section of coding 
like professional organized coding
dont mix up admin + agent + user portal

proper structure i want
for section structure

jwt for database 
no firebase

ask me anything if you want to put , edit or detete any features

make seciton of codings i will make other codex chatlist for other secitons like admin, agent etc

i hope you understand
also tell me if get any out sourcing or anything


tell me full detailed then i will make changes or approve it then we will coding for each secitons

proper flow diagram proper database handling 
proper erroors any things handling

---

## Front-end prototype

The initial visitor website and user sign-up experience live in the Vite + React + TypeScript app under [`frontend/`](frontend/). Tailwind CSS provides the design system, and React Router powers navigation between the marketing site, the secure enrollment form, the customer login page, and the authenticated dashboard where customers can manage payment methods and review assigned billers and receipts.

## API & database service

A dedicated Express + TypeScript back end lives in [`backend/`](backend/) and exposes JWT-protected REST endpoints for:

* registering and authenticating customers,
* creating, updating, and deleting customer payment methods (with account numbers encrypted at rest), and
* reading linked billers and payment receipts that agents have uploaded.

Prisma models the PostgreSQL schema in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma); run migrations after setting up your VPS database to keep the code and schema in sync.

### Environment variables

Create a `.env` file in each package based on the provided examples:

* Front end (`frontend/.env.local`):
  ```bash
  VITE_API_BASE_URL="http://localhost:4000/api"
  ```

* Back end (`backend/.env`):
  ```bash
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
  JWT_SECRET="replace-with-strong-secret"
  DATA_ENCRYPTION_KEY="base64-encoded-32-byte-key" # 32 bytes
  PORT=4000
  CLIENT_ORIGIN="http://localhost:5173"
  ```

Generate the `DATA_ENCRYPTION_KEY` with `openssl rand -base64 32` so payment account numbers can be encrypted before they are stored in PostgreSQL.

### Running locally

1. Install front-end dependencies with `cd frontend && npm install`.
2. Install API dependencies with `cd backend && npm install`.
3. In one terminal run the API: `npm run dev` inside `backend/`.
4. In another terminal run the front end: `npm run dev` inside `frontend/`.

Run `npm run build` in each package to produce production assets (`backend` uses `npm run build` to transpile TypeScript, and the front end already exposes the same command).

### Updating an existing deployment

When you pull new changes onto the GoDaddy VPS, follow this repeatable sequence to keep the API, database schema, and front end in sync:

1. SSH into the VPS and switch to the project directory (for example, `/var/www/paybillswithus.com`).
2. Pull the latest code from Git (`git pull origin main` or the branch you deploy from).
3. Install/refresh dependencies:
   * `cd backend && npm install`
   * `cd ../frontend && npm install`
4. Apply any pending Prisma migrations so PostgreSQL matches the code:
   * `cd ../backend`
   * `npx prisma migrate deploy`
5. Build the production bundles:
   * `npm run build` inside `backend/`
   * `cd ../frontend && npm run build`
6. Restart the running processes (for example, `pm2 restart paybills-api` and `pm2 restart paybills-frontend`, or restart the systemd services you configured).
7. Confirm everything is healthy by hitting the API health check (`curl http://YOUR_API_HOST:4000/health`) and by loading the front-end site in a browser.

These steps are safe to repeat whenever new commits land, and they ensure validation changes (like the payment method updates in this patch) take effect immediately.

### Database planning

The core relational model, JWT integration guidance, and a step-by-step PostgreSQL installation checklist for the GoDaddy VPS are documented in [`docs/database-architecture.md`](docs/database-architecture.md). Cross-reference that document with the live Prisma schema in `backend/prisma/schema.prisma` for the authoritative column names used by the running API.

The marketing site highlights the 25% savings offer, showcases supported provider categories, and explains the post-sign-up process. The sign-up form collects all required identity, address, and credential details with client-side validation so agents can complete onboarding while customers immediately gain dashboard access to manage their payment methods.
