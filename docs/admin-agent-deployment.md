# Admin and Agent Console Deployment (`/admin` and `/agent`)

This guide shows how to ship the secure admin and agent consoles under the existing production domain (`https://paybillswithus.com/admin` and `https://paybillswithus.com/agent`) without creating extra DNS records.

## 1. Build fresh production bundles

On your server (paths shown assume `/var/www/paybillswithus.com`):

```bash
cd /var/www/paybillswithus.com
npm install --prefix backend
npm install --prefix frontend
npm install --prefix admin
npm install --prefix agent
npm run build --prefix frontend
npm run build --prefix admin
npm run build --prefix agent
```

* `frontend/dist` powers the public customer portal.
* `admin/dist` and `agent/dist` now include the correct base path so they work when hosted beneath `/admin` and `/agent`.
* Both single-page apps fall back to `/api` on the current origin, so you can delete any production `.env` file with `VITE_API_URL`
  once you redeploy these builds.

> The backend is TypeScript-only and does not require a separate build step—just restart the Node process after pulling the latest code.

## 2. Configure backend environment

Update `/var/www/paybillswithus.com/backend/.env` with the production domain so host-based security works with the new paths:

```env
CLIENT_ORIGIN=https://paybillswithus.com
ADMIN_ALLOWED_HOSTS=paybillswithus.com,localhost
AGENT_ALLOWED_HOSTS=paybillswithus.com,localhost
```

Restart the API service (`pm2 restart paybills-api`, `systemctl restart paybills-backend`, etc.). The middleware in `backend/src/middleware/requireApprovedHost.ts` blocks any request that does not present `paybillswithus.com` as the host.

## 3. Serve the bundles through Nginx (single domain)

Proxy everything through the Node backend so it can serve both the REST API and the React bundles. Below is an example `/etc/nginx/sites-available/paybillswithus.com`:

```nginx
server {
    listen 80;
    server_name paybillswithus.com www.paybillswithus.com;

    location /health {
        proxy_pass http://127.0.0.1:4000/health;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin console
    location /admin/ {
        proxy_pass http://127.0.0.1:4000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Agent console
    location /agent/ {
        proxy_pass http://127.0.0.1:4000/agent/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Public SPA (fallback for everything else)
    location / {
        root /var/www/paybillswithus.com/frontend/dist;
        try_files $uri /index.html;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/paybillswithus.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> If you already have an Nginx config for the public site, just add the `/admin/` and `/agent/` blocks that proxy to the backend.

## 4. Verify the static serving

After the backend restarts it automatically serves the React bundles when the folders exist:

* `GET https://paybillswithus.com/admin` → renders `admin/dist/index.html`.
* `GET https://paybillswithus.com/agent` → renders `agent/dist/index.html`.

If you hit a 404, confirm the `dist` folders exist on disk and that the Node process was restarted after building.

## 5. Login workflow

1. Visit `https://paybillswithus.com/admin`.
2. Sign in with the owner credentials:
   * **Username:** `sameer614614`
   * **Password:** `Cake@1245`
3. Use the “Agents” panel to create agent accounts (username + password pairs). You can also edit or delete any existing agent.
4. Agents go to `https://paybillswithus.com/agent` and log in with the credentials you created for them. They can search for customers, manage billers, and maintain payment methods.

## 6. Hardening tips

* Restrict access to `/admin` and `/agent` to known office IP addresses by adding `allow/deny` directives or firewall rules if required.
* Always run the site behind HTTPS. Once Nginx is in place, issue certificates with Let’s Encrypt:
  ```bash
  sudo apt install python3-certbot-nginx
  sudo certbot --nginx -d paybillswithus.com -d www.paybillswithus.com
  ```
* Monitor `/var/log/nginx/access.log` and `backend/logs` for unexpected requests.

With these steps the secure consoles live under the main domain and are protected by host validation and the existing credential workflow—no additional DNS records are necessary.
