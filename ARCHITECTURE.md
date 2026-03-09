# Dashboard Architecture

## Layers

- `config/`: static configuration and runtime constants.
- `services/`: HTTP and session/auth external interactions.
- `utils/`: pure helpers and DOM utility wrappers.
- `modules/`: feature modules for auth, tabs, calls, dashboard rendering, and pricing CTA.
- Root entrypoints: `index.html`, `reset-password.html`, `app.js`.

## Flow

1. `app.js` initializes `AuthModule`.
2. `AuthModule` chooses login view or dashboard view.
3. `TabsModule` handles navigation and global UI actions (`logout`, `refresh-dashboard`).
4. `PricingModule` renders current plan badge, upgrade banner, and plan cards.
5. `DashboardModule` loads metrics and recordings.
6. `CallsModule` loads call history and transcript modal interactions.

## Conventions

- Use descriptive names for functions and variables.
- Avoid inline HTML handlers (`onclick`, `onsubmit`, etc.).
- Prefer delegated listeners with `data-*` actions.
- Handle API responses defensively (`success` and `status` compatibility).
- Escape dynamic strings or build DOM nodes directly.

## Billing Config

`AppConfig.BILLING` controls:

- Current plan key (`CURRENT_PLAN_KEY`)
- Recommended plan key (`RECOMMENDED_PLAN_KEY`)
- WhatsApp destination (`WHATSAPP_BASE_URL`, `WHATSAPP_NUMBER`)
- Upgrade catalog (`PLANS`)

## Security Defaults

Use `DEV_MODE` bypass flags only for local debugging and keep them disabled in production.
